export const networks = {
    AVALANCHE: {
        address: process.env.AVALANCHE_SPOKE_ADDRESS,
        rpcUrl: process.env.AVALANCHE_RPC_URL,
        chainId: 6,
        name: "avalanche"
    },
    MOONBASE: {
        address: process.env.MOONBASE_SPOKE_ADDRESS,
        rpcUrl: process.env.MOONBASE_RPC_URL,
        chainId: 16,
        name: "moonbase"
    }
};

export const hub = {
    address: process.env.HUB_ADDRESS,
    rpcUrl: process.env.HUB_RPC_URL,
    name: process.env.HUB_CHAIN_NAME
}
