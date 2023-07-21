pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract DeploymentUtils is Script {
    address public magistrateAddress = vm.envAddress("MAGISTRATE_ADDRESS");
    uint16 public mumbaiChainId = 5;
    uint16 public arbitrumGoerliChainId = 23;
    uint16 public hubChainId = 10002;
    uint16 public targetSecondsPerBlock = 12;
    address public sepoliaCoreBridgeAddress = address(0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78);
    address public mumbaiCoreBridgeAddress = address(0x0CBE91CF822c73C2315FB05100C2F714765d5c20);
    address public arbitrumGoerliCoreBridgeAddress = address(0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e);

    uint256 public deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    uint256 public secondPrivateKey = vm.envUint("SECOND_PRIVATE_KEY");
    uint256 public thirdPrivateKey = vm.envUint("THIRD_PRIVATE_KEY");
    address public deployerAddress = vm.addr(deployerPrivateKey);
    address public secondAddress = vm.addr(secondPrivateKey);
    address public thirdAddress = vm.addr(thirdPrivateKey);

    function getProposalExecutionData() public view returns(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) {
        address hmTokenAddress = vm.envAddress("HM_TOKEN_ADDRESS");

        description = vm.envString("DESCRIPTION");

        bytes memory encodedCall = abi.encodeCall(IERC20.transfer, (address(deployerAddress), 50));
        targets = new address[](1);
        values = new uint256[](1);
        calldatas = new bytes[](1);
        targets[0] = address(hmTokenAddress);
        calldatas[0] = encodedCall;

        return (targets, values, calldatas, description);
    }
}
