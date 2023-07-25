import { useLocation } from 'react-router-dom'

export function useIsNftPage() {
  const { pathname } = useLocation()
  return pathname.startsWith('/nfts')
}
