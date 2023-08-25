pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/wormhole/IWormholeRelayer.sol";

abstract contract DeploymentUtils is Script {
    address public magistrateAddress = vm.envAddress("MAGISTRATE_ADDRESS");
    uint16 public mumbaiChainId = 5;
    uint16 public arbitrumGoerliChainId = 23;
    uint16 public hubChainId = uint16(vm.envUint("HUB_CHAIN_ID"));
    uint16 public targetSecondsPerBlock = 12;
    address public mumbaiAutomaicRelayerAddress = address(0x0591C25ebd0580E0d4F27A82Fc2e24E7489CB5e0);
    address public avalancheAutomaticRelayerAddress = address(0xA3cF45939bD6260bcFe3D66bc73d60f19e49a8BB);
    address public automaticRelayerAddress = vm.envAddress("HUB_AUTOMATIC_REALYER_ADDRESS");
    uint256 constant internal GAS_LIMIT = 500_000;
    IWormholeRelayer public wormholeRelayer = IWormholeRelayer(automaticRelayerAddress);

    uint256 public deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    uint256 public secondPrivateKey = vm.envUint("SECOND_PRIVATE_KEY");
    uint256 public thirdPrivateKey = vm.envUint("THIRD_PRIVATE_KEY");
    address public deployerAddress = vm.addr(deployerPrivateKey);
    address public secondAddress = vm.addr(secondPrivateKey);
    address public thirdAddress = vm.addr(thirdPrivateKey);

    function quoteCrossChainMessage(uint16 targetChain) internal view returns (uint256 cost) {
        (cost,) = wormholeRelayer.quoteEVMDeliveryPrice(targetChain, 0, GAS_LIMIT);
    }

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
