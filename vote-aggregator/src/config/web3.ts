const networks = {
    MUMBAI: {
        addresses: process.env.MUMBAI_SPOKE_CHAIN.split(','),
        rpcUrl: process.env.MUMBAI_RPC_URL,
        name: "mumbai"
    },
    AVALANCHE: {
        addresses: process.env.AVALANCHE_SPOKE_CHAIN.split(','),
        rpcUrl: process.env.AVALANCHE_RPC_URL,
        name: "avalanche"
    },
    MOONBASE: {
        addresses: process.env.MOONBASE_SPOKE_CHAIN.split(','),
        rpcUrl: process.env.MOONBASE_RPC_URL,
        name: "moonbase"
    }
};

export default networks;
