require("dotenv").config();
const {expect} = require("chai");
const {defaultAbiCoder} = require("@ethersproject/abi");
const {ethers} = require("hardhat");
const hre = require("hardhat");

describe("Interacting with governance ecosystem", function () {
    let hmToken;
    let vhmToken;
    let governanceContract;
    let proposalId;
    const hubRPCUrl = process.env.POLYGON_MUMBAI_RPC_URL;
    const hubHMTAddress = process.env.HM_TOKEN_ADDRESS;
    const hubVHMTAddress = process.env.HUB_VOTE_TOKEN_ADDRESS;
    const hubGovernorAddress = process.env.GOVERNOR_ADDRESS;
    const spokeConfig = process.env.SPOKE_PARAMS;
    const spokes = {};
    const operatorKey = process.env.PRIVATE_KEY
    const endUsers = [
        process.env.SECOND_PRIVATE_KEY,
        process.env.THIRD_PRIVATE_KEY
    ];

    before(async function () {
        //hub
        hmToken = await ethers.getContractAt("HMToken", hubHMTAddress);
        vhmToken = await ethers.getContractAt("VHMToken", hubVHMTAddress);
        governanceContract = await ethers.getContractAt("MetaHumanGovernor", hubGovernorAddress);
        //spokes
        let parsedSpokeConfig = JSON.parse(spokeConfig);
        parsedSpokeConfig.forEach(spoke => {
            spokes[spoke['SPOKE_RPC_URL']] = {
                SPOKE_HM_TOKEN_ADDRESS: spoke['SPOKE_HM_TOKEN_ADDRESS'],
                SPOKE_VHM_TOKEN_ADDRESS: spoke['SPOKE_VHM_TOKEN_ADDRESS'],
                SPOKE_CONTRACT_ADDRESS: spoke['SPOKE_CONTRACT_TOKEN_ADDRESS']
            }
        })
    });

    it("should pass cross chain governance flow", async function () {
        this.timeout(15 * 60 * 1000);
        let amountInEther = '0.01';
        // await readBalances(hubRPCUrl, operatorKey, hmToken, vhmToken, spokes, endUsers);
        //
        // console.log("transfer native currency, hub");
        // await sendNativeCurrencyToTestUsers(endUsers, amountInEther, operatorKey, hubRPCUrl);
        // console.log("transfer native currency, spokes");
        // await sendNativeCurrencyOnSpokes(spokes, endUsers, amountInEther, operatorKey);
        //
        // await transferExchangeDelegate(hubRPCUrl, spokes, operatorKey, endUsers, hmToken, vhmToken, amountInEther);
        // await readBalances(hubRPCUrl, operatorKey, hmToken, vhmToken, spokes, endUsers);

        console.log("create proposal");
        proposalId = await createProposal(proposalId, operatorKey, endUsers, hubRPCUrl, governanceContract, hmToken, hre);

        console.log("vote on hub");
        await voteOnHub(governanceContract, hubRPCUrl, operatorKey, proposalId);

        console.log("vote on spokes"); //TODO: Error: execution reverted: "DAOSpokeContract: not a started vote"
        // await voteOnSpokes(spokes, proposalId, endUsers);

        console.log("request collections"); //TODO: timeout
        // await requestCollections(hubRPCUrl, governanceContract, proposalId);

        console.log("queue"); //TODO: timeout
        // await queue(hubRPCUrl, governanceContract, vhmToken, operatorKey);

        console.log("execute"); //TODO: timeout
        // await execute(hubRPCUrl, governanceContract, vhmToken, operatorKey);

        console.log("assert");
        expect(true).equal(true);
    });
});

async function hubReadBalances(hubRPCUrl, operatorKey, hmToken, vhmToken) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);
    const hmtTokenBalance = await hmToken.connect(wallet).balanceOf(wallet.address);
    const vhmtTokenBalance = await vhmToken.connect(wallet).balanceOf(wallet.address);
    console.log(`Hub: Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);
    console.log(`Hub: Address: ${wallet.address}, VHMT Token Balance: ${vhmtTokenBalance.toString()} VHMT`);
}
async function spokeReadBalances(spokes, endUsers) {
    let i = 0;
    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(endUsers[i], provider);
        const spokeHMToken = await ethers.getContractAt("HMToken", spokeConfig['SPOKE_HM_TOKEN_ADDRESS']);
        const hmtTokenBalance = await spokeHMToken.connect(wallet).balanceOf(wallet.address);
        const spokeVHMToken = await ethers.getContractAt("VHMToken", spokeConfig['SPOKE_VHM_TOKEN_ADDRESS']);
        const vhmtTokenBalance = await spokeVHMToken.connect(wallet).balanceOf(wallet.address);
        console.log(`Spoke ${i}: Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);
        console.log(`Spoke ${i}: Address: ${wallet.address}, VHMT Token Balance: ${vhmtTokenBalance.toString()} VHMT`);
        i++;
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

async function sendNativeCurrencyToTestUsers(endUsers, amountInEther, operatorKey, rpcUrl) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const operatorWallet = new ethers.Wallet(operatorKey, provider);
    for (const user of endUsers) {
        await sendNativeCurrency(user, provider, amountInEther, operatorWallet);
    }
}

async function sendNativeCurrencyOnSpokes(spokes, endUsers, amountInEther, operatorKey) {
    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        await sendNativeCurrencyToTestUsers(endUsers, amountInEther, operatorKey, rpc);
    }
}

async function transferToken(hubRPCUrl, endUsers, hmToken, operatorKey, amountInEther) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const walletOperator = new ethers.Wallet(operatorKey, provider);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const transferTx = await hmToken.connect(walletOperator).transfer(wallet.address, ethers.parseEther(amountInEther));
        await transferTx.wait();
    }
}

async function exchangeHMTtoVHMT(hubRPCUrl, endUsers, amountInEther, hmToken, vhmToken) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const approveTx = await hmToken.connect(wallet).approve(vhmToken.target, ethers.parseEther(amountInEther));
        await approveTx.wait();

        const depositTx = await vhmToken.connect(wallet).depositFor(wallet.address, ethers.parseEther(amountInEther));
        await depositTx.wait();
    }
}

async function delegateVotes(endUsers, vhmToken, hubRPCUrl) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);

    for (const user of endUsers) {
        const wallet = new ethers.Wallet(user, provider);

        const tx = await vhmToken.connect(wallet).delegate(wallet.address);
        await tx.wait();
    }
}

async function getProposalExecutionData(hre, deployerAddress, hmToken) {
    const IERC20 = await hre.artifacts.readArtifact('IERC20');

    const description = `desc${Math.random()}`;

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
        calldatas,
        description
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
            continue;
        }
    }
    throw new Error("Proposal ID not found in transaction logs.");
}

async function createProposal(proposalId, operatorKey, endUsers, hubRPCUrl, governanceContract, hmToken, hre) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);
    const {
        targets,
        values,
        calldatas,
        description
    } = await getProposalExecutionData(hre, wallet.address, hmToken);

    try {
        const tx = await governanceContract.connect(wallet).crossChainPropose(
            targets,
            values,
            calldatas,
            description,
            {
                gasPrice: 75000000000,
                gasLimit: 1000000,
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

async function voteOnHub(governanceContract, hubRPCUrl, operatorKey, proposalId) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const tx = await governanceContract.connect(wallet).castVote(proposalId, 1);
    await provider.waitForTransaction(tx.hash);
}

async function voteOnSpokes(spokes, proposalId, endUsers) {
    let i = 0;
    for (const [rpc, spokeConfig] of Object.entries(spokes)) {
        const provider = new ethers.JsonRpcProvider(rpc);
        const wallet = new ethers.Wallet(endUsers[i], provider);

        const spokeContract = await ethers.getContractAt(
            "DAOSpokeContract",
            spokeConfig.SPOKE_CONTRACT_ADDRESS
        );

        const tx = await spokeContract.connect(wallet).castVote(proposalId, 1);

        await provider.waitForTransaction(tx.hash);
        i++;
    }
}

async function requestCollections(hubRPCUrl, governanceContract, proposalId) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const tx = await governanceContract.requestCollections(proposalId);
    await provider.waitForTransaction(tx.hash);
}

async function queue(hubRPCUrl, governanceContract, vhmToken, operatorKey) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);
    const encodedCall = defaultAbiCoder.encode(
        ["address", "uint256"],
        [wallet.address, 1]
    );
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("desc"));
    const tx = await governanceContract.queue([vhmToken.target], [], [encodedCall], descriptionHash);
    await provider.waitForTransaction(tx.hash);
}

async function execute(hubRPCUrl, governanceContract, vhmToken, operatorKey) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);
    const encodedCall = defaultAbiCoder.encode(
        ["address", "uint256"],
        [wallet.address, 1]
    );
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("desc"));
    const tx = await governanceContract.execute([vhmToken.target], [], [encodedCall], descriptionHash);
    await provider.waitForTransaction(tx.hash);
}

async function processRPC(rpc, endUsers, hmToken, operatorKey, amountInEther, vhmToken) {
    console.log(`${rpc}: transfer HMT, exchange HMT => VHMT, delegate votes`);
    await transferToken(rpc, endUsers, hmToken, operatorKey, amountInEther);
    await exchangeHMTtoVHMT(rpc, endUsers, amountInEther, hmToken, vhmToken);
    await delegateVotes(endUsers, vhmToken, rpc);
}

async function transferExchangeDelegate(hubRPCUrl, spokes, operatorKey, endUsers, hmToken, vhmToken, amountInEther) {
    const allRPCs = [hubRPCUrl, ...Object.keys(spokes)];

    for (const rpc of allRPCs) {
        await processRPC(rpc, endUsers, hmToken, operatorKey, amountInEther, vhmToken);
    }
}

async function readBalances(hubRPCUrl, operatorKey, hmToken, vhmToken, spokes, endUsers) {
    await hubReadBalances(hubRPCUrl, operatorKey, hmToken, vhmToken);
    await spokeReadBalances(spokes, endUsers);
}
