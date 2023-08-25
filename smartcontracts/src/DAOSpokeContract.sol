// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/utils/Checkpoints.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "./MetaHumanGovernor.sol";
import "./wormhole/IWormhole.sol";

/**
  @title DAOSpokeContract
  @dev DAOSpokeContract is a contract that handles voting and proposal functionality for a DAO spoke chain.
  It integrates with the MetaHumanGovernor contract for governance operations.
 */
contract DAOSpokeContract {

    bytes32 public hubContractAddress;
    uint16 public hubContractChainId;
    IVotes public immutable token;
    uint256 public immutable targetSecondsPerBlock;
    IWormhole immutable public coreBridge;
    uint16 immutable public chainId;

    uint16 public nonce = 0;
    //TODO:prod please change the consistency level to value of choice. Right now it's set up to `1` which is `finalized` value
    uint8 public consistencyLevel = 1;
    mapping(uint256 => RemoteProposal) public proposals;
    mapping(uint256 => ProposalVote) public proposalVotes;
    mapping(bytes32 => bool) public processedMessages;

    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        mapping(address => bool) hasVoted;
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct RemoteProposal {
        // Blocks provided by the hub chain as to when the local votes should start/finish.
        uint256 localVoteStart;
        bool voteFinished;
    }

   /**
      @dev Contract constructor.
      @param _hubContractAddress The address of the hub contract.
      @param _hubContractChainId The chain ID of the hub contract.
      @param _token The address of the token contract used for voting.
      @param _targetSecondsPerBlock The target number of seconds per block for block estimation.
      @param _chainId The chain ID of the current contract.
      @param _wormholeCoreBridgeAddress The address of the core bridge contract used for cross-chain communication.
    */
    constructor(bytes32 _hubContractAddress, uint16 _hubContractChainId, IVotes _token, uint _targetSecondsPerBlock, uint16 _chainId, address _wormholeCoreBridgeAddress) {
        token = _token;
        targetSecondsPerBlock = _targetSecondsPerBlock;
        chainId = _chainId;
        coreBridge = IWormhole(_wormholeCoreBridgeAddress);
        hubContractAddress = _hubContractAddress;
        hubContractChainId = _hubContractChainId;
    }

    function hasVoted(uint256 proposalId, address account) public view virtual returns (bool) {
        return proposalVotes[proposalId].hasVoted[account];
    }

    /**
     @dev Checks if a proposal exists.
     @param proposalId The ID of the proposal.
     @return A boolean indicating whether the proposal exists.
    */
    function isProposal(uint256 proposalId) view public returns(bool) {
        return proposals[proposalId].localVoteStart != 0;
    }

    /**
     @dev Casts a vote for a proposal.
     @param proposalId The ID of the proposal.
     @param support The vote type (0 - Against, 1 - For, 2 - Abstain).
     @return The voting weight of the voter.
    */
    function castVote(uint256 proposalId, uint8 support) public virtual returns (uint256)
    {
        RemoteProposal storage proposal = proposals[proposalId];
        require(
            !proposal.voteFinished,
            "DAOSpokeContract: vote not currently active"
        );
        require(
            isProposal(proposalId),
            "DAOSpokeContract: not a started vote"
        );

        uint256 weight = token.getPastVotes(msg.sender, proposal.localVoteStart);
        _countVote(proposalId, msg.sender, support, weight);

        return weight;
    }

    /**
     @dev Internal function to count a vote for a proposal.
     @param proposalId The ID of the proposal.
     @param account The address of the voter.
     @param support The vote type (0 - Against, 1 - For, 2 - Abstain).
     @param weight The voting weight of the voter.
    */
    function _countVote(uint256 proposalId, address account, uint8 support, uint256 weight) internal virtual
    {
        ProposalVote storage proposalVote = proposalVotes[proposalId];

        require(!proposalVote.hasVoted[account], "DAOSpokeContract: vote already cast");
        proposalVote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalVote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalVote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalVote.abstainVotes += weight;
        } else {
            revert("DAOSpokeContract: invalid value for enum VoteType");
        }
    }

    /**
     @dev Receives a message from the relayer.
     @param VAA The Verified Action Approval (VAA) message. (read more: https://book.wormhole.com/wormhole/4_vaa.html)
    */
    function receiveMessage(bytes memory VAA) public {
        (IWormhole.VM memory vm, bool valid, string memory reason) = coreBridge.parseAndVerifyVM(VAA);
        require(valid, reason);

        require(hubContractAddress == vm.emitterAddress && hubContractChainId == vm.emitterChainId,
            "Only messages from the hub contract can be received!");

        require(!processedMessages[vm.hash], "Message already processed");

        (
            address intendedRecipient,
            ,//chainId
            ,//sender
            bytes memory decodedMessage
        ) = abi.decode(vm.payload, (address, uint16, address, bytes));

        require(intendedRecipient == address(this));

        processedMessages[vm.hash] = true;

        uint16 option;
        assembly {
            option := mload(add(decodedMessage, 32))
        }

        if (option == 0) {
            // Begin a proposal on the local chain, with local block times
            (, uint256 proposalId, uint256 proposalStart) = abi.decode(decodedMessage, (uint16, uint256, uint256));
            require(!isProposal(proposalId), "Proposal ID must be unique.");

            uint256 cutOffBlockEstimation = 0;
            if(proposalStart < block.timestamp) {
                uint256 blockAdjustment = (block.timestamp - proposalStart) / targetSecondsPerBlock;
                if(blockAdjustment < block.number) {
                    cutOffBlockEstimation = block.number - blockAdjustment;
                }
                else {
                    cutOffBlockEstimation = block.number;
                }
            }
            else {
                cutOffBlockEstimation = block.number;
            }

            proposals[proposalId] = RemoteProposal(cutOffBlockEstimation, false);
        }
        else if (option == 1) {
            // Send vote results back to the hub chain
            (, uint256 proposalId) = abi.decode(decodedMessage, (uint16, uint256));
            ProposalVote storage votes = proposalVotes[proposalId];
            bytes memory messageToSend = abi.encode(
                0,
                proposalId,
                votes.forVotes,
                votes.againstVotes,
                votes.abstainVotes
            );
            bytes memory payload = abi.encode(
                hubContractAddress,
                hubContractChainId,
                msg.sender,
                messageToSend
            );
            coreBridge.publishMessage(nonce, payload, consistencyLevel);
            nonce++;

            proposals[proposalId].voteFinished = true;
        }
    }
}
