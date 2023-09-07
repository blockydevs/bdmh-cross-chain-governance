import { AddressMap } from 'constants/addresses'

export const extractAddressesFromJSON = (data: any[]) => {
  const governanceSpokeAddresses: AddressMap = {}
  const voteTokenAddresses: AddressMap = {}

  data.forEach((item) => {
    const chainId = parseInt(item.REACT_APP_SPOKE_CHAIN_ID, 10)

    governanceSpokeAddresses[chainId] = item.REACT_APP_GOVERNANCE_SPOKE_CHAIN
    voteTokenAddresses[chainId] = item.REACT_APP_GOVERNANCE_SPOKE_VOTE_TOKEN
  })

  return {
    governanceSpokeAddresses,
    voteTokenAddresses,
  }
}
