require("dotenv").config();
const {expect} = require("chai");
const { defaultAbiCoder } = require("@ethersproject/abi");
describe("Interacting with governance ecosystem", function () {
    let deployer, addr1, addr2;
    let vhmToken;
    let governanceContract;
    let spokeContract;
    let proposalId;

    const etherValue = "100";
    const FOR_VOTE = 1;

    before(async function() {
        [deployer, addr1, addr2] = await ethers.getSigners();
        vhmToken = await ethers.getContractAt("VHMToken", process.env.VOTE_TOKEN_ADDRESS);
        governanceContract = await ethers.getContractAt("MetaHumanGovernor", process.env.GOVERNOR_ADDRESS);
        spokeContract = await ethers.getContractAt("DAOSpokeContract", process.env.SPOKE_ADDRESSES);//support for 1 spoke
    });

    it("should transfer tokens", async function() {
        const transferAmount = ethers.utils.parseEther(etherValue);
        await vhmToken.connect(deployer).transfer(addr1.address, transferAmount);

        const balance = await vhmToken.balanceOf(addr1.address);
        expect(balance).to.equal(transferAmount);
    });

    it("should delegate vote tokens from addr1 to addr2", async function() {
        const transferAmount = ethers.utils.parseEther(etherValue);
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