# Project README

## Overview

This project contains the smart contracts developed for the MetaHuman Governance project. These contracts facilitate various
functionalities related to governance and cross-chain communication.

## Architecture
This governance uses Hub-Spoke architecture. The `MetaHumanGovernor` contract is the hub where `DAOSpokeContract` is the spoke.

## Contracts

⚠️ When deploying contracts please confirm that parameters marked `TODO:prod` are correctly set up. ⚠️

### MetaHumanGovernor

The `MetaHumanGovernor` contract is responsible for governance functionalities. It implements
the `Governor`, `GovernorSettings`, `GovernorVotes`, `GovernorVotesQuorumFraction`, and `GovernorTimelockControl`
interfaces. It allows token holders to propose and vote on proposals, and execute approved proposals through a timelock
mechanism. Additionally, it supports cross-chain communication using the `IWormhole` contract.

### DAOSpokeContract

The `DAOSpokeContract` contract serves as a spoke contract in a cross-chain governance setup. It allows token holders to
cast votes on proposals and participate in the governance process. The contract interacts with the `IWormhole` contract
for cross-chain communication.

### CrossChainGovernorCountingSimple

The `CrossChainGovernorCountingSimple` contract provides counting functionality for cross-chain governance. It extends
the `Governor` and `Ownable` contracts and implements cross-chain voting counts. It maintains mappings and structures to
track proposal votes from different spoke contracts.

## Dependencies

The project relies on the following external dependencies:

- OpenZeppelin contracts: version 4.x.x
- Solidity: version 0.8.0

## Setup and Deployment

To set up and deploy the contracts, follow these steps:

1. Install Foundry. [Installation guide](https://book.getfoundry.sh/getting-started/installation)
2. Prepare `.env` file based on provided [.env.example](.env.example).
3. Fill out private keys, rpc urls, magistrate address and Etherscan api keys.
4. Follow instructions from [Deployment guide](DEPLOYMENT_GUIDE.md).

## Usage

Once deployed, the contracts can be interacted with using Ethereum addresses and appropriate function calls. Refer to
the contract documentation for detailed information on each contract's functionality and available methods.

## Contributing
...
## License
...
