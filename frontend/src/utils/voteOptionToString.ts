import { VoteOption } from 'state/governance/types'

export function voteOptionToString(vote: VoteOption): string {
  switch (vote) {
    case VoteOption.Against:
      return 'You have already voted AGAINST this proposal'
    case VoteOption.For:
      return 'You have already voted FOR this proposal'
    case VoteOption.Abstain:
      return 'You have already ABSTAINED from the vote on this proposal'
    default:
      return 'You have already voted on this proposal'
  }
}
