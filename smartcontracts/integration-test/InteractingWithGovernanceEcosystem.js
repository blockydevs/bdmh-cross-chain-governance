require("dotenv").config();
const {expect} = require("chai");
const { defaultAbiCoder } = require("@ethersproject/abi");
const { ethers } = require("hardhat");

describe("Interacting with governance ecosystem", function () {
    let deployer, addr1, addr2;
    let vhmToken;
    let hmToken;
    let governanceContract;
    let spokeContract;
    let proposalId;

    const etherValue = etherToWei(1);
    const FOR_VOTE = 1;

    before(async function() {
        hmToken = await ethers.getContractAt("HMToken", "0x209DFa31D9e780964719f4a7d065486Cd6bcf45d");
        console.log(hmToken.target)
        vhmToken = await ethers.getContractAt("VHMToken", "0x9e1f8b97FE64675Eb29394e5e9A2e3aD410908DD");
        console.log(vhmToken.target)
        governanceContract = await ethers.getContractAt("MetaHumanGovernor", "0x3316D1F0AF7AB4064173AE5f83e790A3E5FDdBb1");
        spokeContract = await ethers.getContractAt("DAOSpokeContract", "0xD9d55c32cdE617F245a0eC247FaCa913F011CDC8");//support for 1 spoke
    });

    it("should transfer tokens", async function() {
        const networks = {
            //'Sepolia': process.env.SEPOLIA_RPC_URL,
            // 'Polygon Mumbai': process.env.POLYGON_MUMBAI_RPC_URL,
            // 'Arbitrum': process.env.ARBITRUM_RPC_URL,
            'Avalanche': process.env.SPOKE_RPC_URL,
            //'Moonbase': process.env.MOONBASE_RPC_URL
        };

        const privateKeys = [
            process.env.PRIVATE_KEY,
            process.env.SECOND_PRIVATE_KEY,
            process.env.THIRD_PRIVATE_KEY
        ];

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
