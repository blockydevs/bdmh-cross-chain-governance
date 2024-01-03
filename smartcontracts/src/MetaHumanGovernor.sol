// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "./CrossChainGovernorCountingSimple.sol";
import "./DAOSpokeContract.sol";
import "./wormhole/IWormholeRelayer.sol";
import "./wormhole/IWormholeReceiver.sol";
import "./magistrate/Magistrate.sol";

/**
 * @title MetaHumanGovernor
 *   @dev MetaHumanGovernor is a contract that serves as a governance system for MetaHuman-related operations. It extends multiple contracts to incorporate various functionalities.
 *
 *   This is the hub contract in the MetaHuman governance smart contracts infrastructure.
 *   It's based on OpenZeppelin's {Governor} implementation along with basic extensions.
 *   For more details check out [OpenZeppelin's documentation](https://docs.openzeppelin.com/contracts/4.x/api/governance#governor).
 */
contract MetaHumanGovernor is
    Governor,
    GovernorSettings,
    CrossChainGovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    Magistrate,
    IWormholeReceiver
{
    
    /// CUSTOM ERRORS /// 
    error AlreadyProcessed(); 

    error RelayerOnly(); 

    error OnlySpokeMessages();

    error CrossChainProposeOnly();

    error InitDone();

    error AlreadyInitialized();

    error OnlyRelayerAllowed();

    error OnlySpokeAllowed();

    error CollectionStarted();

    error PeriodNotOver();

    error CollectionUnfinished();

    IWormholeRelayer immutable public wormholeRelayer;
    uint256 constant internal _GAS_LIMIT = 500_000;
    uint256 constant internal VOTING_PERIOD = 10_080; // 1 week in blocks (polygon mumbai)
    uint256 immutable public secondsPerBlock;
    uint16 immutable public chainId;

    mapping(bytes32 => bool) public processedMessages;
    mapping(uint256 => bool) public collectionStarted;
    mapping(uint256 => bool) public collectionFinished;

    /**
     * @dev Contract constructor.
     *  @param _token The address of the token contract used for voting.
     *  @param _timelock The address of the timelock contract used for delayed execution.
     *  @param _spokeContracts An array of CrossChainAddress structs representing the spoke contracts.
     *  @param _chainId The chain ID of the current contract.
     *  @param _wormholeRelayerAddress The address of the wormhole automatic relayer contract used for cross-chain communication.
     */
    constructor(IVotes _token, TimelockController _timelock, CrossChainAddress[] memory _spokeContracts, uint16 _chainId, address _wormholeRelayerAddress, address _magistrateAddress, uint256 _secondsPerBlock)
    Governor("MetaHumanGovernor")
    GovernorSettings(1 /* 1 block */, 20 * VOTING_PERIOD /* 20 blocks per minute * 15 minutes (polygon mumbai) */, 0) //TODO:prod in production voting delay, voting period, proposal threshold needs to be changed to value of choice. Depending on block time on selected hub chain and desired period
    GovernorVotes(_token)
    GovernorVotesQuorumFraction(4)//TODO:prod change quorum fraction to value of choice
    GovernorTimelockControl(_timelock)
    CrossChainGovernorCountingSimple(_spokeContracts)
    Magistrate(_magistrateAddress)
    {
        chainId = _chainId;
        wormholeRelayer = IWormholeRelayer(_wormholeRelayerAddress);
        secondsPerBlock = _secondsPerBlock;
    }

    /**
     * @dev Allows the magistrate address to withdraw all funds from the contract
     */
    function withdrawFunds() public onlyMagistrate {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @dev Receives messages from the Wormhole protocol's relay mechanism and processes them accordingly.
     *  This function is intended to be called only by the designated Wormhole relayer.
     *  @param payload The payload of the received message.
     *  @param additionalVaas An array of additional data (not used in this function).
     *  @param sourceAddress The address that initiated the message transmission (HelloWormhole contract address).
     *  @param sourceChain The chain ID of the source contract.
     *  @param deliveryHash A unique hash representing the delivery of the message to prevent duplicate processing.
     */
    function receiveWormholeMessages(
        bytes memory payload,
        bytes[] memory additionalVaas, // additionalVaas
        bytes32 sourceAddress, // address that called 'sendPayloadToEvm' (HelloWormhole contract address)
        uint16 sourceChain,
        bytes32 deliveryHash // this can be stored in a mapping deliveryHash => bool to prevent duplicate deliveries
    ) public payable override {
        if (msg.sender != address(wormholeRelayer)) {
            revert RelayerOnly(); 
        }

        if (!spokeContractsMapping[sourceAddress][sourceChain]) {
            revert OnlySpokeMessages();
        }

        if (processedMessages[deliveryHash]) {
            revert AlreadyProcessed();
        }

        (
            address intendedRecipient,
            , //chainId
            , //sender
            bytes memory decodedMessage
        ) = abi.decode(payload, (address, uint16, address, bytes));

        assembly {
            if iszero(eq(intendedRecipient, address())) { revert(0, 0) }
        }
        processedMessages[deliveryHash] = true;
        // Gets a function selector option
        uint16 option;
        assembly {
            option := mload(add(decodedMessage, 32))
        }

        if (option == 0) {
            onReceiveSpokeVotingData(sourceChain, sourceAddress, decodedMessage);
        }
    }

    /**
     * @dev Processes the received voting data from the spoke contracts.
     * @param emitterChainId The chain ID of the emitter contract.
     * @param emitterAddress The address of the emitter contract.
     * @param payload The message payload.
     */
    function onReceiveSpokeVotingData(uint16 emitterChainId, bytes32 emitterAddress, bytes memory payload)
        internal
        virtual
    {
        (
            , // uint16 option
            uint256 _proposalId,
            uint256 _for,
            uint256 _against,
            uint256 _abstain
        ) = abi.decode(payload, (uint16, uint256, uint256, uint256, uint256));
        // As long as the received data isn't already initialized...
        if (spokeVotes[_proposalId][emitterAddress][emitterChainId].initialized) {
            revert AlreadyInitialized();
        } else {
            // Add it to the map (while setting initialized true)
            spokeVotes[_proposalId][emitterAddress][emitterChainId] = SpokeProposalVote(_for, _against, _abstain, true);

            _finishCollectionPhase(_proposalId);
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
        _finishCollectionPhase(proposalId);

        if (!collectionFinished[proposalId]) {
            revert CollectionUnfinished();
        }

        super._beforeExecute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Checks if the collection phase for a proposal has finished.
     *  @param proposalId The ID of the proposal.
     */
    function _finishCollectionPhase(uint256 proposalId) internal {
        bool phaseFinished = true;
        uint256 spokeContractsLength = spokeContractsSnapshots[proposalId].length;
        for (uint16 i = 1; i <= spokeContractsLength && phaseFinished; ++i) {
            phaseFinished = phaseFinished
                && spokeVotes[proposalId][spokeContractsSnapshots[proposalId][i - 1].contractAddress][spokeContractsSnapshots[proposalId][i
                    - 1].chainId].initialized;
        }

        collectionFinished[proposalId] = phaseFinished;
    }

    /**
     * @dev Requests the voting data from all of the spoke chains.
     *  @param proposalId The ID of the proposal.
     */
    function requestCollections(uint256 proposalId) public {
        if (block.number <= proposalDeadline(proposalId)) {
            revert PeriodNotOver();
        }

        if (collectionStarted[proposalId]) {
            revert CollectionStarted();
        }

        collectionStarted[proposalId] = true;

        uint256 spokeContractsLength = spokeContracts.length;
        // Get a price of sending the message back to hub
        uint256 sendMessageToHubCost = quoteCrossChainMessage(chainId, 0);

        // Sends an empty message to each of the aggregators.
        // If they receive a message, it is their cue to send data back
        for (uint16 i = 1; i <= spokeContractsLength; ++i) {
            // Using "1" as the function selector
            bytes memory message = abi.encode(1, proposalId);
            bytes memory payload =
                abi.encode(spokeContracts[i - 1].contractAddress, spokeContracts[i - 1].chainId, msg.sender, message);

            uint256 cost = quoteCrossChainMessage(spokeContracts[i - 1].chainId, sendMessageToHubCost);

            wormholeRelayer.sendPayloadToEvm{value: cost}(
                spokeContracts[i - 1].chainId,
                address(uint160(uint256(spokeContracts[i - 1].contractAddress))),
                payload,
                sendMessageToHubCost, // send value to enable the spoke to send back vote result
                _GAS_LIMIT
            );
        }
    }

    /**
     * @dev Creates and publishes a proposal to the spoke contracts.
     *  This function can be executed only by the magistrate address
     *  @param targets The array of target addresses.
     *  @param values The array of values to be sent in the transactions.
     *  @param calldatas The array of calldata for the transactions.
     *  @param description The description of the proposal.
     *  @return The ID of the created proposal.
     */
    function crossChainPropose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public payable virtual onlyMagistrate returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        // Sends the proposal to all of the other spoke contracts
        if (spokeContracts.length > 0) {
            // Iterate over every spoke contract and send a message
            uint256 spokeContractsLength = spokeContracts.length;
            for (uint16 i = 1; i <= spokeContractsLength; ++i) {
                bytes memory message = abi.encode(
                    0, // Function selector "0" for destination contract
                    proposalId,
                    block.timestamp // Encoding the proposal start
                );

                bytes memory payload = abi.encode(
                    spokeContracts[i - 1].contractAddress,
                    spokeContracts[i - 1].chainId,
                    bytes32(uint256(uint160(address(this)))),
                    message
                );

                uint256 cost = quoteCrossChainMessage(spokeContracts[i - 1].chainId, 0);

                wormholeRelayer.sendPayloadToEvm{value: cost}(
                    spokeContracts[i - 1].chainId,
                    address(uint160(uint256(spokeContracts[i - 1].contractAddress))),
                    payload,
                    0, // no receiver value needed
                    _GAS_LIMIT
                );
            }
        }
        return proposalId;
    }

    /**
     * @dev Retrieves the quote for cross chain message delivery.
     *  @return cost Price, in units of current chain currency, that the delivery provider charges to perform the relay
     */
    function quoteCrossChainMessage(uint16 targetChain, uint256 valueToSend) internal view returns (uint256 cost) {
        (cost,) = wormholeRelayer.quoteEVMDeliveryPrice(targetChain, valueToSend, _GAS_LIMIT);
    }

    /**
     * @dev Estimates timestamp when given block number should be the current block.
     *  @return blockToEstimate Block to estimate the timestamp for.
     */
    function estimateTimestampFromBlock(uint256 blockToEstimate) internal view returns (uint256) {
        uint256 currentTimestamp = block.timestamp;
        uint256 currentBlock = block.number;
        uint256 estimatedTimestamp = 0;
        if (blockToEstimate > currentBlock) {
            //future
            uint256 blockDifference = blockToEstimate - currentBlock;
            uint256 timeDifference = blockDifference * secondsPerBlock;
            estimatedTimestamp = currentTimestamp + timeDifference;
        } else {
            //past
            uint256 blockDifference = currentBlock - blockToEstimate;
            uint256 timeDifference = blockDifference * secondsPerBlock;
            estimatedTimestamp = currentTimestamp - timeDifference;
        }

        return estimatedTimestamp;
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
     * @dev Retrieves the state of a proposal.
     *  @param proposalId The ID of the proposal.
     *  @return The current state of the proposal.
     */
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        ProposalState calculatedState = super.state(proposalId);
        if (
            (calculatedState == ProposalState.Succeeded || calculatedState == ProposalState.Defeated)
                && !collectionFinished[proposalId]
        ) {
            return ProposalState.Pending;
        }
        return calculatedState;
    }

    /**
     * @dev This is mocked to just revert. Left for compatibility reasons. The only way to create a proposal is [crossChainPropose](#crosschainpropose)
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
     * @dev Retrieves the proposal threshold required for creating a proposal.
     *  @return The minimum number of votes required for a proposal to succeed.
     */
    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    /**
     * @dev Executes a proposal.
     *  @param proposalId The ID of the proposal.
     *  @param targets The array of target addresses.
     *  @param values The array of values to be sent in the transactions.
     *  @param calldatas The array of calldata for the transactions.
     */
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Cancels a proposal.
     *  @param targets The array of target addresses.
     *  @param values The array of values to be sent in the transactions.
     *  @param calldatas The array of calldata for the transactions.
     *  @param descriptionHash The hash of the proposal description.
     *  @return The ID of the canceled proposal.
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Retrieves the executor address.
     *  @return The address of the executor.
     */
    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    /**
     * @dev Checks if a contract supports a given interface.
     *  @param interfaceId The interface identifier.
     *  @return A boolean indicating whether the interface is supported.
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
