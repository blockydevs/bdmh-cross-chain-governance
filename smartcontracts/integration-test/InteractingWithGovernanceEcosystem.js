require("dotenv").config();
const {expect} = require("chai");
const {defaultAbiCoder} = require("@ethersproject/abi");
const {ethers} = require("hardhat");
const hre = require("hardhat");

// Constant configurations
const CONSTANTS = {
    amountInEther: '0.01',
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

        await sendNativeCurrencyToTestUsers();
        await sendNativeCurrencyOnSpokes(spokes);

        await getVotePrivileges(spokes);
        await readBalances(spokes);

        proposalId = await createProposal();
        await voteOnHub(proposalId);
        await voteOnSpokes(spokes, proposalId);
        await requestCollections(proposalId);
        await queue();
        await execute();

        expect(true).equal(true);
    });
});

async function hubReadBalances() {
    const { hubRPCUrl, operatorKey } = CONSTANTS;
    const hmToken = await ethers.getContractAt("HMToken", CONSTANTS.hubHMTAddress);
    const vhmToken = await ethers.getContractAt("VHMToken", CONSTANTS.hubVHMTAddress);

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const hmtTokenBalance = await hmToken.connect(wallet).balanceOf(wallet.address);
    console.log(`Hub: Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);
    const vhmtTokenBalance = await vhmToken.connect(wallet).balanceOf(wallet.address);
    console.log(`Hub: Address: ${wallet.address}, VHMT Token Balance: ${vhmtTokenBalance.toString()} VHMT`);
}

async function spokeReadBalances(spokes) {
    const { endUsers } = CONSTANTS;

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const provider = new ethers.JsonRpcProvider(rpc);

        for (const user of endUsers) {
            const wallet = new ethers.Wallet(user, provider);

            const spokeHMToken = await ethers.getContractAt("HMToken", spokeConfig['SPOKE_HM_TOKEN_ADDRESS']);
            const hmtTokenBalance = await spokeHMToken.connect(wallet).balanceOf(wallet.address);
            console.log(`RPC: ${rpc}, Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);

            const spokeVHMToken = await ethers.getContractAt("VHMToken", spokeConfig['SPOKE_VHM_TOKEN_ADDRESS']);
            const vhmtTokenBalance = await spokeVHMToken.connect(wallet).balanceOf(wallet.address);
            console.log(`RPC: ${rpc}, Address: ${wallet.address}, VHMT Token Balance: ${vhmtTokenBalance.toString()} VHMT`);
        }
    }
}


async function sendNativeCurrency(user, provider, amountInEther, wallet) {
    let tx = {
        to: new ethers.Wallet(user, provider),
        value: ethers.parseEther(amountInEther),
        gasPrice: 75000000000
    }
    const sendTx = await wallet.sendTransaction(tx);
    await sendTx.wait();
}

async function sendNativeCurrencyToTestUsers() {
    console.log("transfer native currency, hub");
    const { endUsers, amountInEther, operatorKey, hubRPCUrl } = CONSTANTS;

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const operatorWallet = new ethers.Wallet(operatorKey, provider);
    for (const user of endUsers) {
        await sendNativeCurrency(user, provider, amountInEther, operatorWallet);
    }
}

async function sendNativeCurrencyOnSpokes(spokes) {
    console.log("transfer native currency, spokes");
    const { endUsers, amountInEther, operatorKey } = CONSTANTS;

    for (const rpc of Object.keys(spokes)) {
        await sendNativeCurrencyToTestUsers(endUsers, amountInEther, operatorKey, rpc);
    }
}

async function transferToken(rpc, endUsers, hmToken, operatorKey, amountInEther) {
    const provider = new ethers.JsonRpcProvider(rpc);
    const walletOperator = new ethers.Wallet(operatorKey, provider);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const transferTx = await hmToken.connect(walletOperator).transfer(wallet.address, ethers.parseEther(amountInEther));
        await transferTx.wait();
    }
}

async function exchangeHMTtoVHMT(rpc, endUsers, hmToken, vhmToken, amountInEther) {
    const provider = new ethers.JsonRpcProvider(rpc);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const approveTx = await hmToken.connect(wallet).approve(vhmToken.target, ethers.parseEther(amountInEther));
        await approveTx.wait();

        const depositTx = await vhmToken.connect(wallet).depositFor(wallet.address, ethers.parseEther(amountInEther));
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
        try {
            const parsedLog = governanceContract.interface.parseLog(log);
            if (parsedLog.name === "ProposalCreated") {
                return parsedLog.args.proposalId;
            }
        } catch (error) {
            throw new Error("Proposal ID not found in transaction logs.");
        }
    }
}

async function createProposal() {
    console.log("create proposal");
    const {  hubRPCUrl, hubHMTAddress, governanceContract, operatorKey, description } = CONSTANTS;

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
                gasPrice: 75000000000,
                value: ethers.parseEther('0.05')
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

async function voteOnHub(proposalId) {
    console.log("vote on hub");
    const {  hubRPCUrl, governanceContract, operatorKey } = CONSTANTS;

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const tx = await governanceContract.connect(wallet).castVote(proposalId, 1);
    await provider.waitForTransaction(tx.hash);
}

async function voteOnSpokes(spokes, proposalId) {
    console.log("vote on spokes");
    const { endUsers } = CONSTANTS;

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const provider = new ethers.JsonRpcProvider(rpc);

        for (const user of endUsers) {
            const wallet = new ethers.Wallet(user, provider);

            const spokeContract = await ethers.getContractAt(
                "DAOSpokeContract",
                spokeConfig.SPOKE_CONTRACT_ADDRESS
            );

            if (await isProposalOnSpoke(spokeContract, provider, wallet, proposalId)) {
                const tx = await spokeContract.connect(wallet).castVote(proposalId, 1);
                await tx.wait();
            }
        }
    }
}

async function requestCollections(proposalId) {
    console.log("request collections");
    const {  hubRPCUrl, governanceContract, operatorKey } = CONSTANTS;

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const tx = await governanceContract.connect(wallet).requestCollections(
        proposalId,
        {
            gasPrice: 75000000000,
        }
    );
    await provider.waitForTransaction(tx.hash);
}

async function queue() {
    console.log("queue");
    const { hubRPCUrl, hubHMTAddress, governanceContract, operatorKey, description } = CONSTANTS;

    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const { targets, values, calldatas } = await getProposalExecutionData(hre, wallet.address, hmToken);

    const tx = await governanceContract.connect(wallet).queue(
        targets,
        values,
        calldatas,
        descriptionHash,
        {
            gasPrice: 75000000000
        }
    );
    await provider.waitForTransaction(tx.hash);
}

async function execute() {
    console.log("execute");
    const { hubRPCUrl, hubHMTAddress, governanceContract, operatorKey, description } = CONSTANTS;

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
        {
            gasPrice: 75000000000
        }
    );
    await provider.waitForTransaction(tx.hash);
}

async function processRPC(rpc, operatorKey, endUsers, hmToken, vhmToken, amountInEther) {
    console.log(`${rpc}: transfer HMT, exchange HMT => VHMT, delegate votes`);

    await transferToken(rpc, endUsers, hmToken, operatorKey, amountInEther);
    await exchangeHMTtoVHMT(rpc, endUsers, hmToken, vhmToken, amountInEther);
    await delegateVotes(rpc, endUsers, vhmToken);
}

async function getVotePrivileges(spokes) {
    const { hubRPCUrl, operatorKey, endUsers, hubHMTAddress, hubVHMTAddress, amountInEther } = CONSTANTS;

    const hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
    const vhmToken = await ethers.getContractAt("VHMToken", hubVHMTAddress);

    await processRPC(hubRPCUrl, operatorKey, endUsers, hmToken, vhmToken, amountInEther);

    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const hmToken = await ethers.getContractAt("HMToken", spokeConfig.SPOKE_HM_TOKEN_ADDRESS);
        const vhmToken = await ethers.getContractAt("VHMToken", spokeConfig.SPOKE_VHM_TOKEN_ADDRESS);
        await processRPC(rpc, operatorKey, endUsers, hmToken, vhmToken, amountInEther);
    }
}

async function readBalances(spokes) {
    await hubReadBalances();
    await spokeReadBalances(spokes);
}

async function isProposalOnSpoke(spokeContract, provider, wallet, proposalId, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const res = await spokeContract.connect(wallet).isProposal(proposalId);
        if (res) {
            return res;
        }
        setTimeout(1 * 60 * 1000);
    }
    throw new Error(`Proposal ${proposalId} was not found on spoke after ${maxRetries} attempts.`);
}
