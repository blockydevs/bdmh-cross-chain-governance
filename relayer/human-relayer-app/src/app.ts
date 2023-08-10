require('dotenv').config();

import {
    Environment,
    logging,
    missedVaas, Next,
    providers,
    StandardRelayerApp,
    StandardRelayerContext,
    wallets
} from "@wormhole-foundation/relayer-engine";
import * as spokeAbi from "../abis/DAOSpokeContract.json";
import * as hubAbi from "../abis/MetaHumanGovernor.json";
import {rootLogger} from "./log";

import {ChainId} from "@certusone/wormhole-sdk";
import {ApiController} from "./controller";

function getPrivateKeys() {
    const privateKeys: Partial<Record<ChainId, any[]>> = {};

    Object.keys(process.env)
        .filter(key => key.startsWith("PRIVATE_KEYS_CHAIN_"))
        .forEach(key => {
            const chainId = Number(key.replace("PRIVATE_KEYS_CHAIN_", "")) as ChainId;
            privateKeys[chainId] = [process.env[key] as string];
        });

    return privateKeys;
}

function getProvidersConfig() {
    return Object.keys(process.env)
        .filter(key => key.startsWith("PROVIDERS_CHAIN_"))
        .reduce((obj, key) => {
            const chainId = Number(key.replace("PROVIDERS_CHAIN_", "")) as ChainId;
            return {
                ...obj,
                [chainId]: {
                    endpoints: [process.env[key] as string]
                }
            };
        }, {});
}

async function main() {
    const privateKeys = getPrivateKeys();
    const providersConfig = getProvidersConfig();

    if (!Object.values(Environment).includes(process.env.ENVIRONMENT as Environment)) {
        throw new Error("Invalid environment");
    }

    const redisOpts = {
        host: "redis-docker",
        port: 6379
    };

    const app = new StandardRelayerApp<StandardRelayerContext>(
        process.env.ENVIRONMENT as Environment,
        {
            name: "HumanRelayerApp",
            spyEndpoint: "spy-docker:7073",
            redis: redisOpts
        },
    );

    const namespace = "human-relayer-app";

    const relayBusiness = new ApiController();

    app.logger(rootLogger);
    app.use(logging(rootLogger)); // <-- logging middleware
    app.use(missedVaas(app, { namespace: "simple", logger: rootLogger, redis: redisOpts }));

    app.use(providers({
        chains: providersConfig
    }));


    app.use(
        wallets(process.env.ENVIRONMENT as Environment, {
            privateKeys,
            namespace,
            logger: rootLogger
        })
    ); // <-- you need a valid private key to turn on this middleware

    //hub relay
    const chainName = Number(process.env.HUB_RELAY_CHAIN_ID) as ChainId;
    app.chain(chainName).address(
        process.env.HUB_RELAY_CHAIN_ADDRESS,
        // callback function to invoke on new message
        async(ctx, next) => {
            try {
                await relayBusiness.relayMessage(ctx, next, spokeAbi);
            } catch (error) {
                console.log(error);
            }
        }
    );

    //spoke relay
    Object.keys(process.env)
        .filter(key => key.startsWith("SPOKE_RELAY_CHAIN_"))
        .forEach(key => {
            const chainId = Number(key.replace("SPOKE_RELAY_CHAIN_", "")) as ChainId;
            app.chain(chainId).address(process.env[key] as string, async (ctx: StandardRelayerContext, next: Next) => {
                try {
                    await relayBusiness.relayMessage(ctx, next, hubAbi);
                } catch (error) {
                    console.log(error);
                }
            });
        });

    await app.listen();
};

main();

export { getPrivateKeys, getProvidersConfig, main };
