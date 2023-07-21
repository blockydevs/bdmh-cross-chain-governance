// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MetaHumanGovernor.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "../src/vhm-token/VHMToken.sol";
import "../src/hm-token/HMToken.sol";

contract HubUpdateSpokeContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable governorAddress = payable(vm.envAddress("GOVERNOR_ADDRESS"));
        address timelockAddress = vm.envAddress("TIMELOCK_ADDRESS");
        address spokeAddress = vm.envAddress("SPOKE_1_ADDRESS");
        vm.startBroadcast(deployerPrivateKey);
        MetaHumanGovernor governanceContract = MetaHumanGovernor(governorAddress);
        CrossChainGovernorCountingSimple.CrossChainAddress[] memory spokeContracts = new CrossChainGovernorCountingSimple.CrossChainAddress[](1);
        spokeContracts[0] = CrossChainGovernorCountingSimple.CrossChainAddress(bytes32(uint256(uint160(spokeAddress))), 5);
        governanceContract.updateSpokeContracts(spokeContracts);
        governanceContract.transferOwnership(timelockAddress);
        vm.stopBroadcast();
    }
}
