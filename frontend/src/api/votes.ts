import { ALL_CHAIN_VOTES_MOCKED_DATA } from 'constants/AllChainVotesMocked'
console.log('ALL_CHAIN_VOTES_MOCKED_DATA:', ALL_CHAIN_VOTES_MOCKED_DATA)

// const API_URL = ''

export interface ChainVoteData {
  chain_name: string
  for: number
  against: number
  abstain: number
}

export async function fetchVotes(proposalId: string): Promise<ChainVoteData[]> {
  console.log('proposalId:', proposalId)
  // const response = await fetch(API_URL)

  // if (!response.ok) {
  //   throw new Error(`Failed to fetch votes for proposal: ${proposalId}`)
  // }

  // const data = await response.json()
  // return data

  // delay simulation for mocked data
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return ALL_CHAIN_VOTES_MOCKED_DATA
}
