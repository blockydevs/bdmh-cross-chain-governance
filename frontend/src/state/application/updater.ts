import { useWeb3React } from '@web3-react/core'
import { HUB_CHAIN_ID } from 'constants/addresses'
import useDebounce from 'hooks/useDebounce'
import useIsWindowVisible from 'hooks/useIsWindowVisible'
import { useEffect, useRef, useState } from 'react'
import { useAppDispatch } from 'state/hooks'
import { supportedChainId } from 'utils/supportedChainId'

import { useCloseModal } from './hooks'
import { setIsHubChainActive, updateChainId } from './reducer'

export default function Updater(): null {
  const { account, chainId, provider } = useWeb3React()
  const dispatch = useAppDispatch()
  const windowVisible = useIsWindowVisible()

  const [activeChainId, setActiveChainId] = useState(chainId)

  const closeModal = useCloseModal()
  const previousAccountValue = useRef(account)
  const isHubChainActive = activeChainId === HUB_CHAIN_ID

  useEffect(() => {
    if (account && account !== previousAccountValue.current) {
      previousAccountValue.current = account
      closeModal()
    }
  }, [account, closeModal])

  useEffect(() => {
    if (provider && chainId && windowVisible) {
      setActiveChainId(chainId)
    }
  }, [dispatch, chainId, provider, windowVisible])

  const debouncedChainId = useDebounce(activeChainId, 100)

  useEffect(() => {
    const chainId = debouncedChainId ? supportedChainId(debouncedChainId) ?? null : null
    dispatch(updateChainId({ chainId }))
    dispatch(setIsHubChainActive(isHubChainActive))
  }, [dispatch, debouncedChainId, isHubChainActive])

  return null
}
