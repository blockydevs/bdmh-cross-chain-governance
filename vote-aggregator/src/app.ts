import express from 'express';
import { createClient } from "redis";
import Web3 from 'web3';
import ABI_JSON from './contract_abi.json';

const app = express();
const port = process.env.NODE_PORT;

const client = createClient({
    socket: {
        port: process.env.REDIS_PORT as unknown as number,
        host: process.env.REDIS_HOST,
    }
});

client.on('error', err => console.log('Redis Client Error', err));

const contractABI = ABI_JSON;
const proposalId = '25449999689643571276388587071524507364357037160987438732248865568045989309858';

const networks = {
    MUMBAI: {
        address: '0x95b49867E28F0F7553cAeb1365644a1861FEbFf3',
        rpcUrl: process.env.MUMBAI_RPC_URL,
        name: "mumbai"
    },
    AVALANCHE: {
        address: '0x75e9990D2b4CE167282BA2071f771f3248D3B9F9',
        rpcUrl: process.env.AVALANCHE_RPC_URL,
        name: "avalanche"
    },
    MOONBASE: {
        address: '0xF42e5eeFd8E2Fb3382732bF1e6a7A377FD2523CB',
        rpcUrl: process.env.MOONBASE_RPC_URL,
        name: "moonbase"
    }
};

(async () => {
    await client.connect();

    for (const net in networks) {
        const { address, rpcUrl, name } = networks[net];

        const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
        const contract = new web3.eth.Contract(contractABI, address);

        interface ProposalVoteResult {
            forVotes: string;
            againstVotes: string;
            abstainVotes: string;
        }

        // eslint-disable-next-line
        // @ts-ignore
        const result = await contract.methods.proposalVotes(proposalId).call() as ProposalVoteResult;

        const voteResults = {
            chain_name: name,
            for: result.forVotes,
            against: result.againstVotes,
            abstain: result.abstainVotes
        };

        await client.set(name, JSON.stringify(voteResults, replacer));
    }
})();

app.get('/', async (req, res) => {
    const results = [];

    for (const net in networks) {
        const data = await client.get(networks[net].name);
        if (data) {
            results.push(JSON.parse(data));
        }
    }

    res.json(results);
});

function replacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}

app.listen(port, () => {
    return console.log(`Express is listening on port ${port}`);
});
