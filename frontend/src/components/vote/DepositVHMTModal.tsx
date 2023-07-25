import { TransactionResponse } from '@ethersproject/abstract-provider'
import { Trans } from '@lingui/macro'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import ExchangeHmtInput from 'components/ExchangeHmtInput/ExchangeHmtInput'
import GrayCloseButton from 'components/GrayCloseButton/GrayCloseButton'
import { parseUnits } from 'ethers/lib/utils'
import { useIsMobile } from 'nft/hooks'
import { ReactNode, useCallback, useState } from 'react'
import { X } from 'react-feather'
import { useUniContract } from 'state/governance/hooks'
import { ExchangeInputErrors } from 'state/governance/types'
import { useTransactionAdder } from 'state/transactions/hooks'
import { TransactionType } from 'state/transactions/types'
import styled, { useTheme } from 'styled-components/macro'
import { swapErrorToUserReadableMessage } from 'utils/swapErrorToUserReadableMessage'

import { ThemedText } from '../../theme'
import { ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import Modal from '../Modal'
import { LoadingView, SubmittedView, SubmittedWithErrorView } from '../ModalViews'
import { RowBetween } from '../Row'

const ContentWrapper = styled(AutoColumn)<{ padding?: boolean }>`
  width: 100%;
  padding: ${({ padding }) => (padding ? '24px' : '24px 0')};
  text-align: center;
`

const ModalViewWrapper = styled('div')`
  width: 100%;
  padding-top: 16px;
`

const StyledClosed = styled(X)`
  :hover {
    cursor: pointer;
  }

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.sm}px`}) {
    display: none;
  }
`

interface DepositVHMTProps {
  isOpen: boolean
  onDismiss: () => void
  title: ReactNode
  uniBalance: CurrencyAmount<Token> | undefined
}

export default function DepositVHMTModal({ isOpen, onDismiss, title, uniBalance }: DepositVHMTProps) {
  const { account } = useWeb3React()
  const uniContract = useUniContract()
  const userVHMTBalanceAmount =
    uniBalance && Number(uniBalance.toExact()) < 1
      ? Number(uniBalance.toExact()).toFixed(18)
      : uniBalance && Number(uniBalance.toExact())

  const addTransaction = useTransactionAdder()

  const theme = useTheme()

  const [attempting, setAttempting] = useState(false)
  const [currencyToExchange, setCurrencyToExchange] = useState<string>('')
  const [withdrawToHash, setWithdrawToHash] = useState<string | undefined>()
  const [validationInputError, setValidationInputError] = useState<string>('')
  const [error, setError] = useState<string>('')
  const isMobile = useIsMobile()

  // wrapper to reset state on modal close
  function wrappedOnDismiss() {
    setWithdrawToHash(undefined)
    setError('')
    setValidationInputError('')
    setAttempting(false)
    onDismiss()
  }

  function onInputHmtExchange(value: string) {
    setCurrencyToExchange(value)
    setValidationInputError('')
  }

  function onInputMaxExchange(maxValue: string | undefined) {
    maxValue && setCurrencyToExchange(maxValue)
    setValidationInputError('')
  }

  const transactionAdder = useCallback(
    (response: TransactionResponse, convertedCurrency: string) => {
      addTransaction(response, {
        type: TransactionType.EXCHANGE_CURRENCY,
        spender: account,
        currencyAmount: convertedCurrency,
      })
    },
    [account, addTransaction]
  )

  async function onWithdrawToVHMTSubmit() {
    if (!uniContract) return
    if (currencyToExchange.length === 0 || currencyToExchange === '0') {
      setValidationInputError(ExchangeInputErrors.EMPTY_INPUT)
      setAttempting(false)
      return
    }
    if (userVHMTBalanceAmount && userVHMTBalanceAmount < currencyToExchange) {
      setValidationInputError(ExchangeInputErrors.EXCEEDS_BALANCE)
      setAttempting(false)
      return
    }

    const convertedCurrency = parseUnits(currencyToExchange, Number(uniBalance?.currency.decimals)).toString()

    try {
      setAttempting(true)
      const response = await uniContract.withdrawTo(account, convertedCurrency)
      transactionAdder(response, currencyToExchange)
      setWithdrawToHash(response ? response.hash : undefined)
    } catch (error) {
      setError(error)
      setAttempting(false)
    }
  }

  const isDepositError = !attempting && Boolean(error)

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !withdrawToHash && isOpen && !error && (
        <ContentWrapper gap="lg" padding={true}>
          <GrayCloseButton onClick={wrappedOnDismiss} />
          <AutoColumn gap="lg" justify="center">
            <RowBetween textAlign="center">
              <ThemedText.DeprecatedMediumHeader fontWeight={500} width="100%" marginBottom={isMobile ? 16 : 0}>
                {title}
              </ThemedText.DeprecatedMediumHeader>
              <StyledClosed stroke={theme.textPrimary} onClick={wrappedOnDismiss} />
            </RowBetween>
            <RowBetween>
              <ThemedText.BodySecondary>
                <Trans>vHMT balance: {userVHMTBalanceAmount}</Trans>
              </ThemedText.BodySecondary>
            </RowBetween>
            <ExchangeHmtInput
              value={currencyToExchange}
              maxValue={uniBalance?.toExact()}
              onChange={onInputHmtExchange}
              onMaxChange={onInputMaxExchange}
              error={validationInputError}
              className="hmt-withdraw-input"
            />
            <ButtonPrimary disabled={!!error} onClick={onWithdrawToVHMTSubmit}>
              <ThemedText.DeprecatedMediumHeader color="white">
                <Trans>Confirm</Trans>
              </ThemedText.DeprecatedMediumHeader>
            </ButtonPrimary>
          </AutoColumn>
        </ContentWrapper>
      )}
      {attempting && !withdrawToHash && !validationInputError && (
        <ContentWrapper>
          <GrayCloseButton onClick={wrappedOnDismiss} />
          <LoadingView onDismiss={wrappedOnDismiss}>
            <AutoColumn gap="md" justify="center">
              <ThemedText.HeadlineSmall fontWeight={500} textAlign="center">
                Confirm this transaction in your wallet
              </ThemedText.HeadlineSmall>
            </AutoColumn>
          </LoadingView>
        </ContentWrapper>
      )}
      {attempting && withdrawToHash && (
        <ModalViewWrapper>
          <GrayCloseButton onClick={wrappedOnDismiss} />
          <SubmittedView onDismiss={wrappedOnDismiss} hash={withdrawToHash}>
            <AutoColumn gap="md" justify="center">
              <ThemedText.DeprecatedLargeHeader
                width="100%"
                textAlign="center"
                fontSize={isMobile ? 20 : 36}
                fontWeight={isMobile ? 500 : 600}
              >
                <Trans>Transaction Submitted</Trans>
              </ThemedText.DeprecatedLargeHeader>
            </AutoColumn>
          </SubmittedView>
        </ModalViewWrapper>
      )}
      {isDepositError && (
        <ModalViewWrapper>
          <GrayCloseButton onClick={wrappedOnDismiss} />
          <SubmittedWithErrorView onDismiss={wrappedOnDismiss}>
            <AutoColumn justify="center">
              <ContentWrapper gap="10px">
                <ThemedText.DeprecatedError
                  error={!!error}
                  fontSize={isMobile ? 20 : 34}
                  fontWeight={isMobile ? 500 : 600}
                >
                  {swapErrorToUserReadableMessage(error)}
                </ThemedText.DeprecatedError>
              </ContentWrapper>

              {error && (
                <ThemedText.BodySmall fontSize={16}>
                  <Trans>Unable to execute transaction</Trans>
                </ThemedText.BodySmall>
              )}
            </AutoColumn>
          </SubmittedWithErrorView>
        </ModalViewWrapper>
      )}
    </Modal>
  )
}
