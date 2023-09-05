const API_URL = 'https://vote-aggregator-scsonez34a-ew.a.run.app/proposal?id='

export interface ChainVoteData {
  chain_name: string
  for: string | number
  against: string | number
  abstain: string | number
}

export async function fetchVotes(proposalId: string): Promise<ChainVoteData[]> {
  const response = await fetch(API_URL + proposalId, {
    method: 'POST',
    mode: 'no-cors',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch votes for proposal: ${proposalId}`)
  }

  const data = await response.json()
  return data
}
