require("dotenv").config();
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {expect} = require("chai");
const { defaultAbiCoder } = require("@ethersproject/abi");
describe("Interacting with governance ecosystem", function () {
    let deployer, addr1, addr2;
    let hmtoken;
    let vhmtoken;
    let governanceContract;
    let spokeContract;
    let proposalId;

    async function deployHMTokenFixture() {
        const HMToken = await ethers.getContractFactory("HMToken");
        hmtoken = await HMToken.deploy(
            100, "HMToken", 18, "HMT"
        );
        await hmtoken.waitForDeployment();
    }
    async function deployVHMTokenFixture() {
        const VHMToken = await ethers.getContractFactory("VHMToken");
        vhmtoken = await VHMToken.deploy(hmtoken);
        await vhmtoken.waitForDeployment();
    }

    async function deployMetaHumanGovernorFixture() {
        const deployerAddress = await deployer.getAddress();

        const GovernanceContract = await ethers.getContractFactory("MetaHumanGovernor");
        governanceContract = await GovernanceContract.deploy(
            process.env.HUB_VOTE_TOKEN_ADDRESS,
            process.env.TIMELOCK_ADDRESS,
            [], //spokeContracts
            parseInt(process.env.HUB_CHAIN_ID),
            process.env.HUB_CORE_BRIDGE_ADDRESS,
            deployerAddress
        );
        await governanceContract.waitForDeployment();
    }

    async function deploySpokeContractFixture() {
        const SpokeContract = await ethers.getContractFactory("DAOSpokeContract");
        spokeContract = await SpokeContract.deploy(
            governanceContract,
            parseInt(process.env.HUB_CHAIN_ID),
            process.env.HUB_VOTE_TOKEN_ADDRESS,
            12,
            0,//_chainId The chain ID of the current contract.
            process.env.HUB_CORE_BRIDGE_ADDRESS
        );
        await spokeContract.waitForDeployment();
    }

    before(async function() {
        [deployer, addr1, addr2] = await ethers.getSigners();
        await loadFixture(deployHMTokenFixture);
        await loadFixture(deployVHMTokenFixture);
        await loadFixture(deployMetaHumanGovernorFixture);
        //await loadFixture(deploySpokeContractFixture);
    })

    it("Should deploy fixture parts exists", async function () {
        expect(hmtoken).to.exist;
        expect(vhmtoken).to.exist;
        // expect(governanceContract).to.exist;
        // expect(spokeContract).to.exist;
    });

    it("Create proposal: Should create proposal on the hub", async function () {

        //expect(description).to.equal("DESCRIPTION");
    });

    it("Create proposal: Should broadcast the message to all the spokes", async function () {
        // const deployerAddress = await deployer.getAddress();
        // const targets = [process.env.HM_TOKEN_ADDRESS];
        // const values = [0];
        // const encodedCall = defaultAbiCoder.encode(
        //     ["address", "uint256"],
        //     [deployerAddress, 50]
        // );
        // const callDatas = [encodedCall];
        // const desc = "DESCRIPTION";
        // try {
        //     proposalId = await governanceContract.crossChainPropose(
        //         targets,
        //         values,
        //         callDatas,
        //         desc
        //     );
        // }
        // catch (e) {
        //     console.error(e)
        // }
        // expect(proposalId).to.exist;
    });

    return;
    it("Vote on proposal: Should vote on the Hub", async function () {
        // const result = await governanceContract.castVote(proposalId, 1);
    });

    it("Vote on proposal: Should vote on each Spoke", async function () {

    });

    it("Request Collections: Should trigger the collection phase after voting period ends", async function () {
        const result = await governanceContract.requestCollections(proposalId);
    });

    it("Request Collections: Should check if the messages are relayed as expected - Hub->Spokes, Spoke->Hub", async function () {

    });

    it("Successful Proposal Queue and Execution", async function () {
        // const deployerAddress = await deployer.getAddress();
        // const encodedCall = defaultAbiCoder.encode(
        //     ["address", "uint256"],
        //     [deployerAddress, 1]
        // );
        // const queueResult = await governanceContract.queue([process.env.HM_TOKEN_ADDRESS], [], [encodedCall], "desc");
        // const executeResult = await governanceContract.execute([process.env.HM_TOKEN_ADDRESS], [], [encodedCall], "desc");
    });
});