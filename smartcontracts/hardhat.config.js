require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY, process.env.SECOND_PRIVATE_KEY, process.env.THIRD_PRIVATE_KEY],
    },
    mumbai: {
      url: process.env.POLYGON_MUMBAI_RPC_URL,
      accounts: [process.env.PRIVATE_KEY, process.env.SECOND_PRIVATE_KEY, process.env.THIRD_PRIVATE_KEY],
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.PRIVATE_KEY, process.env.SECOND_PRIVATE_KEY, process.env.THIRD_PRIVATE_KEY],
    },
    avalanche: {
      url: process.env.SPOKE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY, process.env.SECOND_PRIVATE_KEY, process.env.THIRD_PRIVATE_KEY],
    },
    moonbase: {
      url: process.env.MOONBASE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY, process.env.SECOND_PRIVATE_KEY, process.env.THIRD_PRIVATE_KEY],
    },
  },
  paths: {
    tests: "./integration-test"
  }
};
