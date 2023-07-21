# Deployment Guide

## Overview

This document contains information about scripts that helps with the deployment, initialization and interaction with
MetaHuman Governance smart contracts.

## Preparation

To make the scripts work please create `.env` file based on `.env.example` and fill the `User data` section.
Variables `SECOND_PRIVATE_KEY` and `THIRD_PRIVATE_KEY` are not required to deploy the contracts, they are used for
testing purposes to make sure that there are token holders that will be eligible to vote.

After creating `.env` file please run:

```
source .env
```

## Deploying the contracts

The deployment process consist of deploying:

- HMToken - this is used as a "main" token in the ecosystem.
- VHMToken - a `ERC20Wrapper` on the "main" token with `ERC20Votes` extension.
- TimelockController - An OpenZeppelin's implementation of a timelocked controller that is used to execute successful
  proposals.
- MetaHumanGovernor - The hub contract that enables proposal creation and voting. It is the main contract in the whole
  ecosystem.
- DAOSpokeContract (a separate `HMToken` and `VHMToken` will be deployed, as the contract can be deployed on other
  chains) -
  The spoke contract that enables to vote on proposal on other chains.

### Hub contract deployment

To deploy the Hub contract along with [HMToken.sol](src%2Fhm-token%2FHMToken.sol)
and [VHMToken.sol](src%2Fvhm-token%2FVHMToken.sol) please run following command:

```
forge script script/HubDeployment.s.sol:HubDeployment --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

This will
deploy [HMToken.sol](src%2Fhm-token%2FHMToken.sol), [VHMToken.sol](src%2Fvhm-token%2FVHMToken.sol), [MetaHumanGovernor.sol](src%2FMetaHumanGovernor.sol), `TimelockController`,
then grant `PROPOSER_ROLE` on
Timelock to Governance and then remove `TIMELOCK_ADMIN_ROLE` from the deployer.

After successfully running the script please fill `.env` with addresses of:

- GOVERNOR_ADDRESS
- TIMELOCK_ADDRESS
- HM_TOKEN_ADDRESS
- VOTE_TOKEN_ADDRESS

The addresses can be found in console output of the script and in
the `/broadcast/HubDeployment.s.sol/<chain_id>/run-latest.json`

### Spoke contract deployment

This will
deploy [HMToken.sol](src%2Fhm-token%2FHMToken.sol), [VHMToken.sol](src%2Fvhm-token%2FVHMToken.sol), [DAOSpokeContract.sol](src%2FDAOSpokeContract.sol)
on chain provided by the `--rpc-url` variable. In testing, the contract was deployed on Polygon Mumbai.

```
forge script script/SpokeDeployment.s.sol:SpokeDeployment --rpc-url $POLYGON_MUMBAI_RPC_URL --etherscan-api-key $MUMBAI_ETHERSCAN_API_KEY --broadcast --legacy --verify
```

After successfully running the script please fill `.env` with addresses of:

- SPOKE_1_ADDRESS
- SPOKE_VOTE_TOKEN_ADDRESS

The addresses can be found in console output of the script and in
the `/broadcast/SpokeDeployment.s.sol/<chain_id>/run-latest.json`

### Setting spoke contracts in the hub

Next step is to let the Hub know about Spoke addresses and chains. To update the Hub with `SPOKE_1_ADDRESS` please run
following script:

```
forge script script/HubUpdateSpokeContracts.s.sol:HubUpdateSpokeContracts --rpc-url $SEPOLIA_RPC_URL --broadcast
```

## Interacting with Governance ecosystem

After setting up the ecosystem, everything is ready for user interaction.

### Self-delegate voting power

First step is to self-delegate the voting power that is the amount of [VHMToken.sol](src%2Fvhm-token%2FVHMToken.sol)
held by given account.

The voting tokens are different on each chain, for now there are two scripts created to delegate on Hub or Spoke chain.

```
forge script script/HubSelfDelegateVote.s.sol:HubSelfDelegateVote --rpc-url $SEPOLIA_RPC_URL --broadcast
```

```
forge script script/SpokeSelfDelegateVote.s.sol:SpokeSelfDelegateVote --rpc-url $POLYGON_MUMBAI_RPC_URL --broadcast --legacy
```

### Creating proposal

Create proposal script is used to create the proposal on Hub contract using `crossChainPropose` function.

This should be used for testing purposes as the proposal action is hardcoded to be a simple grant.

To create a different proposal just change the `targets`, `values`, `calldatas` and `description` in
the [DeploymentUtils.sol](script%2FDeploymentUtils.sol) file in function `getProposalExecutionData()`.

```
forge script script/CreateProposal.s.sol:CreateProposal --rpc-url $SEPOLIA_RPC_URL --broadcast
```

### Cast vote

There are two scripts to cast a `for` vote on proposal defined in
the [DeploymentUtils.sol](script%2FDeploymentUtils.sol) file in function `getProposalExecutionData()`.

`CastVote` using the Hub contract:

```
forge script script/CastVote.s.sol:CastVote --rpc-url $SEPOLIA_RPC_URL --broadcast
```

`CastVoteThroughSpokeContract` using the Spoke contract:

```
forge script script/CastVoteThroughSpokeContract.s.sol:CastVoteThroughSpokeContract --rpc-url $POLYGON_MUMBAI_RPC_URL --broadcast --legacy
```

### Request collections

After the voting period ends, Hub contract needs to `RequestCollections` from Spoke contracts. To call this function
please execute:

```
forge script script/RequestCollections.s.sol:RequestCollections --rpc-url $SEPOLIA_RPC_URL --broadcast
```

### Queue

After collection phase has ended anyone can `Queue` the proposal for execution by calling `queue` function on Hub
contract. This can be done using:

```
forge script script/QueueProposal.s.sol:QueueProposal --rpc-url $SEPOLIA_RPC_URL --broadcast
```

### Execute

After timelock period has passed anyone can `Execute` the proposal for execution by calling `execute` function on Hub
contract. This can be done using:

```
forge script script/ExecuteProposal.s.sol:ExecuteProposal --rpc-url $SEPOLIA_RPC_URL --broadcast
```

## Helper scripts

There are also two helper scripts that help with the development and testing.

- [FundAccounts.s.sol](script%2FFundAccounts.s.sol) can be used to fund account
  with [HMToken.sol](src%2Fhm-token%2FHMToken.sol). Account address is taken from .env variable `ADDRESS_TO_FUND`.
```
forge script script/FundAccounts.s.sol:FundAccounts --rpc-url $SEPOLIA_RPC_URL --broadcast
```
- [TransferTokensToTimelock.s.sol](script%2FTransferTokensToTimelock.s.sol) can be used to transfer tokens to timelock when trying to execute a grant proposal.
```
forge script script/TransferTokensToTimelock.s.sol:TransferTokensToTimelock --rpc-url $SEPOLIA_RPC_URL --broadcast
```

