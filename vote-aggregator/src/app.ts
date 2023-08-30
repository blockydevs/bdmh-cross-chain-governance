import express from 'express';
import { createClient } from "redis";
import Web3 from 'web3';
import ABI_JSON from './contract_abi.json';

const app = express();
const port = process.env.NODE_PORT || 3000;

const client = createClient({
    socket: {
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
    }
});

client.on('error', err => console.log('Redis Client Error', err));

const contractABI = ABI_JSON;

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

app.get('/proposal', async (req, res) => {
    const proposalId = req.query.id;

    if (!proposalId) {
        return res.status(400).send('proposalId is required.');
    }

    const results = [];

    for (const net in networks) {
        const { addresses, rpcUrl, name } = networks[net];
        const redisKey = `${name}_${proposalId}`;

        const exists = await client.exists(redisKey);

        if (exists) {
            const data = await client.get(redisKey);
            if (data) {
                results.push(JSON.parse(data));
            }
        } else {
            let totalFor = BigInt(0);
            let totalAgainst = BigInt(0);
            let totalAbstain = BigInt(0);

            const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

            for (const address of addresses) {
                const contract = new web3.eth.Contract(contractABI, address);

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const result = await contract.methods.proposalVotes(proposalId).call() as ProposalVoteResult;

                totalFor += BigInt(result.forVotes);
                totalAgainst += BigInt(result.againstVotes);
                totalAbstain += BigInt(result.abstainVotes);
            }

            const voteResults = {
                chain_name: name,
                for: totalFor.toString(),
                against: totalAgainst.toString(),
                abstain: totalAbstain.toString()
            };

            await client.set(redisKey, JSON.stringify(voteResults, replacer));
            await client.expire(redisKey, Number(process.env.REDIS_EXPIRATION_TIME_IN_SEC));

            results.push(voteResults);
        }
    }

    res.send(JSON.stringify(results, replacer));
});

function replacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}

app.listen(port, () => {
    console.log(`Express is listening on port ${port}`);
});

(async () => {
    await client.connect();
})();
