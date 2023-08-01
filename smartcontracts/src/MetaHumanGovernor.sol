// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "./CrossChainGovernorCountingSimple.sol";
import "./DAOSpokeContract.sol";
import "./wormhole/IWormhole.sol";
import "./magistrate/Magistrate.sol";

/**
  @title MetaHumanGovernor
  @dev MetaHumanGovernor is a contract that serves as a governance system for MetaHuman-related operations. It extends multiple contracts to incorporate various functionalities.

  This is the hub contract in the MetaHuman governance smart contracts infrastructure.
  It's based on OpenZeppelin's {Governor} implementation along with basic extensions.
  For more details check out [OpenZeppelin's documentation](https://docs.openzeppelin.com/contracts/4.x/api/governance#governor).
*/
contract MetaHumanGovernor is Governor, GovernorSettings, CrossChainGovernorCountingSimple,
    GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl, Magistrate {

    //https://book.wormhole.com/wormhole/3_coreLayerContracts.html#consistency-levels
    //TODO:prod please change the consistency level to value of choice. Right now it's set up to `1` which is `finalized` value
    uint8 public consistencyLevel = 1;
    IWormhole immutable public coreBridge;
    uint16 public nonce = 0;
    uint16 immutable public chainId;

    mapping(bytes32 => bool) public processedMessages;
    mapping(uint256 => bool) public collectionStarted;
    mapping(uint256 => bool) public collectionFinished;

    /**
     @dev Contract constructor.
     @param _token The address of the token contract used for voting.
     @param _timelock The address of the timelock contract used for delayed execution.
     @param _spokeContracts An array of CrossChainAddress structs representing the spoke contracts.
     @param _chainId The chain ID of the current contract.
     @param _wormholeCoreBridgeAddress The address of the core bridge contract used for cross-chain communication.
    */
    constructor(IVotes _token, TimelockController _timelock, CrossChainAddress[] memory _spokeContracts, uint16 _chainId, address _wormholeCoreBridgeAddress, address _magistrateAddress)
    Governor("MetaHumanGovernor")
    GovernorSettings(1 /* 1 block */, 5 /* 1 minute */, 0) //TODO:prod in production voting delay, voting period, proposal threshold needs to be changed to value of choice
    GovernorVotes(_token)
    GovernorVotesQuorumFraction(4)//TODO:prod change quorum fraction to value of choice
    GovernorTimelockControl(_timelock)
    CrossChainGovernorCountingSimple(_spokeContracts)
    Magistrate(_magistrateAddress)
    {
        chainId = _chainId;
        coreBridge = IWormhole(_wormholeCoreBridgeAddress);
    }

    /**
      @dev Receives a message from the relayer.
      @param VAA The Verified Action Approval (VAA) message. [Read more](https://book.wormhole.com/wormhole/4_vaa.html)
    */
    function receiveMessage(bytes memory VAA) public {
        (IWormhole.VM memory vm, bool valid, string memory reason) = coreBridge.parseAndVerifyVM(VAA);
        require(valid, reason);

        require(spokeContractsMapping[vm.emitterAddress][vm.emitterChainId],
            "Only messages from the spoke contracts can be received!");

        require(!processedMessages[vm.hash], "Message already processed");

        (
        address intendedRecipient,
        ,//chainId
        ,//sender
        bytes memory decodedMessage
        ) = abi.decode(vm.payload, (address, uint16, address, bytes));

        require(intendedRecipient == address(this));

        processedMessages[vm.hash] = true;
        // Gets a function selector option
        uint16 option;
        assembly {
            option := mload(add(decodedMessage, 32))
        }

        if (option == 0) {
            onReceiveSpokeVotingData(vm.emitterChainId, vm.emitterAddress, decodedMessage);
        }
    }

    /**
     * @dev Processes the received voting data from the spoke contracts.
     * @param emitterChainId The chain ID of the emitter contract.
     * @param emitterAddress The address of the emitter contract.
     * @param payload The message payload.
     */
    function onReceiveSpokeVotingData(uint16 emitterChainId, bytes32 emitterAddress, bytes memory payload) internal virtual {
        (
        , // uint16 option
        uint256 _proposalId,
        uint256 _for,
        uint256 _against,
        uint256 _abstain
        ) = abi.decode(payload, (uint16, uint256, uint256, uint256, uint256));
        // As long as the received data isn't already initialized...
        if (spokeVotes[_proposalId][emitterAddress][emitterChainId].initialized) {
            revert("Already initialized!");
        } else {
            // Add it to the map (while setting initialized true)
            spokeVotes[_proposalId][emitterAddress][emitterChainId] = SpokeProposalVote(
                _for,
                _against,
                _abstain,
                true
            );

            finishCollectionPhase(_proposalId);
        }
    }

    /**
     * @dev Executes operations before the execution of a proposal.
     * @param proposalId The ID of the proposal.
     * @param targets The array of target addresses.
     * @param values The array of values to be sent in the transactions.
     * @param calldatas The array of calldata for the transactions.
     * @param descriptionHash The hash of the proposal description.
     */
    function _beforeExecute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override {
        finishCollectionPhase(proposalId);

        require(
            collectionFinished[proposalId],
            "Collection phase for this proposal is unfinished!"
        );

        super._beforeExecute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     @dev Checks if the collection phase for a proposal has finished.
     @param proposalId The ID of the proposal.
    */
    function finishCollectionPhase(uint256 proposalId) public {
        bool phaseFinished = true;
        uint spokeContractsLength = spokeContracts.length;
        for (uint16 i = 1; i <= spokeContractsLength && phaseFinished; ++i) {
            phaseFinished =
            phaseFinished &&
            spokeVotes[proposalId][spokeContracts[i-1].contractAddress][spokeContracts[i-1].chainId].initialized;
        }

        collectionFinished[proposalId] = phaseFinished;
    }

    /**
     @dev Requests the voting data from all of the spoke chains.
     @param proposalId The ID of the proposal.
    */
    function requestCollections(uint256 proposalId) public {
        require(
            block.number > proposalDeadline(proposalId),
            "Cannot request for vote collection until after the vote period is over!"
        );
        require(
            !collectionStarted[proposalId],
            "Collection phase for this proposal has already started!"
        );

        collectionStarted[proposalId] = true;

        // Sends an empty message to each of the aggregators. If they receive a
        // message at all, it is their cue to send data back
        uint spokeContractsLength = spokeContracts.length;
        for (uint16 i = 1; i <= spokeContractsLength; ++i) {
            // Using "1" as the function selector
            bytes memory message = abi.encode(1, proposalId);
            bytes memory payload = abi.encode(
                spokeContracts[i-1].contractAddress,
                spokeContracts[i-1].chainId,
                msg.sender,
                message
            );
            coreBridge.publishMessage(nonce, payload, consistencyLevel);
            nonce++;
        }
    }

    /**
     @dev Creates and publishes a proposal to the spoke contracts.
     This function can be executed only by the magistrate address
     @param targets The array of target addresses.
     @param values The array of values to be sent in the transactions.
     @param calldatas The array of calldata for the transactions.
     @param description The description of the proposal.
     @return The ID of the created proposal.
    */
    function crossChainPropose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description)
    public payable virtual
    onlyMagistrate
    returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        // Sends the proposal to all of the other spoke contracts
        if (spokeContracts.length > 0) {

            // Iterate over every spoke contract
            uint spokeContractsLength = spokeContracts.length;
            for (uint16 i = 1; i <= spokeContractsLength; ++i) {
                bytes memory message = abi.encode(
                    0, // Function selector "0" for destination contract
                    proposalId,
                    block.timestamp // Encoding the proposal start
                );

                bytes memory payload = abi.encode(
                    spokeContracts[i-1].contractAddress,
                    spokeContracts[i-1].chainId,
                    bytes32(uint256(uint160(address(this)))),
                    message
                );

                // Send a message to other contracts
                coreBridge.publishMessage(nonce, payload, consistencyLevel);
                nonce++;
            }
        }
        return proposalId;
    }


    // The following functions are overrides required by Solidity.

    /**
     @dev Retrieves the voting delay period.
     @return The duration of the voting delay in seconds.
    */
    function votingDelay()
    public
    view
    override(IGovernor, GovernorSettings)
    returns (uint256)
    {
        return super.votingDelay();
    }

    /**
     @dev Retrieves the voting period duration.
     @return The duration of the voting period in seconds.
    */
    function votingPeriod()
    public
    view
    override(IGovernor, GovernorSettings)
    returns (uint256)
    {
        return super.votingPeriod();
    }

    /**
     @dev Retrieves the quorum required for voting.
     @param blockNumber The block number to calculate the quorum for.
     @return The required quorum percentage.
    */
    function quorum(uint256 blockNumber)
    public
    view
    override(IGovernor, GovernorVotesQuorumFraction)
    returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /**
     @dev Retrieves the state of a proposal.
     @param proposalId The ID of the proposal.
     @return The current state of the proposal.
    */
    function state(uint256 proposalId)
    public
    view
    override(Governor, GovernorTimelockControl)
    returns (ProposalState)
    {
        ProposalState calculatedState = super.state(proposalId);
        if ((calculatedState == ProposalState.Succeeded || calculatedState == ProposalState.Defeated) && !collectionFinished[proposalId]) {
            return ProposalState.Pending;
        }
        return calculatedState;
    }

    /**
     @dev This is mocked to just revert. Left for compatibility reasons. The only way to create a proposal is [crossChainPropose](#crosschainpropose)
    */
    function propose(address[] memory, uint256[] memory, bytes[] memory, string memory)
    public
    pure
    override(Governor, IGovernor)
    returns (uint256)
    {
        revert("Please use crossChainPropose instead.");
    }

    /**
     @dev Retrieves the proposal threshold required for creating a proposal.
     @return The minimum number of votes required for a proposal to succeed.
    */
    function proposalThreshold()
    public
    view
    override(Governor, GovernorSettings)
    returns (uint256)
    {
        return super.proposalThreshold();
    }

    /**
     * @dev See {IGovernor-castVote}.
     */
    function castVote(uint256 proposalId, uint8 support)
    public
    virtual
    override(Governor, IGovernor)
    returns (uint256) {
        address voter = _msgSender();
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");
        return super._castVote(proposalId, voter, support, "");
    }

    /**
     * @dev See {IGovernor-castVoteWithReason}.
     */
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) public virtual override(Governor, IGovernor) returns (uint256) {
        address voter = _msgSender();
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");
        return super._castVote(proposalId, voter, support, reason);
    }

    /**
     * @dev See {IGovernor-castVoteWithReasonAndParams}.
     */
    function castVoteWithReasonAndParams(
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        bytes memory params
    )
    public
    virtual
    override(Governor, IGovernor)
    returns (uint256) {
        address voter = _msgSender();
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");
        return _castVote(proposalId, voter, support, reason, params);
    }

    /**
     * @dev See {IGovernor-castVoteBySig}.
     */
    function castVoteBySig(
        uint256 proposalId,
        uint8 support,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
    public
    virtual
    override(Governor, IGovernor)
    returns (uint256) {
        address voter = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(BALLOT_TYPEHASH, proposalId, support))),
            v,
            r,
            s
        );
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");
        return _castVote(proposalId, voter, support, "");
    }

    /**
     * @dev See {IGovernor-castVoteWithReasonAndParamsBySig}.
     */
    function castVoteWithReasonAndParamsBySig(
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        bytes memory params,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override(Governor, IGovernor) returns (uint256) {
        address voter = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        EXTENDED_BALLOT_TYPEHASH,
                        proposalId,
                        support,
                        keccak256(bytes(reason)),
                        keccak256(params)
                    )
                )
            ),
            v,
            r,
            s
        );
        require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");
        return super._castVote(proposalId, voter, support, reason, params);
    }

    /**
     * @dev Function to queue a proposal to the timelock.
     */
    function queue(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual override returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);

        require(state(proposalId) == ProposalState.Succeeded, "Governor: proposal not successful");

        return super.queue(targets, values, calldatas, descriptionHash);
    }

    /**
     @dev Executes a proposal.
     @param proposalId The ID of the proposal.
     @param targets The array of target addresses.
     @param values The array of values to be sent in the transactions.
     @param calldatas The array of calldata for the transactions.
    */
    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
    internal
    override(Governor, GovernorTimelockControl)
    {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     @dev Cancels a proposal.
     @param targets The array of target addresses.
     @param values The array of values to be sent in the transactions.
     @param calldatas The array of calldata for the transactions.
     @param descriptionHash The hash of the proposal description.
     @return The ID of the canceled proposal.
    */
    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
    internal
    override(Governor, GovernorTimelockControl)
    returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     @dev Retrieves the executor address.
     @return The address of the executor.
    */
    function _executor()
    internal
    view
    override(Governor, GovernorTimelockControl)
    returns (address)
    {
        return super._executor();
    }

    /**
     @dev Checks if a contract supports a given interface.
     @param interfaceId The interface identifier.
     @return A boolean indicating whether the interface is supported.
    */
    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(Governor, GovernorTimelockControl)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
