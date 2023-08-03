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
        process.env.ENVIRONMENT = "VALID_ENVIRONMENT";

        process.env.HUB_RELAY_CHAIN_ID = "1";
        process.env.HUB_RELAY_CHAIN_ADDRESS = "address1";

        process.env.SPOKE_RELAY_CHAIN_2 = "spoke2";
    });

    afterEach(() => {
        jest.clearAllMocks();
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
        expect(mockApp.chain).toHaveBeenCalledWith(2);
        expect(mockApp.address).toHaveBeenCalledTimes(2);
    });
});

describe('getPrivateKeys function', () => {
    beforeEach(() => {
        process.env = Object.assign(process.env, {
            PRIVATE_KEYS_CHAIN_1: 'key1',
            PRIVATE_KEYS_CHAIN_2: 'key2',
        });
    });

    it('should return private keys for all chains', () => {
        const privateKeys = getPrivateKeys();
        const expectedKeys: Partial<Record<ChainId, any[]>> = {
            1: ['key1'],
            2: ['key2'],
        };

        expect(privateKeys).toEqual(expectedKeys);
    });
});

describe('getProvidersConfig function', () => {
    beforeEach(() => {
        process.env = Object.assign(process.env, {
            PROVIDERS_CHAIN_1: 'provider1',
            PROVIDERS_CHAIN_2: 'provider2',
        });
    });

    it('should return providers configuration for all chains', () => {
        const providersConfig = getProvidersConfig();
        const expectedConfig = {
            1: { endpoints: ['provider1'] },
            2: { endpoints: ['provider2'] },
        };

        expect(providersConfig).toEqual(expectedConfig);
    });
});
