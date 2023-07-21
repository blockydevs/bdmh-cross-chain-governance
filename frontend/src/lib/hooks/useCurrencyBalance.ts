import { BigNumber } from '@ethersproject/bignumber'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import JSBI from 'jsbi'
import { useSingleContractMultipleData } from 'lib/hooks/multicall'
import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useHMTUniContract, useUniContract } from 'state/governance/hooks'
import { useAppSelector } from 'state/hooks'

import { nativeOnChain } from '../../constants/tokens'
import { useInterfaceMulticall } from '../../hooks/useContract'
import { isAddress } from '../../utils'

/**
 * Returns a map of the given addresses to their eventually consistent ETH balances.
 */
export function useNativeCurrencyBalances(uncheckedAddresses?: (string | undefined)[]): {
  [address: string]: CurrencyAmount<Currency> | undefined
} {
  const { chainId } = useWeb3React()
  const multicallContract = useInterfaceMulticall()

  const validAddressInputs: [string][] = useMemo(
    () =>
      uncheckedAddresses
        ? uncheckedAddresses
            .map(isAddress)
            .filter((a): a is string => a !== false)
            .sort()
            .map((addr) => [addr])
        : [],
    [uncheckedAddresses]
  )

  const results = useSingleContractMultipleData(multicallContract, 'getEthBalance', validAddressInputs)

  return useMemo(
    () =>
      validAddressInputs.reduce<{ [address: string]: CurrencyAmount<Currency> }>((memo, [address], i) => {
        const value = results?.[i]?.result?.[0]
        if (value && chainId)
          memo[address] = CurrencyAmount.fromRawAmount(nativeOnChain(chainId), JSBI.BigInt(value.toString()))
        return memo
      }, {}),
    [validAddressInputs, chainId, results]
  )
}

// Returns HMT token
export function useHmtContractToken() {
  const uniContract = useUniContract()
  const { account, chainId } = useWeb3React()

  const [hmtToken, setHmtToken] = useState<Token | undefined>(undefined)

  useEffect(() => {
    const fetchUnderlyingAddress = async () => {
      try {
        if (uniContract && account) {
          // BLOCKYTODO: find out why uniContract.underlying() is throwing out an error or maybe it's something else?
          const address = await uniContract.underlying()
          const hmtToken = address && chainId && new Token(chainId, address, 18, 'HMT', 'Human')
          setHmtToken(hmtToken)
        }
      } catch (error) {
        console.log(error)
      }
    }

    fetchUnderlyingAddress()
  }, [uniContract, account, chainId])

  return hmtToken
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useTokenBalancesWithLoadingIndicator(
  address?: string,
  tokens?: (Token | undefined)[]
): [{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }, boolean] {
  const [vhmtBalance, setVhmtBalance] = useState<BigNumber[]>([])
  const [hmtBalance, setHmtBalance] = useState<BigNumber[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const { account, chainId } = useWeb3React() // we cannot fetch balances cross-chain
  const dispatch = useDispatch()

  const uniContract = useUniContract()
  const hmtUniContract = useHMTUniContract()
  const transactions = useAppSelector((state) => state.transactions)

  const validatedTokens: Token[] = useMemo(
    () => tokens?.filter((t?: Token): t is Token => isAddress(t?.address) !== false && t?.chainId === chainId) ?? [],
    [chainId, tokens]
  )

  useEffect(() => {
    const fetchBalance = async () => {
      setIsLoading(true)
      if (uniContract && hmtUniContract) {
        try {
          const resultVHMT = await uniContract.functions.balanceOf(account)
          const resultHMT = await hmtUniContract.functions.balanceOf(account)

          if (resultVHMT) setVhmtBalance(resultVHMT)
          if (resultHMT) setHmtBalance(resultHMT)
        } catch (error) {
          console.log(error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchBalance()
  }, [account, uniContract, hmtUniContract, dispatch, transactions])

  return useMemo(
    () => [
      address && validatedTokens.length > 0
        ? validatedTokens.reduce<{ [tokenAddress: string]: CurrencyAmount<Token> | undefined }>((memo, token) => {
            const amount = vhmtBalance ? JSBI.BigInt(vhmtBalance.toString()) : undefined
            const hmtAmount = hmtBalance ? JSBI.BigInt(hmtBalance.toString()) : undefined

            if (amount) {
              memo[token.address] = CurrencyAmount.fromRawAmount(token, amount)
            }

            if (hmtAmount && hmtUniContract) {
              memo[hmtUniContract.address] = CurrencyAmount.fromRawAmount(token, hmtAmount)
            }
            return memo
          }, {})
        : {},
      isLoading,
    ],
    [address, validatedTokens, isLoading, vhmtBalance, hmtBalance, hmtUniContract]
  )
}

export function useTokenBalances(
  address?: string,
  tokens?: (Token | undefined)[]
): { [tokenAddress: string]: CurrencyAmount<Token> | undefined } {
  return useTokenBalancesWithLoadingIndicator(address, tokens)[0]
}

// get the balance for a single token/account combo
export function useTokenBalance(account?: string, token?: Token): CurrencyAmount<Token> | undefined {
  const tokenBalances = useTokenBalances(
    account,
    useMemo(() => [token], [token])
  )
  if (!token) return undefined
  return tokenBalances[token.address]
}

export function useCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[]
): (CurrencyAmount<Currency> | undefined)[] {
  const tokens = useMemo(
    () => currencies?.filter((currency): currency is Token => currency?.isToken ?? false) ?? [],
    [currencies]
  )

  const { chainId } = useWeb3React()
  const tokenBalances = useTokenBalances(account, tokens)
  const containsETH: boolean = useMemo(() => currencies?.some((currency) => currency?.isNative) ?? false, [currencies])
  const ethBalance = useNativeCurrencyBalances(useMemo(() => (containsETH ? [account] : []), [containsETH, account]))

  return useMemo(
    () =>
      currencies?.map((currency) => {
        if (!account || !currency || currency.chainId !== chainId) return undefined
        if (currency.isToken) return tokenBalances[currency.address]
        if (currency.isNative) return ethBalance[account]
        return undefined
      }) ?? [],
    [account, chainId, currencies, ethBalance, tokenBalances]
  )
}

export default function useCurrencyBalance(
  account?: string,
  currency?: Currency
): CurrencyAmount<Currency> | undefined {
  return useCurrencyBalances(
    account,
    useMemo(() => [currency], [currency])
  )[0]
}
