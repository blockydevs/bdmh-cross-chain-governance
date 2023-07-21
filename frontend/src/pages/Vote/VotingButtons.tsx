import { Trans } from '@lingui/macro'
import { useScreenSize } from 'hooks/useScreenSize'
import { ProposalState } from 'state/governance/hooks'
import { VoteOption } from 'state/governance/types'
import styled, { useTheme } from 'styled-components/macro'
import { ThemedText } from 'theme'

import { ButtonPrimary } from '../../components/Button'
import { useToggleVoteModal } from '../../state/application/hooks'

const VOTING_BUTTONS = [
  { buttonLabel: 'Vote For', voteOption: VoteOption.For, numberLabel: 'Votes For' },
  { buttonLabel: 'Vote Against', voteOption: VoteOption.Against, numberLabel: 'Votes Against' },
  { buttonLabel: 'Abstain', voteOption: VoteOption.Abstain, numberLabel: 'Votes Abstain' },
]

const VotingButtonsContainer = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 16px;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    flex-direction: column;
  }
`

const InnerButtonTextContainer = styled('div')`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    margin-bottom: 0;
  }
`

const ButtonContainer = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 16px 24px;
  background: ${({ theme }) => theme.backgroundGray};
  border-radius: 7px;
  gap: 16px;

  > button {
    max-width: 204px;
    height: 42px;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    gap: 36px;
    flex-direction: row;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    gap: 24px;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.xs}px`}) {
    gap: 36px;
    padding: 16px 8px;
  }
`

const VotesNumberContainer = styled('div')`
  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    width: 90px;
  }
`

interface VotingButtonsProps {
  forVotes: number | undefined
  againstVotes: number | undefined
  abstainVotes: number | undefined
  setVoteOption: React.Dispatch<React.SetStateAction<VoteOption | undefined>>
  showVotingButtons: boolean | undefined
  proposalStatus: ProposalState | undefined
}

export default function VotingButtons({
  forVotes,
  againstVotes,
  abstainVotes,
  setVoteOption,
  showVotingButtons,
  proposalStatus,
}: VotingButtonsProps) {
  const toggleVoteModal = useToggleVoteModal()
  const theme = useTheme()
  const isScreenSize = useScreenSize()

  const showNumberLabel = isScreenSize.xs && isScreenSize.sm && isScreenSize.md

  const chooseValue = (valueType: number) => {
    if (valueType === 0) return againstVotes
    if (valueType === 1) return forVotes
    return abstainVotes
  }

  return (
    <VotingButtonsContainer>
      {VOTING_BUTTONS.map(({ buttonLabel, voteOption, numberLabel }, index) => (
        <ButtonContainer key={index}>
          <ButtonPrimary
            padding="8px"
            onClick={() => {
              setVoteOption(voteOption)
              toggleVoteModal()
            }}
            disabled={!showVotingButtons}
          >
            <ThemedText.BodyPrimary
              fontSize={15}
              color={proposalStatus === ProposalState.PENDING || !showVotingButtons ? theme.accentGray : theme.white}
            >
              <Trans>{buttonLabel}</Trans>
            </ThemedText.BodyPrimary>
          </ButtonPrimary>

          <InnerButtonTextContainer>
            {showNumberLabel ? (
              <ThemedText.BodyPrimary fontSize={14}>
                <Trans>{numberLabel}</Trans>
              </ThemedText.BodyPrimary>
            ) : undefined}

            <VotesNumberContainer>
              <ThemedText.BodyPrimary fontSize={isScreenSize.xs ? 20 : 16} fontWeight={500}>
                {chooseValue(voteOption)}
              </ThemedText.BodyPrimary>
            </VotesNumberContainer>
          </InnerButtonTextContainer>
        </ButtonContainer>
      ))}
    </VotingButtonsContainer>
  )
}
