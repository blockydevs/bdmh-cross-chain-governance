import { SupportedChainId } from 'constants/chains'

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY
if (typeof INFURA_KEY === 'undefined') {
  throw new Error(`REACT_APP_INFURA_KEY must be a defined environment variable`)
}
const QUICKNODE_RPC_URL = 'https://rough-sleek-hill.bsc.quiknode.pro/413cc98cbc776cda8fdf1d0f47003583ff73d9bf'
if (typeof QUICKNODE_RPC_URL === 'undefined') {
  throw new Error(`REACT_APP_BNB_RPC_URL must be a defined environment variable`)
}

const allChainIds = Object.values(SupportedChainId)
  .filter((id) => typeof id === 'number')
  .map(String)

const RPC_URLS_FROM_ENV: { [key: string]: string | undefined } = {}

for (const chainId of allChainIds) {
  RPC_URLS_FROM_ENV[chainId] = process.env[`REACT_APP_RPC_URL_${chainId}`]
}

/**
 * Fallback JSON-RPC endpoints.
 * These are used if the integrator does not provide an endpoint, or if the endpoint does not work.
 *
 * MetaMask allows switching to any URL, but displays a warning if it is not on the "Safe" list:
 * https://github.com/MetaMask/metamask-mobile/blob/bdb7f37c90e4fc923881a07fca38d4e77c73a579/app/core/RPCMethods/wallet_addEthereumChain.js#L228-L235
 * https://chainid.network/chains.json
 *
 * These "Safe" URLs are listed first, followed by other fallback URLs, which are taken from chainlist.org.
 */
export const FALLBACK_URLS = {
  [SupportedChainId.ETHEREUM]: [
    // "Safe" URLs
    'https://api.mycryptoapi.com/eth',
    'https://cloudflare-eth.com',
    // "Fallback" URLs
    'https://rpc.ankr.com/eth',
    'https://eth-mainnet.public.blastapi.io',
  ],
  [SupportedChainId.GOERLI]: [
    // "Safe" URLs
    'https://rpc.goerli.mudit.blog/',
    // "Fallback" URLs
    'https://rpc.ankr.com/eth_goerli',
  ],
  [SupportedChainId.POLYGON]: [
    // "Safe URLs"

    // "Fallback" URLs
    'https://polygon-rpc.com/',
    'https://rpc-mainnet.matic.network',
    'https://matic-mainnet.chainstacklabs.com',
    'https://rpc-mainnet.maticvigil.com',
    'https://rpc-mainnet.matic.quiknode.pro',
    'https://matic-mainnet-full-rpc.bwarelabs.com',
  ],
  [SupportedChainId.POLYGON_MUMBAI]: [
    // "Safe" URLs
    'https://rpc-mumbai.maticvigil.com',
    'https://matic-testnet-archive-rpc.bwarelabs.com',
  ],
  [SupportedChainId.ARBITRUM_ONE]: [
    // "Safe" URLs
    'https://arb1.arbitrum.io/rpc',
    // "Fallback" URLs
    'https://arbitrum.public-rpc.com',
  ],
  [SupportedChainId.ARBITRUM_GOERLI]: [
    // "Safe" URLs
    'https://goerli-rollup.arbitrum.io/rpc',
  ],
  [SupportedChainId.OPTIMISM]: [
    // "Safe" URLs
    'https://mainnet.optimism.io/',
    // "Fallback" URLs
    'https://rpc.ankr.com/optimism',
  ],
  [SupportedChainId.OPTIMISM_GOERLI]: [
    // "Safe" URLs
    'https://goerli.optimism.io',
  ],
  [SupportedChainId.CELO]: [
    // "Safe" URLs
    `https://forno.celo.org`,
  ],
  [SupportedChainId.CELO_ALFAJORES]: [
    // "Safe" URLs
    `https://alfajores-forno.celo-testnet.org`,
  ],
  [SupportedChainId.BNB]: [
    // "Safe" URLs
    'https://endpoints.omniatech.io/v1/bsc/mainnet/public',
    'https://bsc-mainnet.gateway.pokt.network/v1/lb/6136201a7bad1500343e248d',
    'https://1rpc.io/bnb',
    'https://bsc-dataseed3.binance.org',
    'https://bsc-dataseed2.defibit.io',
    'https://bsc-dataseed1.ninicoin.io',
    'https://binance.nodereal.io',
    'https://bsc-dataseed4.defibit.io',
    'https://rpc.ankr.com/bsc',
  ],
  [SupportedChainId.BNB_TESTNET]: [
    // "Safe" URLs
    'https://bsc-testnet.publicnode.com',
  ],
  [SupportedChainId.MOONBEAM]: [
    // "Safe" URLs
    'https://moonbeam.public.blastapi.io',
  ],
  [SupportedChainId.MOONBASE]: [
    // "Safe" URLs
    'https://moonbase-alpha.public.blastapi.io',
  ],
  [SupportedChainId.AVALANCHE]: [
    // "Safe" URLs
    'https://rpc.ankr.com/avalanche',
  ],
  [SupportedChainId.AVALANCHE_FUJI]: [
    // "Safe" URLs
    'https://avalanche-fuji-c-chain.publicnode.com',
  ],
  [SupportedChainId.SEPOLIA]: [
    // "Safe" URLs
    'https://rpc.sepolia.org',
    'https://rpc2.sepolia.org',
    'https://rpc-sepolia.rockx.com',
  ],
}

/**
 * Known JSON-RPC endpoints.
 * These are the URLs used by the interface when there is not another available source of chain data.
 */
// export const RPC_URLS = {
//   [SupportedChainId.SEPOLIA]: [RPC_URLS_FROM_ENV[SupportedChainId.SEPOLIA], ...FALLBACK_URLS[SupportedChainId.SEPOLIA]],

//   [SupportedChainId.ETHEREUM]: [
//     `https://mainnet.infura.io/v3/${INFURA_KEY}`,
//     ...FALLBACK_URLS[SupportedChainId.ETHEREUM],
//   ],
//   [SupportedChainId.GOERLI]: [`https://goerli.infura.io/v3/${INFURA_KEY}`, ...FALLBACK_URLS[SupportedChainId.GOERLI]],
//   [SupportedChainId.OPTIMISM]: [
//     `https://optimism-mainnet.infura.io/v3/${INFURA_KEY}`,
//     ...FALLBACK_URLS[SupportedChainId.OPTIMISM],
//   ],
//   [SupportedChainId.OPTIMISM_GOERLI]: [
//     `https://optimism-goerli.infura.io/v3/${INFURA_KEY}`,
//     ...FALLBACK_URLS[SupportedChainId.OPTIMISM_GOERLI],
//   ],
//   [SupportedChainId.ARBITRUM_ONE]: [
//     `https://arbitrum-mainnet.infura.io/v3/${INFURA_KEY}`,
//     ...FALLBACK_URLS[SupportedChainId.ARBITRUM_ONE],
//   ],
//   [SupportedChainId.ARBITRUM_GOERLI]: [
//     `https://arb-goerli.g.alchemy.com/v2/2axGqs0i7fENYBPFwwq9ETskzklDk-Jr`,
//     ...FALLBACK_URLS[SupportedChainId.ARBITRUM_GOERLI],
//   ],
//   [SupportedChainId.POLYGON]: [
//     `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
//     ...FALLBACK_URLS[SupportedChainId.POLYGON],
//   ],
//   [SupportedChainId.POLYGON_MUMBAI]: [
//     process.env.REACT_APP_SPOKE_RPC_URL_,
//     ...FALLBACK_URLS[SupportedChainId.POLYGON_MUMBAI],
//   ],
//   [SupportedChainId.CELO]: FALLBACK_URLS[SupportedChainId.CELO],
//   [SupportedChainId.CELO_ALFAJORES]: FALLBACK_URLS[SupportedChainId.CELO_ALFAJORES],
//   [SupportedChainId.BNB]: [QUICKNODE_RPC_URL, ...FALLBACK_URLS[SupportedChainId.BNB]],
//   [SupportedChainId.BNB_TESTNET]: [
//     'https://bsc-testnet.public.blastapi.io',
//     'https://bsc-testnet.publicnode.com',
//     ...FALLBACK_URLS[SupportedChainId.BNB_TESTNET],
//   ],
//   [SupportedChainId.MOONBEAM]: ['https://moonbeam.public.blastapi.io', ...FALLBACK_URLS[SupportedChainId.MOONBEAM]],
//   [SupportedChainId.MOONBASE]: [
//     'https://moonbase-alpha.public.blastapi.io',
//     ...FALLBACK_URLS[SupportedChainId.MOONBASE],
//   ],
//   [SupportedChainId.AVALANCHE]: ['https://rpc.ankr.com/avalanche', ...FALLBACK_URLS[SupportedChainId.AVALANCHE]],
//   [SupportedChainId.AVALANCHE_FUJI]: [
//     'https://endpoints.omniatech.io/v1/avax/fuji/public',
//     ...FALLBACK_URLS[SupportedChainId.AVALANCHE_FUJI],
//   ],
// }

export const RPC_URLS: { [key: string]: string[] } = {}

for (const chainId of allChainIds) {
  const numChainId = Number(chainId)
  const envUrl = RPC_URLS_FROM_ENV[numChainId as keyof typeof RPC_URLS_FROM_ENV] || ''
  const fallbackUrls = FALLBACK_URLS[numChainId as keyof typeof FALLBACK_URLS] || []
  RPC_URLS[chainId] = envUrl.length > 0 ? [envUrl, ...fallbackUrls] : [...fallbackUrls]
}

console.log('RPC_URLS:', RPC_URLS)
