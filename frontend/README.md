# Human Protocol links

- Website: [humanprotocol.org](https://humanprotocol.org/)
- Email: [contact@hmt.ai](mailto:contact@hmt.ai)
- [Twitter](http://hmt.ai/twitter)
- [Discord](http://hmt.ai/discord)
- [GitHub](http://hmt.ai/github)
- [LinkedIn](http://hmt.ai/linkedin)
- [Youtube](https://www.youtube.com/@HUMANProtocol)


## Overview

This repository is a fork of the Uniswap Interface, a decentralized trading protocol, guaranteeing secure and efficient transactions on the Ethereum blockchain. The original Uniswap Interface can be found [here](https://github.com/Uniswap/interface).

Our project modifies the Uniswap Interface to introduce our user-friendly and transparent custom governance system, where users can efficiently navigate, explore, and actively participate in the governance structure of the primary hub chain and understand the activities of the associated spoke chains.


## Prerequisites

Before you proceed, ensure that you have the following installed:
- Node.js (version 14 is required) - it's the JavaScript runtime that allows us to run our JavaScript code server-side - [download link](https://nodejs.org/en/download) 
- NVM (Node Version Manager) - a tool that allows you to install and manage multiple versions of Node.js. You need it if you already have a newer version of Node installed so you can swap it to version 14 - [download link](https://github.com/coreybutler/nvm-windows/releases) 
- Yarn - Human Governor uses Yarn to handle its dependencies, making it a necessary tool for the project setup. - [download link](https://yarnpkg.com/cli/install)


## Environment Variables

The application uses several environment variables to work with Ethereum blockchain addresses. Here's an example of how to set them:

```
REACT_APP_INFURA_KEY="081241040847461bbcbdcef717b7c297"

REACT_APP_GOVERNANCE_HUB_ADDRESS="0xe1730A3f208911945b77191069030cE3B2129f77"
REACT_APP_HUB_VOTE_TOKEN="0xc4bD219f6f26ffBd664779d8E54c71Bc8170552F"
REACT_APP_HUB_CHAIN_ID="11155111"

REACT_APP_GOVERNANCE_SPOKE_CHAIN_80001="0xCF17e5409e02423283e2402d82B0b5c8BEcDB13a"
REACT_APP_GOVERNANCE_SPOKE_VOTE_TOKEN_80001="0xA78A4161C65Cd581E9209864E506dD1A1eF6cf77"

REACT_APP_GOVERNANCE_SPOKE_CHAIN_421613="0x75e9990D2b4CE167282BA2071f771f3248D3B9F9"
REACT_APP_GOVERNANCE_SPOKE_VOTE_TOKEN_421613="0x3335609C31e21317f98b4Fa0EB3cA71C8A8AaF3E"
```

There can be only one hub chain, defined by three specific environment variables. 
- `REACT_APP_GOVERNANCE_HUB_ADDRESS` corresponds to its address, 
- `REACT_APP_HUB_VOTE_TOKEN` refers to its voting token,
- `REACT_APP_HUB_CHAIN_ID` specifies the hub chain ID.

For spoke chains, there can be multiple. If you want to add another spoke chain please create two variables.
- `REACT_APP_GOVERNANCE_SPOKE_CHAIN_<CHAINID>`,
- `REACT_APP_GOVERNANCE_SPOKE_VOTE_TOKEN_<CHAINID>` 

(remember to change <CHAINID> with the actual number for both cases and assign address to them).


## Setup and Installation

Follow the steps below to set up the project on your local machine:

- Clone the repository using the following command: `git clone https://github.com/blockydevs/uniswap-interface.git`
- Open the uniswap-interface folder in your code editor
- Check your Node.js version by typing `node --version` in your terminal. If your Node.js version is not 14, follow these steps:
    * Install NVM following instructions [here](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)
    * Open your terminal as an administrator and type `nvm install 14`
    * After successful installation, type `nvm use 14`
- Install Yarn globally using the command `npm install -g yarn`
- Swap to `develop` branch using a `git checkout develop` command
- Install the necessary Node modules by typing `yarn install` in your terminal
- Start the local development server using `yarn start`
- The project should automatically open in a new tab in your default browser. If not, manually navigate to `localhost:3000` in your browser


## Troubleshooting

- If you encounter an error when checking your Node.js version, it most likely means that Node.js has not been correctly installed, and you should consider reinstalling it.
- If you encounter errors related to missing packages after installing Node modules, try running yarn install again and restart the project.


## Key App Features

- PROPOSAL LIST: Our app offers a holistic view of hub governance proposals, presenting key details such as proposal numbers, titles, descriptions, and their current statuses in an intuitive and easy-to-navigate format.

- PROPOSAL DETAILS: Users can access comprehensive information about individual proposals from any spoke chain. Each proposal's purpose, proposed actions, and associated voting details are readily available, offering a deep understanding of its context and potential impact on the governance structure. Prominently displayed proposal status indicators (e.g., active, succeeded, defeated) provide transparency and enable users to quickly assess the state of the proposal.

- VOTING: Our application facilitates active participation in the decision-making process across the hub and spoke chains. Users can vote on hub chain proposals either from the hub chain using its specific tokens or from any spoke chain using the respective spoke chain tokens. Voting options include 'for', 'against', or 'abstain', with abstain votes counting towards quorum. The voting process is encapsulated in a single transaction for the user's convenience.

- TOKEN EXCHANGE: The application supports the exchange of tokens between hmt and vhmt. The vhmt tokens are used for voting, providing users with a seamless way to participate in the governance process.