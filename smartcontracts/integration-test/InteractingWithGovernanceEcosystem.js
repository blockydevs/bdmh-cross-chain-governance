require("dotenv").config();
const {expect} = require("chai");
const {ethers} = require("hardhat");
const hre = require("hardhat");

// Constant configurations
const CONSTANTS = {
    testUserCurrencyAmount: ethers.parseEther('0.01'),
    crossChainProposeEtherValue: ethers.parseEther('0.05'),
    testUserVotingPower: ethers.parseEther('100'),
    gasPrice: 75000000000,
    description: `desc-${Math.random()}`,
    hubRPCUrl: process.env.POLYGON_MUMBAI_RPC_URL,
    hubHMTAddress: process.env.HM_TOKEN_ADDRESS,
    hubVHMTAddress: process.env.HUB_VOTE_TOKEN_ADDRESS,
    hubGovernorAddress: process.env.GOVERNOR_ADDRESS,
    spokeConfig: process.env.SPOKE_PARAMS,
    operatorKey: process.env.PRIVATE_KEY,
    endUsers: [process.env.SECOND_PRIVATE_KEY, process.env.THIRD_PRIVATE_KEY]
};

// Utils
const getParsedSpokeConfig = (spokeConfig) => {
    const parsed = JSON.parse(spokeConfig);
    const spokes = {};
    parsed.forEach(spoke => {
        spokes[spoke['SPOKE_RPC_URL']] = {
            SPOKE_HM_TOKEN_ADDRESS: spoke['SPOKE_HM_TOKEN_ADDRESS'],
            SPOKE_VHM_TOKEN_ADDRESS: spoke['SPOKE_VHM_TOKEN_ADDRESS'],
            SPOKE_CONTRACT_ADDRESS: spoke['SPOKE_CONTRACT_TOKEN_ADDRESS']
        }
    });
    return spokes;
}

// Main test suite
describe("Interacting with governance ecosystem", function () {
    let governanceContract, proposalId;
    const spokes = getParsedSpokeConfig(CONSTANTS.spokeConfig);

    before(async function () {
        governanceContract = await ethers.getContractAt("MetaHumanGovernor", CONSTANTS.hubGovernorAddress);
    });

    it("should pass cross chain governance flow", async function () {
        this.timeout(15 * 60 * 1000);

        await sendNativeCurrencyOnHub()
        await sendNativeCurrencyOnSpokes(spokes);

        await getVotePrivileges(spokes);

        const hmTokenBalanceBefore = await getHubHMTokenBalance();
        proposalId = await createProposal(governanceContract);

        // await voteOnHub(governanceContract, proposalId);
        await voteOnSpokes(spokes, proposalId);
        await requestCollections(governanceContract, proposalId);
        await queue(governanceContract, proposalId);

        await transferToTimelock(governanceContract);
        await execute(governanceContract);

        const hmTokenBalanceAfter = await getHubHMTokenBalance();

        // Assertions
        const hubVotes = await getProposalVotes(governanceContract, CONSTANTS.hubRPCUrl, CONSTANTS.operatorKey, proposalId);
        const spokesVotes = await aggregateProposalVotesFromSpokes(spokes, proposalId);
        expect(hubVotes.againstVotes, 'the number of against votes on hub and spokes are equal.').to.equal(spokesVotes.totalAgainstVotes);
        expect(hubVotes.forVotes, 'the number of for votes on hub and spokes are equal.').to.equal(spokesVotes.totalForVotes);
        expect(hubVotes.abstainVotes, 'the number of abstain votes on hub and spokes are equal.').to.equal(spokesVotes.totalAbstainVotes);
        const proposalState = await getProposalState(governanceContract, proposalId);
        expect(proposalState, 'State of proposal is Executed.').to.equal(7);

        expect(hmTokenBalanceAfter).to.be.greaterThan(hmTokenBalanceBefore, 'hmToken balance before creating Proposal was greater than after.');
    });
});

async function sendNativeCurrency(recipientWallet, senderWallet, rpc) {
    const { gasPrice, testUserCurrencyAmount } = CONSTANTS;

    console.log(`Transferring native currency ${testUserCurrencyAmount} from ${senderWallet.address} to ${recipientWallet.address} on ${rpc}.`);

    let tx = {
        to: recipientWallet,
        value: testUserCurrencyAmount,
        gasPrice: gasPrice
    }
    const sendTx = await senderWallet.sendTransaction(tx);
    await sendTx.wait();
}

async function sendNativeCurrencyToTestUsers(rpc, senderAddress) {
    const { endUsers } = CONSTANTS;

    const provider = new ethers.JsonRpcProvider(rpc);
    const senderWallet = new ethers.Wallet(senderAddress, provider);

    for (const user of endUsers) {
        const recipientWallet = new ethers.Wallet(user, provider);
        await sendNativeCurrency(recipientWallet, senderWallet, rpc);
    }
}

async function sendNativeCurrencyOnHub() {
    const { operatorKey, hubRPCUrl } = CONSTANTS;

    await sendNativeCurrencyToTestUsers(hubRPCUrl, operatorKey);
}

async function sendNativeCurrencyOnSpokes(spokes) {
    const { operatorKey } = CONSTANTS;

    for (const rpc of Object.keys(spokes)) {
        await sendNativeCurrencyToTestUsers(rpc, operatorKey);
    }
}

async function transferToken(rpc, endUsers, hmToken, operatorKey, testUserCurrencyAmount) {
    const provider = new ethers.JsonRpcProvider(rpc);
    const walletOperator = new ethers.Wallet(operatorKey, provider);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const transferTx = await hmToken.connect(walletOperator).transfer(wallet.address, testUserCurrencyAmount);
        await transferTx.wait();
    }
}

async function exchangeHMTtoVHMT(rpc, endUsers, hmToken, vhmToken, testUserCurrencyAmount) {
    const provider = new ethers.JsonRpcProvider(rpc);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const approveTx = await hmToken.connect(wallet).approve(vhmToken.target, testUserCurrencyAmount);
        await approveTx.wait();

        const depositTx = await vhmToken.connect(wallet).depositFor(wallet.address, testUserCurrencyAmount);
        await depositTx.wait();
    }
}

async function delegateVotes(rpc, endUsers, vhmToken) {
    const provider = new ethers.JsonRpcProvider(rpc);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const tx = await vhmToken.connect(wallet).delegate(wallet.address);
        await tx.wait();
    }
}

async function getProposalExecutionData(hre, deployerAddress, hmToken) {
    const IERC20 = await hre.artifacts.readArtifact('IERC20');
    const IERC20Abi = IERC20.abi;

    let iface = new ethers.Interface(IERC20Abi);
    const encodedCall = iface.encodeFunctionData('transfer', [deployerAddress, 1]);

    const targets = [hmToken.target];
    const values = [0];
    const calldatas = [encodedCall];

    return {
        targets,
        values,
        calldatas
    };
}

async function getProposalIdFromReceipt(receipt, governanceContract) {
    for (const log of receipt.logs) {
        const parsedLog = governanceContract.interface.parseLog(log);
        if (parsedLog?.name === "ProposalCreated") {
            return parsedLog.args.proposalId;
        }
    }
}

async function createProposal(governanceContract) {
    console.log(`Creating proposal..`);
    const { hubRPCUrl, hubHMTAddress, operatorKey, description, gasPrice, crossChainProposeEtherValue } = CONSTANTS;

    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);
    const {
        targets,
        values,
        calldatas
    } = await getProposalExecutionData(hre, wallet.address, hmToken);

    try {
        const tx = await governanceContract.connect(wallet).crossChainPropose(
            targets,
            values,
            calldatas,
            description,
            {
                gasPrice: gasPrice,
                value: crossChainProposeEtherValue
            }
        );

        const receipt = await tx.wait();

        const proposalId = await getProposalIdFromReceipt(receipt, governanceContract);

        console.log("Proposal ID:", proposalId);
        return proposalId;
    } catch (e) {
        console.error(e);
    }
}

async function voteOnHub(governanceContract, proposalId) {
    console.log("Casting a vote on hub.");
    const { hubRPCUrl, operatorKey } = CONSTANTS;

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const tx = await governanceContract.connect(wallet).castVote(proposalId, 1);

    console.log(`- wallet ${wallet.address} has just cast a vote on rpc: ${hubRPCUrl}.`);
    await tx.wait();
}

async function voteOnSpokes(spokes, proposalId) {
    console.log("Casting a vote on spokes.");
    const { endUsers } = CONSTANTS;

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const provider = new ethers.JsonRpcProvider(rpc);

        for (const user of endUsers) {
            const wallet = new ethers.Wallet(user, provider);

            const spokeContract = await ethers.getContractAt(
                "DAOSpokeContract",
                spokeConfig.SPOKE_CONTRACT_ADDRESS
            );

            if (await isProposalOnSpoke(spokeContract, wallet, proposalId)) {
                const tx = await spokeContract.connect(wallet).castVote(proposalId, 1);

                console.log(`- wallet ${wallet.address} has just cast a vote on rpc: ${rpc}.`);
                await tx.wait();
            }
        }
    }
}

async function requestCollections(governanceContract, proposalId) {
    console.log("Requesting collections.");
    const { hubRPCUrl, operatorKey, gasPrice } = CONSTANTS;

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    if (await isNewestBlockNumberGreaterThanProposalDeadline(governanceContract, proposalId)){
        const tx = await governanceContract.connect(wallet).requestCollections(proposalId, { gasPrice: gasPrice });
        await tx.wait();
    }
}

async function queue(governanceContract, proposalId) {
    console.log("Queuing the proposal for execution.");
    const { hubRPCUrl, hubHMTAddress, operatorKey, description, gasPrice } = CONSTANTS;

    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const { targets, values, calldatas } = await getProposalExecutionData(hre, wallet.address, hmToken);

    if (await isCollectionFinished(governanceContract, wallet, proposalId)){
        const tx = await governanceContract.connect(wallet).queue(
            targets,
            values,
            calldatas,
            descriptionHash,
            { gasPrice: gasPrice }
        );
        await tx.wait();
    }
}

async function execute(governanceContract) {
    console.log("Executing the proposal.");
    const { hubRPCUrl, hubHMTAddress, operatorKey, description, gasPrice } = CONSTANTS;

    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const { targets, values, calldatas } = await getProposalExecutionData(hre, wallet.address, hmToken);

    const tx = await governanceContract.connect(wallet).execute(
        targets,
        values,
        calldatas,
        descriptionHash,
        { gasPrice: gasPrice }
    );
    await tx.wait();
}

async function getVotePrivilegesOnChain(rpc, operatorKey, endUsers, hmToken, vhmToken, testUserVotingPower) {
    console.log(`Getting vote privileges (transfer HMT, exchange HMT to VHMT, delegate votes), rpc: ${rpc}.`);

    await transferToken(rpc, endUsers, hmToken, operatorKey, testUserVotingPower);
    await exchangeHMTtoVHMT(rpc, endUsers, hmToken, vhmToken, testUserVotingPower);
    await delegateVotes(rpc, endUsers, vhmToken);
}

async function getVotePrivileges(spokes) {
    const { hubRPCUrl, operatorKey, endUsers, hubHMTAddress, hubVHMTAddress, testUserVotingPower } = CONSTANTS;

    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
    const vhmToken = await ethers.getContractAt("VHMToken", hubVHMTAddress);

    // await getVotePrivilegesOnChain(hubRPCUrl, operatorKey, endUsers, hmToken, vhmToken, testUserVotingPower);

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const hmToken = await ethers.getContractAt("HMToken", spokeConfig.SPOKE_HM_TOKEN_ADDRESS);
        const vhmToken = await ethers.getContractAt("VHMToken", spokeConfig.SPOKE_VHM_TOKEN_ADDRESS);
        await getVotePrivilegesOnChain(rpc, operatorKey, endUsers, hmToken, vhmToken, testUserVotingPower);
    }
}

async function isProposalOnSpoke(spokeContract, wallet, proposalId, maxRetries = 16, seconds = 15) {
    console.log(`Checking is proposal on spoke ${spokeContract.target}.`);
    for (let i = 0; i < maxRetries; i++) {
        const res = await spokeContract.connect(wallet).isProposal(proposalId);
        if (res) {
            return res;
        }
        await sleep(seconds);
    }
    throw new Error(`Proposal ${proposalId} was not found on spoke after ${maxRetries} attempts.`);
}

async function isCollectionFinished(contract, wallet, proposalId, maxRetries = 16, seconds = 15) {
    for (let i = 0; i < maxRetries; i++) {
        const res = await contract.connect(wallet).collectionFinished(proposalId);
        if (res) {
            return res;
        }
        await sleep(seconds);
    }
    throw new Error(`Collection was not finished after ${maxRetries} attempts.`);
}

async function getProposalVotes(contract, rpc, walletAddress, proposalId) {
    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(walletAddress, provider);

    const res = await contract.connect(wallet).proposalVotes(proposalId);

    return res;
}

async function getProposalState(contract, proposalId) {
    const { hubRPCUrl, operatorKey } = CONSTANTS;
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const res = await contract.connect(wallet).state(proposalId);

    return res;
}

async function getHubHMTokenBalance() {
    const { hubRPCUrl, operatorKey, hubHMTAddress } = CONSTANTS;
    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const hmtTokenBalance = await hmToken.connect(wallet).balanceOf(wallet.address);

    return hmtTokenBalance;
}

async function isNewestBlockNumberGreaterThanProposalDeadline(contract, proposalId, maxRetries = 24, seconds = 15) {
    const { operatorKey, hubRPCUrl } = CONSTANTS;
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);
    for (let i = 0; i < maxRetries; i++) {
        const res = await contract.connect(wallet).proposalDeadline(proposalId);
        const blockNumber = await provider.getBlockNumber();
        if (Number(blockNumber) > Number(res)) {
            return true;
        }
        await sleep(seconds);
    }
    throw new Error(`Proposal is still in the voting phase after ${maxRetries} attempts.`);
}

async function transferToTimelock(contract) {
    const { hubRPCUrl, operatorKey, hubHMTAddress } = CONSTANTS;
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const timelockAddress = await contract.connect(wallet).timelock();

    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
    const transferTx = await hmToken.connect(wallet).transfer(timelockAddress, 1);
    await transferTx.wait();
}

async function aggregateProposalVotesFromSpokes(spokes, proposalId) {
    let totalAgainstVotes = BigInt(0);
    let totalForVotes = BigInt(0);
    let totalAbstainVotes = BigInt(0);

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const spokeContract = await ethers.getContractAt(
            "DAOSpokeContract",
            spokeConfig.SPOKE_CONTRACT_ADDRESS
        );

        const { againstVotes, forVotes, abstainVotes } = await getProposalVotes(spokeContract, rpc, CONSTANTS.operatorKey, proposalId);

        totalAgainstVotes += againstVotes;
        totalForVotes += forVotes;
        totalAbstainVotes += abstainVotes;
    }

    return {
        totalAgainstVotes,
        totalForVotes,
        totalAbstainVotes
    };
}

async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
