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

The application uses the following environment variables:

```
REACT_APP_GOVERNANCE_HUB_ADDRESS="<your address here>"
REACT_APP_HUB_VOTE_TOKEN_ADDRESS="<your address here>"

REACT_APP_GOVERNANCE_SPOKE_ADRESSES="<your address here>"
REACT_APP_SPOKE_VOTE_TOKEN_ADDRESSES="<your address here>"
```

These variables represent the Ethereum addresses of different components within our governance system and can be adjusted as per your needs.

`REACT_APP_GOVERNANCE_HUB_ADDRESS`: This is the address of our primary (hub) chain. We retrieve all the proposals from this address on which votes can later be cast in the governance system.
`REACT_APP_HUB_VOTE_TOKEN_ADDRESS`: This is the address for the vhmt token associated with our hub chain.
`REACT_APP_GOVERNANCE_SPOKE_ADRESSES`: This represents the secondary (spoke) chain from which we can also vote on proposals retrieved from the primary (hub) chain.
`REACT_APP_SPOKE_VOTE_TOKEN_ADDRESSES`: This is the address for the vhmt token associated with our spoke chain.

Remember to replace `<your address here>` with the respective Ethereum addresses for each environment variable.


## Setup and Installation

Follow the steps below to set up the project on your local machine:

- Clone the repository using the following command: `git clone https://github.com/blockydevs/uniswap-interface.git`
- Check your Node.js version by typing `node --version` in your terminal. If your Node.js version is not 14, follow these steps:
    * Install NVM following instructions [here](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)
    * Open your terminal as an administrator and type `nvm install 14`
    * After successful installation, type `nvm use 14`
- Install Yarn globally using the command `npm install -g yarn` - 
- Open the uniswap-interface folder in your code editor
- Install the necessary Node modules by typing `yarn install` in your terminal
- Swap to `develop` branch using a `git checkout develop` command
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