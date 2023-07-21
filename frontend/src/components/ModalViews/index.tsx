import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import { CheckCircle, XCircle } from 'react-feather'
import styled, { useTheme } from 'styled-components/macro'

import Circle from '../../assets/images/blue-loader.svg'
import { CloseIcon, CustomLightSpinner, ThemedText } from '../../theme'
import { ExternalLink } from '../../theme/components'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import { AutoColumn, ColumnCenter } from '../Column'
import { RowBetween } from '../Row'

const StyledRowBetween = styled(RowBetween)`
  > div:nth-child(1) {
    display: flex;
    justify-content: center;
    width: 100%;
    font-size: 28px;

    @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.xs}px`}) {
      font-size: 24px;
    }
  }
`

const ConfirmOrLoadingWrapper = styled.div`
  width: 100%;
  padding: 24px;
  margin-bottom: 24px;
`

const CloseIconWrapper = styled('div')`
  display: block;
  margin-left: 20px;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    display: none;
  }
`

const ConfirmedIcon = styled(ColumnCenter)`
  padding: 47px 0 47px 0;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    padding: 20px 0;
  }
`

export function LoadingView({ children, onDismiss }: { children: any; onDismiss: () => void }) {
  return (
    <ConfirmOrLoadingWrapper>
      <StyledRowBetween>
        <ThemedText.HeadlineLarge>
          <Trans>Submitting Vote</Trans>
        </ThemedText.HeadlineLarge>

        <CloseIconWrapper>
          <CloseIcon onClick={onDismiss} />
        </CloseIconWrapper>
      </StyledRowBetween>

      <ConfirmedIcon>
        <CustomLightSpinner src={Circle} alt="loader" size="90px" />
      </ConfirmedIcon>
      <AutoColumn gap="100px" justify="center">
        {children}
      </AutoColumn>
    </ConfirmOrLoadingWrapper>
  )
}

export function SubmittedView({
  children,
  onDismiss,
  hash,
}: {
  children: any
  onDismiss: () => void
  hash: string | undefined
}) {
  const theme = useTheme()
  const { chainId } = useWeb3React()

  return (
    <ConfirmOrLoadingWrapper>
      <RowBetween>
        <div />
        <CloseIcon onClick={onDismiss} />
      </RowBetween>
      <ConfirmedIcon>
        <CheckCircle strokeWidth={0.5} size={90} color={theme.accentSuccess} />
      </ConfirmedIcon>
      <AutoColumn gap="100px" justify="center">
        {children}
        {chainId && hash && (
          <ExternalLink
            href={getExplorerLink(chainId, hash, ExplorerDataType.TRANSACTION)}
            style={{ marginLeft: '4px' }}
          >
            <ThemedText.DeprecatedSubHeader>
              <Trans>View transaction on Explorer</Trans>
            </ThemedText.DeprecatedSubHeader>
          </ExternalLink>
        )}
      </AutoColumn>
    </ConfirmOrLoadingWrapper>
  )
}

export function SubmittedWithErrorView({ children, onDismiss }: { children: any; onDismiss: () => void }) {
  const theme = useTheme()

  return (
    <ConfirmOrLoadingWrapper>
      <AutoColumn gap="30px" justify="center">
        <RowBetween>
          <div />
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
        <ColumnCenter>
          <XCircle strokeWidth={0.5} size={90} color={theme.accentFailure} />
        </ColumnCenter>

        {children}
      </AutoColumn>
    </ConfirmOrLoadingWrapper>
  )
}
