#!/bin/bash

echo "Vote token deployment"
forge script script/VHMTDeployment.s.sol:VHMTDeployment --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# hub vote deployment
echo "Deploying Hub contract"
forge script script/HubDeployment.s.sol:HubDeployment --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
GOVERNOR_ADDRESS="$(cat "broadcast/HubDeployment.s.sol/$CHAIN/run-latest.json" | jq -r '.transactions[0].contractAddress')"
TIMELOCK_ADDRESS="$(cat "broadcast/HubDeployment.s.sol/$CHAIN/run-latest.json" | jq -r '.transactions[0].contractAddress')"

# spoke vote deployment
echo "Deploy Spoke contract"
forge script script/SpokeDeployment.s.sol:SpokeDeployment --rpc-url $POLYGON_MUMBAI_RPC_URL --etherscan-api-key $MUMBAI_ETHERSCAN_API_KEY --broadcast --legacy --verify
SPOKE_ADDRESSES="$(cat "broadcast/SpokeDeployment.s.sol/$CHAIN/run-latest.json" | jq -r '.receipts[].logs | map(.address) | join(",")')"
SPOKE_CHAIN_IDS=$CHAIN

echo "Setting spoke contracts in the hub"
forge script script/HubUpdateSpokeContracts.s.sol:HubUpdateSpokeContracts --rpc-url $SEPOLIA_RPC_URL --broadcast

if [[ $TIMELOCK -eq "true" ]]; then
  echo "Transfer governance ownership to timelock"
  forge script script/HubTransferOwnership.s.sol:HubTransferOwnership --rpc-url $SEPOLIA_RPC_URL --broadcast
fi
