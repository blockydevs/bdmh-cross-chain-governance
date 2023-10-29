/* eslint-disable prettier/prettier */

const POLYGON_SCAN_API_KEY = "NDZZQB529Q8HQAUXZEARWCHGZBRGDMSEYC";
const MUMBAI_SCAN_API_URL = "https://api-testnet.polygonscan.com/api";
const CONTRACT_CREATION_BLOCK = 41123248;
const VHMT_CONTRACT_ADDRESS = process.env.REACT_APP_HUB_VOTE_TOKEN as string;

const API_URL = process.env.REACT_APP_VOTE_AGGREGATOR_ADDRESS as string;

export interface ChainVoteData {
  chain_name: string;
  for: string | number;
  against: string | number;
  abstain: string | number;
}

export async function fetchVotes(proposalId: string): Promise<ChainVoteData[]> {
  const response = await fetch(API_URL + proposalId);

  if (!response.ok) {
    throw new Error(`Failed to fetch votes for proposal: ${proposalId}`);
  }

  const data = await response.json();
  return data;
}

export async function fetchDelegateData(): Promise<any> {
  const response = await fetch(
    `${MUMBAI_SCAN_API_URL}?module=account&action=txlist&address=${VHMT_CONTRACT_ADDRESS}&startblock=${
      CONTRACT_CREATION_BLOCK - 1
    }&endblock=99999999&page=1&sort=asc&apikey=${POLYGON_SCAN_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch data`);
  }

  const data = await response.json();
  return data;
}
