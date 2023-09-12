require("dotenv").config();
const {expect} = require("chai");
const { defaultAbiCoder } = require("@ethersproject/abi");
const hre = require("hardhat");

const { ethers } = require("hardhat");
const { setTimeout } = require('timers/promises');
async function sendNativeCurrency(user, provider, amountInEther, operatorWallet) {
    let tx = {
        to: new ethers.Wallet(user, provider),
        value: ethers.parseEther(amountInEther)
    }
    await operatorWallet.sendTransaction(tx);
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

async function transferToken(hubRPCUrl, endUser, hmToken, operatorKey, amountInEther) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const walletOperator = new ethers.Wallet(operatorKey, provider);

    for(const user of endUser){
        const wallet = new ethers.Wallet(user, provider);
        await hmToken.connect(walletOperator).transfer(wallet.address, ethers.parseEther(amountInEther));
    }
}

async function exchangeHMTtoVHMT(hubRPCUrl, endUsers, amountInEther, hmToken, vhmToken) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(endUsers[0], provider);

    await hmToken.connect(wallet).approve(vhmToken.target, "1000000000000000000");
    await vhmToken.connect(wallet).depositFor(wallet.address, "1000000000000000000");
}

async function delegateVotes(endUsers, vhmToken, hubRPCUrl) {
    const provider = new ethers.JsonRpcProvider(hubRPCUrl);
    const wallet = new ethers.Wallet(endUsers[0], provider);
    await vhmToken.connect(wallet).delegate(wallet.address);
}

async function getProposalExecutionData(hre, deployerAddress, hmToken) {
    const IERC20 = await hre.artifacts.readArtifact('IERC20');

    const description = ethers.keccak256(ethers.toUtf8Bytes("desc"));

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
        await governanceContract.connect(wallet).crossChainPropose(
            targets,
            values,
            calldatas,
            description
        );
       // const result = await governanceContract.connect(wallet).hashProposal(
       //      targets,
       //      values,
       //      calldatas,
       //      description
       //  );
       //
       //  const decodedResult = defaultAbiCoder.decode(["uint256"], result);
       //  console.log(decodedResult[0]);
    } catch (e) {
        console.error(e);
    }
}

describe("Interacting with governance ecosystem", function () {
    let deployer, addr1, addr2;
    let vhmToken;
    let hmToken;
    let governanceContract;
    let spokeContract;
    let proposalId;
    const hubRPCUrl = process.env.AVALANCHE_RPC_URL;
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

    const etherValue = etherToWei(1);
    const FOR_VOTE = 1;

    before(async function() {
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

    it("should read balances", async function() {
        //hub read balance
        const provider = new ethers.JsonRpcProvider(hubRPCUrl);
        const wallet = new ethers.Wallet(operatorKey, provider);
        const hmtTokenBalance = await hmToken.connect(wallet).balanceOf(wallet.address);
        console.log(`Hub: Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);

        //spokes read balances
        for (const [rpc, spokeConfig] of Object.entries(spokes)) {
            const provider = new ethers.JsonRpcProvider(rpc);
            const wallet = new ethers.Wallet(endUsers[0], provider);
            const spokeHMToken = await ethers.getContractAt("HMToken", spokeConfig['SPOKE_HM_TOKEN_ADDRESS']);
            const hmtTokenBalance = await spokeHMToken.connect(wallet).balanceOf(wallet.address);
            console.log(`Spoke: Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);
        }
    })

    it("should pass cross chain governance flow", async function() {
        this.timeout(5*60*1000);
//transfer native currency
        let amountInEther = '0.01';
//hub
//         await sendNativeCurrencyToTestUsers(endUsers, amountInEther, operatorKey, hubRPCUrl);
//spokes
//         await sendNativeCurrencyOnSpokes(spokes, endUsers, amountInEther, operatorKey);
// transfer HMT
//         await setTimeout(35*1000)
        // await transferToken(hubRPCUrl, endUsers, hmToken, operatorKey, amountInEther);
//exchange HMT => VHMT
//         await exchangeHMTtoVHMT(hubRPCUrl, endUsers, amountInEther, hmToken, vhmToken);
//delegate votes
//         await delegateVotes(endUsers, vhmToken, hubRPCUrl);
//create proposal
        proposalId = await createProposal(proposalId, operatorKey, endUsers, hubRPCUrl, governanceContract, hmToken, hre)
       console.log(proposalId)
        //vote on hub
        //vote on spokes
        //request collections
        //queue
        //execute
        //assert
    })
    return;

    it("should allow voting on the proposal both on Hub and Spoke chains", async () => {
        await governanceContract.castVote(proposalId, FOR_VOTE);
        await spokeContract.castVote(proposalId, FOR_VOTE);

        const hasVoted = await spokeContract.hasVoted(proposalId, addr2.address);

        expect(hasVoted).to.equal(true);
    });

    it("should collect votes using the relayer", async () => {

    });

    it("should execute the proposal", async () => {
        const deployerAddress = await deployer.getAddress();
        const encodedCall = defaultAbiCoder.encode(
            ["address", "uint256"],
            [deployerAddress, 1]
        );
        await governanceContract.queue([vhmtoken.target], [], [encodedCall], "desc");
        let state = await governanceContract.state();

        expect(state).equal("Queued")

        await governanceContract.execute([vhmtoken.target], [], [encodedCall], "desc");
        state = await governanceContract.state();

        expect(state).equal("Executed")
    });

    it("should have the correct vote counts at the end", async () => {
        const votes = await spokeContract.proposalVotes(proposalId);

        expect(votes.forVotes).equal(1);
    });
});

function etherToWei(etherValue) {
    const weiMultiplier = BigInt("1000000000000000000");
    return BigInt(Math.round(parseFloat(etherValue) * parseFloat(weiMultiplier.toString())));
}
