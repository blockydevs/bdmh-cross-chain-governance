import { ChainVoteData } from 'api/votes'

export const aggregateVotes = (data: ChainVoteData[]) => {
  return data.reduce(
    (acc, chainData) => ({
      for: acc.for + chainData.for,
      against: acc.against + chainData.against,
      abstain: acc.abstain + chainData.abstain,
    }),
    { for: 0, against: 0, abstain: 0 }
  )
}
