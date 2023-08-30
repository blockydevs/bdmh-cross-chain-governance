import {client} from '../config/redis';
import {hub, networks} from '../config/web3';
import Web3 from 'web3';
import HUB_ABI_JSON from '../governance-hub.json';
import SPOKE_ABI_JSON from '../governance-spoke.json';
import {replacer} from '../utils/replacer';

const hubContractABI = HUB_ABI_JSON;
const spokeContractABI = SPOKE_ABI_JSON;

interface ProposalVoteResult {
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
}

export const fetchProposalData = async (proposalId) => {
    const exists = await client.exists(proposalId);

    if (exists) {
        return await client.get(proposalId);
    } else {
        return await fetchProposalVotesFromNetworks(proposalId);
    }
};

async function fetchProposalVotesFromNetworks(proposalId) {
    const results = [];
    const web3 = new Web3(new Web3.providers.HttpProvider(hub.rpcUrl));
    const hubContract = new web3.eth.Contract(hubContractABI, hub.address);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const hubVotes = await hubContract.methods.proposalVotes(proposalId).call() as ProposalVoteResult;
    results.push({
        chain_name: hub.name,
        for: hubVotes.forVotes.toString(),
        against: hubVotes.againstVotes.toString(),
        abstain: hubVotes.abstainVotes.toString()
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (await hubContract.methods.collectionFinished(proposalId).call()) {
        const finalResult = JSON.stringify(results, replacer);
        await client.set(proposalId, finalResult);

        return finalResult;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (await hubContract.methods.collectionStarted(proposalId).call()) {
        //TODO to implement
    }

    for (const net in networks) {
        results.push(await fetchVotesFromSpokes(net, proposalId));
    }

    const finalResult = JSON.stringify(results, replacer);
    await client.set(proposalId, finalResult);
    await client.expire(proposalId, Number(process.env.REDIS_EXPIRATION_TIME_IN_SEC));

    return finalResult;
}

async function fetchVotesFromSpokes(net: string, proposalId) {
    const {address, rpcUrl, name} = networks[net];
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
    const spokeContract = new web3.eth.Contract(spokeContractABI, address);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = await spokeContract.methods.proposalVotes(proposalId).call() as ProposalVoteResult;

    return {
        chain_name: name,
        for: BigInt(result.forVotes).toString(),
        against: BigInt(result.againstVotes).toString(),
        abstain: BigInt(result.abstainVotes).toString()
    };
}