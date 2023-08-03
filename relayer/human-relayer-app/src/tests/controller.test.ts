const { ApiController } = require("../controller");
import {EVMChainId, isEVMChain} from "@certusone/wormhole-sdk";
import {ethers} from "ethers";
describe("ApiController", () => {
    let controller: any;

    beforeEach(() => {
        controller = new ApiController();
    });

    describe("relayMessage", () => {
        const mockContext = {
            vaa: {
                payload: Buffer.from("hex", 'hex'),
            },
            logger: {
                info: jest.fn(),
                error: jest.fn(),
            },
            wallets: {
                onEVM: jest.fn(),
            },
            vaaBytes: "vaaBytes",
        };

        const next = jest.fn();
        const abi = {};

        ethers.utils.defaultAbiCoder.decode = jest.fn(() => {
            return ["recipient", "destID", "sender", "message"];
        });

        it("should log error if destID is not an EVM chain", async () => {
            await controller.relayMessage(mockContext, next, abi);
            expect(mockContext.logger.error).toHaveBeenCalled();
        });

        it("should call onEVM if destID is an EVM chain", async () => {
            const destChainID = 1 as EVMChainId;
            if (isEVMChain(destChainID)) {
                await controller.relayMessage(mockContext, next, abi);
                expect(mockContext.wallets.onEVM).toHaveBeenCalled();
            }
        });
    });

    describe("formatAddress", () => {
        it("should return ethereum style address", () => {
            const address = controller.formatAddress("0x000000000000000000000000someaddress");
            expect(address).toEqual("0xsomeaddress");
        });

        it("should return original address", () => {
            const address = controller.formatAddress("0xoriginaladdress");
            expect(address).toEqual("0xoriginaladdress");
        });
    });
});
