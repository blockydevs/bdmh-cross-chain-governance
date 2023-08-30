import { client } from '../config/redis';
import networks from '../config/web3';
import Web3 from 'web3';
import ABI_JSON from '../contract_abi.json';
import { replacer } from '../utils/replacer';

const contractABI = ABI_JSON;

export const fetchProposalData = async (proposalId) => {
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

    return JSON.stringify(results, replacer);
};
