#!/bin/bash

echo "Vote token deployment"
forge script script/VHMTDeployment.s.sol:VHMTDeployment --rpc-url $HUB_RPC_URL --broadcast --verify
VOTE_TOKEN_ADDRESS="$(cat "broadcast/VHMTDeployment.s.sol/$HUB_CHAIN_ID/run-latest.json" | jq -r '.transactions[0].contractAddress')"

# hub contract deployment
echo "Deploying Hub contract"
forge script script/HubDeployment.s.sol:HubDeployment --rpc-url $HUB_RPC_URL --broadcast --verify
GOVERNOR_ADDRESS="$(cat "broadcast/HubDeployment.s.sol/$HUB_CHAIN_ID/run-latest.json" | jq -r '.transactions[0].contractAddress')"
TIMELOCK_ADDRESS="$(cat "broadcast/HubDeployment.s.sol/$HUB_CHAIN_ID/run-latest.json" | jq -r '.transactions[0].contractAddress')"

# spoke contract deployment
echo "Deploy Spoke contracts"
COUNT=$(echo "$SPOKE_PARAMS" | jq -s '. | length')
for ((i=0; i < $COUNT; i++)); do
  # set vars
  SPOKE_CORE_BRIDGE_ADDRESS=$(echo "$SPOKE_PARAMS" | jq -r -s --argjson i "$i" '.[$i].SPOKE_CORE_BRIDGE_ADDRESS')
  SPOKE_CHAIN_ID=$(echo "$SPOKE_PARAMS" | jq -r -s --argjson i "$i" '.[$i].SPOKE_CHAIN_ID')
  SPOKE_RPC_URL=$(echo "$SPOKE_PARAMS" | jq -r -s --argjson i "$i" '.[$i].SPOKE_RPC_URL')
  SPOKE_ETHERSCAN_API_KEY=$(echo "$SPOKE_PARAMS" | jq -r -s --argjson i "$i" '.[$i].SPOKE_ETHERSCAN_API_KEY')
  SPOKE_HM_TOKEN_ADDRESS=$(echo "$SPOKE_PARAMS" | jq -r -s --argjson i "$i" '.[$i].SPOKE_HM_TOKEN_ADDRESS')

  HM_TOKEN_ADDRESS=$HUB_HM_TOKEN_ADDRESS
  forge script script/VHMTDeployment.s.sol:VHMTDeployment --rpc-url $SPOKE_RPC_URL --broadcast --verify
  VOTE_TOKEN_ADDRESS="$(cat "broadcast/VHMTDeployment.s.sol/$SPOKE_CHAIN_ID/run-latest.json" | jq -r '.transactions[0].contractAddress')"
  HUB_VOTE_TOKEN_ADDRESS=$VOTE_TOKEN_ADDRESS
  SPOKE_VOTE_TOKEN_ADDRESS=$VOTE_TOKEN_ADDRESS

  forge script script/SpokeDeployment.s.sol:SpokeDeployment --rpc-url $SPOKE_RPC_URL --etherscan-api-key $SPOKE_ETHERSCAN_API_KEY --broadcast --legacy --verify

  SPOKE_CHAIN_IDS="${SPOKE_CHAIN_IDS},${SPOKE_CHAIN_ID}"
  SPOKE_ADDRESSES="${SPOKE_ADDRESSES},${SPOKE_CORE_BRIDGE_ADDRESS}"
done
# remove first character
SPOKE_CHAIN_IDS=${SPOKE_CHAIN_IDS:1}
SPOKE_ADDRESSES=${SPOKE_ADDRESSES:1}

echo "Setting spoke contracts in the hub"
forge script script/HubUpdateSpokeContracts.s.sol:HubUpdateSpokeContracts --rpc-url $HUB_RPC_URL --broadcast

if [[ $TIMELOCK -eq "true" ]]; then
  echo "Transfer governance ownership to timelock"
  forge script script/HubTransferOwnership.s.sol:HubTransferOwnership --rpc-url $HUB_RPC_URL --broadcast
fi
