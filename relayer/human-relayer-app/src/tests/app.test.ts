import {getPrivateKeys, getProvidersConfig, main} from "../app";
import {ChainId} from "@certusone/wormhole-sdk";

const {StandardRelayerApp} = require("@wormhole-foundation/relayer-engine");

const mockApp = {
    use: jest.fn(),
    logger: jest.fn(),
    chain: jest.fn().mockReturnThis(),
    address: jest.fn(),
    listen: jest.fn(),
};

jest.mock("@wormhole-foundation/relayer-engine", () => ({
    StandardRelayerApp: jest.fn().mockImplementation(() => mockApp),
    Environment: {
        VALID_ENVIRONMENT: "VALID_ENVIRONMENT",
    },
    logging: jest.fn(),
    missedVaas: jest.fn(),
    providers: jest.fn(),
    wallets: jest.fn(),
}));

jest.mock("../controller", () => ({
    ApiController: jest.fn().mockImplementation(() => ({
        relayMessage: jest.fn(),
    })),
}));

describe("main function", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";

        process.env.ENVIRONMENT = "VALID_ENVIRONMENT";

        process.env.HUB_RELAY_CHAIN_ID = "1";
        process.env.HUB_RELAY_CHAIN_ADDRESS = "address1";

        process.env.SPOKE_RELAY_CHAIN_2 = "spoke2";
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.NODE_ENV;
    });

    it("should set environment variables correctly", async () => {
        await main();
        expect(process.env.ENVIRONMENT).toEqual("VALID_ENVIRONMENT");
        expect(process.env.HUB_RELAY_CHAIN_ID).toEqual("1");
        expect(process.env.HUB_RELAY_CHAIN_ADDRESS).toEqual("address1");
        expect(process.env.SPOKE_RELAY_CHAIN_2).toEqual("spoke2");
    });

    it("should throw an error when invalid environment is provided", async () => {
        process.env.ENVIRONMENT = "INVALID_ENVIRONMENT";
        await expect(main()).rejects.toThrow("Invalid environment");
    });

    it("should create an instance of StandardRelayerApp", async () => {
        await main();
        expect(StandardRelayerApp), expect.any(Object);
    });

    it("should use logger, missedVaas, providers, wallets, and call listen", async () => {
        await main();
        expect(mockApp.use).toHaveBeenCalledTimes(4);
        expect(mockApp.logger).toHaveBeenCalled();
        expect(mockApp.listen).toHaveBeenCalled();
    });

    it("should properly configure hub and spoke relay", async () => {
        await main();

        const hubChainId = Number(process.env.HUB_RELAY_CHAIN_ID) as ChainId;
        expect(mockApp.chain).toHaveBeenCalledWith(hubChainId);
        expect(mockApp.address).toHaveBeenCalledWith(process.env.HUB_RELAY_CHAIN_ADDRESS, expect.any(Function));

        const spokeKeys = Object.keys(process.env)
            .filter(key => key.startsWith("SPOKE_RELAY_CHAIN_"));

        spokeKeys.forEach(key => {
            const chainId = Number(key.replace("SPOKE_RELAY_CHAIN_", "")) as ChainId;
            expect(mockApp.chain).toHaveBeenCalledWith(chainId);
            expect(mockApp.address).toHaveBeenCalledWith(process.env[key] as string, expect.any(Function));
        });

        expect(mockApp.address).toHaveBeenCalledTimes(1 + spokeKeys.length);  //1 for hub
    });

    it("should use default values when REDIS_HOST environment variable is missing", async () => {
        delete process.env.REDIS_HOST;
        await main();
        expect(StandardRelayerApp).toHaveBeenCalledWith(
            "VALID_ENVIRONMENT",
            expect.objectContaining({
                redis: { host: "redis-docker", port: 6379 },
            })
        );
    });
    it("should use default values when SPY_HOST environment variable is missing", async () => {
        delete process.env.SPY_HOST;
        await main();
        expect(StandardRelayerApp).toHaveBeenCalledWith(
            "VALID_ENVIRONMENT",
            expect.objectContaining({
                spyEndpoint: "spy-docker:7073",
            })
        );
    });
});

describe('getPrivateKeys function', () => {
    let expectedKeys: Partial<Record<ChainId, any[]>>;

    beforeEach(() => {
        process.env.NODE_ENV = "test";

        process.env.PRIVATE_KEYS_CHAIN_1 = 'key1';
        process.env.PRIVATE_KEYS_CHAIN_2 = 'key2';

        expectedKeys = {};
        for (const key of Object.keys(process.env)) {
            if (key.startsWith("PRIVATE_KEYS_CHAIN_")) {
                const chainId = Number(key.replace("PRIVATE_KEYS_CHAIN_", "")) as ChainId;
                expectedKeys[chainId] = [process.env[key] as string];
            }
        }
    });

    afterEach(() => {
        delete process.env.PRIVATE_KEYS_CHAIN_1;
        delete process.env.PRIVATE_KEYS_CHAIN_2;
        delete process.env.NODE_ENV;
    });

    it('should return private keys for all chains', () => {
        const privateKeys = getPrivateKeys();
        expect(privateKeys).toEqual(expectedKeys);
    });
});

describe('getProvidersConfig function', () => {
    let expectedConfig: Partial<Record<ChainId, { endpoints: string[] }>>;

    beforeEach(() => {
        process.env.NODE_ENV = "test";

        process.env.PROVIDERS_CHAIN_1 = 'provider1';
        process.env.PROVIDERS_CHAIN_2 = 'provider2';

        expectedConfig = {};
        for (const key of Object.keys(process.env)) {
            if (key.startsWith("PROVIDERS_CHAIN_")) {
                const chainId = Number(key.replace("PROVIDERS_CHAIN_", "")) as ChainId;
                expectedConfig[chainId] = {
                    endpoints: [process.env[key] as string]
                };
            }
        }
    });

    afterEach(() => {
        delete process.env.PROVIDERS_CHAIN_1;
        delete process.env.PROVIDERS_CHAIN_2;
        delete process.env.NODE_ENV;
    });

    it('should return providers configuration for all chains', () => {
        const providersConfig = getProvidersConfig();
        expect(providersConfig).toEqual(expectedConfig);
    });
});
