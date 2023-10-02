#!/bin/bash

# # for local testing
# FRONTEND_SPOKE_PARAMS=$(cat src/frontend-spoke-params.json)
# GITHUB_ENV="env-test.txt"
# touch $GITHUB_ENV

COUNT=$(echo "$FRONTEND_SPOKE_PARAMS" | jq -s '.[] | length')
for ((i=0; i < $COUNT; i++)); do
  # set vars
  chain_id=$(echo "$FRONTEND_SPOKE_PARAMS" | jq -r --argjson i "$i" '.[$i].REACT_APP_SPOKE_CHAIN_ID')

  varname="REACT_APP_SPOKE_CHAIN_ID_${chain_id}"
  echo "$varname=$chain_id" >> "$GITHUB_ENV"

  varname="REACT_APP_RPC_URL_${chain_id}"
  value=$(echo "$FRONTEND_SPOKE_PARAMS" | jq -r --argjson i "$i" '.[$i].REACT_APP_RPC_URL')
  echo "$varname=$value" >> "$GITHUB_ENV"

  varname="REACT_APP_GOVERNANCE_SPOKE_CHAIN_${chain_id}"
  value=$(echo "$FRONTEND_SPOKE_PARAMS" | jq -r --argjson i "$i" '.[$i].REACT_APP_GOVERNANCE_SPOKE_CHAIN')
  echo "$varname=$value" >> "$GITHUB_ENV"

  varname="REACT_APP_GOVERNANCE_SPOKE_VOTE_TOKEN_${chain_id}"
  value=$(echo "$FRONTEND_SPOKE_PARAMS" | jq -r --argjson i "$i" '.[$i].REACT_APP_GOVERNANCE_SPOKE_VOTE_TOKEN')
  echo "$varname=$value" >> "$GITHUB_ENV"
done

# for local testing
# set -a
# . env-test.txt
# set +a