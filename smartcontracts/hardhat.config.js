require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry")

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  },
  paths: {
    tests: "./integration-test"
  }
};
