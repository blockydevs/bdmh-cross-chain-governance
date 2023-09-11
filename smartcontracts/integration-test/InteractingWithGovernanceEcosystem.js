require("dotenv").config();
const {expect} = require("chai");
const { defaultAbiCoder } = require("@ethersproject/abi");
const { ethers } = require("hardhat");

async function sendNativeCurrency(user, provider, amountInEther, operatorWallet) {
    let tx = {
        to: new ethers.Wallet(user, provider),
        // Convert currency unit from ether to wei
        value: ethers.parseEther(amountInEther)
    }
    // Send a transaction
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

describe("Interacting with governance ecosystem", function () {
    let deployer, addr1, addr2;
    let vhmToken;
    let hmToken;
    let governanceContract;
    let spokeContract;
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
        console.log(`Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);

        //spokes read balances
        for (const [rpc, spokeConfig] of Object.entries(spokes)) {
            console.log(rpc, spokeConfig)
            const provider = new ethers.JsonRpcProvider(rpc);
            const wallet = new ethers.Wallet(operatorKey, provider);
            const spokeHMToken = await ethers.getContractAt("HMToken", spokeConfig['SPOKE_HM_TOKEN_ADDRESS']);
            const hmtTokenBalance = await spokeHMToken.connect(wallet).balanceOf(wallet.address);
            console.log(`Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);
        }
    })

    it("should pass cross chain governance flow", async function() {
        //transfer native currency
        let amountInEther = '0.01';
        //hub
        await sendNativeCurrencyToTestUsers(endUsers, amountInEther, operatorKey, hubRPCUrl);
        //spokes
        await sendNativeCurrencyOnSpokes(spokes, endUsers, amountInEther, operatorKey);
        //transfer HMT
        //exchange HMT => VHMT
        //delegate votes
        //create proposal
        //vote on hub
        //vote on spokes
        //request collections
        //queue
        //execute
        //assert
    })

    it("should transfer tokens", async function() {
        for (const [networkName, rpcUrl] of Object.entries(networks)) {
            console.log(`Token balances for network: ${networkName}`);
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            for (let i = 0; i < privateKeys.length; i++) {
                const wallet = new ethers.Wallet(privateKeys[i], provider);
                try {
                    // const ethBalance = await provider.getBalance(wallet.address);
                    // console.log(`Address: ${wallet.address}, ETH Balance: ${ethers.formatEther(ethBalance.toString())} ETH`);
                    //
                    // const vhmTokenBalance = await vhmToken.connect(wallet).balanceOf(wallet.address);
                    // console.log(`Address: ${wallet.address}, VHM Token Balance: ${vhmTokenBalance.toString()} VHM`);

                    const hmtTokenBalance = await hmToken.connect(wallet).balanceOf(wallet.address);
                    console.log(`Address: ${wallet.address}, HMT Token Balance: ${hmtTokenBalance.toString()} HMT`);
                } catch (error) {
                    console.error(`Error fetching balances for Address: ${wallet.address} on Network: ${networkName}`);
                    console.error(error.message);
                }
            }
        }


//         const transferAmount = etherValue;
//         await vhmToken.connect(deployer).transfer(addr1.address, transferAmount);
// console.log(vhmToken)
//         console.log("deployer", deployer.address)
//         console.log("addr1", addr1.address)
//         console.log("addr2", addr2.address)
//         const balance = await vhmToken.balanceOf(deployer.address);
// console.log(balance)
//        expect(balance).to.equal(transferAmount);
    });
return
    it("should delegate vote tokens from addr1 to addr2", async function() {
        const transferAmount = etherValue;
        await vhmToken.connect(deployer).transfer(addr1.address, transferAmount);

        const initialBalance = await vhmToken.balanceOf(addr1.address);
        expect(initialBalance).to.equal(transferAmount);

        await vhmToken.connect(addr1).delegate(addr2.address);

        const delegateAddress = await vhmToken.delegates(addr1.address);
        expect(delegateAddress).to.equal(addr2.address);
    });

    it("Create proposal: Should broadcast the message to all the spokes", async function () {
        const deployerAddress = await deployer.getAddress();

        const targets = process.env.SPOKE_ADDRESSES.split(",");

        const values = Array(targets.length).fill(0);
        const encodedCall = defaultAbiCoder.encode(
            ["address", "uint256"],
            [deployerAddress, 50]
        );
        const callDatas = Array(targets.length).fill(encodedCall);

        const desc = "desc";

        try {
            proposalId = await governanceContract.crossChainPropose(
                targets,
                values,
                callDatas,
                desc
            );
        } catch (e) {
            console.error(e);
        }

        expect(proposalId).to.exist;
        expect(proposalId.blockHash).to.exist;
        expect(proposalId.from).equal(deployer.address);
        expect(proposalId.data).is.not.null;
    });

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
