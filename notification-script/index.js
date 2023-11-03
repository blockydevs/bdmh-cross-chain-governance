const { createPublicClient, http, parseAbiItem, parseAbi } = require("viem");
const { polygonMumbai } = require("viem/chains");
const { Client, Intents, GatewayIntentBits } = require("discord.js");
const TelegramBot = require("node-telegram-bot-api");
const dotvenv = require("dotenv");
const GOVERNOR_ABI = require("./GovernorAbi.json"); // need this for vote end

dotvenv.config();

// TELEGRAM CONFIG
const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

// --Easy wat to get channel id after adding bot to channel
// telegramBot.on("message", (msg) => {
//   const chatId = msg.chat.id;
//   console.log(chatId);
// });

const notifyTelegram = async (message) => {
  telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
};

/// DISCORD CONFIG
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

discordClient.once("ready", () => {
  console.log("Discord Bot is Ready!");
});

const notifyDiscord = async (message) => {
  const channel = await discordClient.channels.fetch(process.env.CHANNEL_ID);
  channel.send(message);
};

discordClient.login(process.env.DISCORD_BOT_TOKEN);

const sendProposalExecutedNotification = (proposalId) => {
  const message = `Proposal ${proposalId} has been executed`;
  notifyDiscord(message);
  notifyTelegram(message);
};
const sendProposaCreatedNotification = (proposalId, proposalDescription) => {
  const message = `Proposal ${proposalId} has been created. Description: ${proposalDescription}`;
  notifyDiscord(message);
  notifyTelegram(message);
};

const sendProposalQueuedNotification = (proposalId) => {
  const message = `Proposal ${proposalId} has been queued`;
  notifyDiscord(message);
  notifyTelegram(message);
};

const client = createPublicClient({
  chain: polygonMumbai,
  transport: http(),
});
client.watchEvent({
  address: process.env.HUMAN_GOVERNOR_ADDR,
  events: parseAbi([
    "event ProposalCreated(uint256 proposalId, address proposer,address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
    "event ProposalExecuted(uint256 proposalId)",
    "event ProposalQueued(uint256 proposalId, uint256 eta)",
  ]),
  onLogs: (logs) => {
    logs.forEach((log) => {
      if (log.eventName == "ProposalCreated") {
        sendProposaCreatedNotification(
          log.args.proposalId,
          log.args.description
        );
      } else if (log.eventName == "ProposalExecuted") {
        sendProposalExecutedNotification(log.args.proposalId);
      } else if (log.eventName == "ProposalQueued") {
        sendProposalQueuedNotification(log.args.proposalId);
      }
    });
  },
});
