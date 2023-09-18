require("dotenv").config();
const {expect} = require("chai");
const {defaultAbiCoder} = require("@ethersproject/abi");
const {ethers} = require("hardhat");
const hre = require("hardhat");

// Constant configurations
const CONSTANTS = {
    testUserCurrentAmount: ethers.parseEther('0.01'),
    crossChainEtherValue: ethers.parseEther('0.05'),
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

        // await sendNativeCurrencyToTestUsers();
        // await sendNativeCurrencyOnSpokes(spokes);
        //
        // await getVotePrivileges(spokes);

        const hmTokenBalanceBefore = await getHubHMTokenBalance();
        proposalId = await createProposal(governanceContract);

        // await voteOnHub(governanceContract, proposalId);
        // await voteOnSpokes(spokes, proposalId);

        await requestCollections(governanceContract, proposalId);
        await queue(governanceContract, proposalId);
        await execute();

        const hmTokenBalanceAfter = await getHubHMTokenBalance();

        // Assertions
        const hubVotes = await getProposalVotes(governanceContract, proposalId);
        const spokesVotes = await aggregateProposalVotesFromSpokes(CONSTANTS.spokeConfig, proposalId);
        expect(hubVotes.againstVotes, 'the number of against votes on hub and spokes are equal.').to.equal(spokesVotes.totalAgainstVotes);
        expect(hubVotes.forVotes, 'the number of for votes on hub and spokes are equal.').to.equal(spokesVotes.totalForVotes);
        expect(hubVotes.abstainVotes, 'the number of abstain votes on hub and spokes are equal.').to.equal(spokesVotes.totalAbstainVotes);

        const proposalState = await getProposalState(governanceContract, proposalId);
        expect(proposalState, 'State of proposal is Executed.').to.equal(7);

        expect(hmTokenBalanceBefore).to.be.greaterThan(hmTokenBalanceAfter, 'hmToken balance before creating Proposal was greater than after.');
    });
});

async function sendNativeCurrency(user, provider, testUserCurrentAmount, wallet) {
    const { gasPrice } = CONSTANTS;

    const userWallet = new ethers.Wallet(user, provider);
    console.log(`Transfering native currency ${testUserCurrentAmount} from ${wallet.address} to ${userWallet.address}.`);

    let tx = {
        to: userWallet,
        value: testUserCurrentAmount,
        gasPrice: gasPrice
    }
    const sendTx = await wallet.sendTransaction(tx);
    await sendTx.wait();
}

async function sendNativeCurrencyToTestUsers() {
    const { endUsers, testUserCurrentAmount, operatorKey, hubRPCUrl } = CONSTANTS;

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const operatorWallet = new ethers.Wallet(operatorKey, provider);
    for (const user of endUsers) {
        await sendNativeCurrency(user, provider, testUserCurrentAmount, operatorWallet);
    }
}

async function sendNativeCurrencyOnSpokes(spokes) {
    const { endUsers, testUserCurrentAmount, operatorKey } = CONSTANTS;

    for (const rpc of Object.keys(spokes)) {
        await sendNativeCurrencyToTestUsers(endUsers, testUserCurrentAmount, operatorKey, rpc);
    }
}

async function transferToken(rpc, endUsers, hmToken, operatorKey, testUserCurrentAmount) {
    const provider = new ethers.JsonRpcProvider(rpc);
    const walletOperator = new ethers.Wallet(operatorKey, provider);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const transferTx = await hmToken.connect(walletOperator).transfer(wallet.address, testUserCurrentAmount);
        await transferTx.wait();
    }
}

async function exchangeHMTtoVHMT(rpc, endUsers, hmToken, vhmToken, testUserCurrentAmount) {
    const provider = new ethers.JsonRpcProvider(rpc);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const approveTx = await hmToken.connect(wallet).approve(vhmToken.target, testUserCurrentAmount);
        await approveTx.wait();

        const depositTx = await vhmToken.connect(wallet).depositFor(wallet.address, testUserCurrentAmount);
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

    const transferFunctionSig = IERC20.abi.find(
        (func) => func.name === 'transfer' && func.type === 'function'
    );

    const encodedCall = defaultAbiCoder.encode(
        transferFunctionSig.inputs.map((x) => x.type),
        [deployerAddress, 1]
    );

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
    const { hubRPCUrl, hubHMTAddress, operatorKey, description, gasPrice, crossChainEtherValue } = CONSTANTS;

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
                value: crossChainEtherValue
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

    console.log(`- proposal ID: ${proposalId}, rpc: ${hubRPCUrl}, user wallet: ${wallet.address}`);
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

                console.log(`- proposal ID: ${proposalId}, rpc: ${rpc}, user wallet: ${wallet.address}`);
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

    await getVotePrivilegesOnChain(hubRPCUrl, operatorKey, endUsers, hmToken, vhmToken, testUserVotingPower);

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const hmToken = await ethers.getContractAt("HMToken", spokeConfig.SPOKE_HM_TOKEN_ADDRESS);
        const vhmToken = await ethers.getContractAt("VHMToken", spokeConfig.SPOKE_VHM_TOKEN_ADDRESS);
        await getVotePrivilegesOnChain(rpc, operatorKey, endUsers, hmToken, vhmToken, testUserVotingPower);
    }
}

async function isProposalOnSpoke(spokeContract, wallet, proposalId, maxRetries = 8, seconds = 15) {
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

async function getProposalVotes(contract, proposalId) {
    const provider = new ethers.JsonRpcProvider(CONSTANTS.hubRPCUrl);
    const wallet = new ethers.Wallet(CONSTANTS.operatorKey, provider);
    const res = await contract.connect(wallet).proposalVotes(proposalId);
    return res;
}

async function aggregateProposalVotesFromSpokes(spokes, proposalId) {
    let totalAgainstVotes = 0;
    let totalForVotes = 0;
    let totalAbstainVotes = 0;

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(CONSTANTS.operatorKey, provider);
        const spokeContract = await ethers.getContractAt(
            "DAOSpokeContract",
            spokeConfig.SPOKE_CONTRACT_ADDRESS
        );
        const { againstVotes, forVotes, abstainVotes } = await getProposalVotes(spokeContract, wallet, proposalId);

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

async function getProposalState(contract, proposalId) {
    const provider = new ethers.JsonRpcProvider(CONSTANTS.hubRPCUrl);
    const wallet = new ethers.Wallet(CONSTANTS.operatorKey, provider);
    const res = await contract.connect(wallet).state(proposalId);
    return res;
}

async function getHubHMTokenBalance() {
    const { hubRPCUrl, operatorKey } = CONSTANTS;
    const hmToken = await ethers.getContractAt("HMToken", CONSTANTS.hubHMTAddress);

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const hmtTokenBalance = await hmToken.connect(wallet).balanceOf(wallet.address);
    return hmtTokenBalance;
}

async function isNewestBlockNumberGreaterThanProposalDeadline(contract, proposalId) {

}

async function isNewestBlockNumberGreaterThanProposalDeadline(contract, proposalId, maxRetries = 16, seconds = 15) {
    const provider = new ethers.JsonRpcProvider(CONSTANTS.hubRPCUrl);
    const wallet = new ethers.Wallet(CONSTANTS.operatorKey, provider);
    for (let i = 0; i < maxRetries; i++) {
        const res = await contract.connect(wallet).proposalDeadline(proposalId);
        const blockNumber = await provider.getBlockNumber();
        if (Number(blockNumber) > Number(res)) {
            return true;
        }
        await sleep(seconds);
    }
    throw new Error(`Proposal deadline has the same block number as the current block, after ${maxRetries} attempts.`);
}

async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
