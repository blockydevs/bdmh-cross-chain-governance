import {Next, StandardRelayerContext} from "@wormhole-foundation/relayer-engine";
import {ContractInterface, ethers} from "ethers";
import {EVMChainId, isEVMChain} from "@certusone/wormhole-sdk";

export class ApiController {
  relayMessage = async (ctx: StandardRelayerContext, next: Next, abi: ContractInterface) => {
    // Here we are parsing the payload so that we can send it to the right recipient
    const hexPayload = ctx.vaa.payload.toString("hex");
    ctx.logger.info(`payload: ${hexPayload}`);
    let [recipient, destID, sender, message] = ethers.utils.defaultAbiCoder.decode(["bytes32", "uint16", "bytes32", "bytes"], "0x" + hexPayload);
    recipient = this.formatAddress(recipient);
    sender = this.formatAddress(sender);
    const destChainID = destID as EVMChainId;
    ctx.logger.info(`VAA: ${sender} sent "${message}" to ${recipient} on chain ${destID}.`);

    // Execution logic
    if (isEVMChain(destChainID)) {
      // This is where you do all of the EVM execution.
      // Add your own private wallet for the executor to inject in relayer-engine-config/executor.json
      await ctx.wallets.onEVM(
          destChainID,
          async (wallet, chainId) => {
            const contract = new ethers.Contract(recipient, abi, wallet.wallet);
            const result = await contract.receiveMessage(ctx.vaaBytes);
            ctx.logger.info(result);
          }
      );
    }
    else {
      ctx.logger.error("Requested chainID is not an EVM chain, which is currently unsupported.");
    }
  }

    // Formats bytes32 data to an ethereum style address if necessary.
    formatAddress = (address: string): string => {
        if (address.startsWith("0x000000000000000000000000")) return "0x" + address.substring(26);
        else return address;
    }
}


