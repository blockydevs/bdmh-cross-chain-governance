from web3 import Web3
import discord
import asyncio

# GLOBALS
# for web3 integration
ETHEREUM_NODE_URL = 'YOUR_ETHEREUM_NODE_URL' 
CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS'
CONTRACT_ABI = []
#for discord integration
CHANNEL_ID = 1165138239301107803  #Enter your discord channel id
BOT_TOKEN = 'MTE2NjUzNjU2OTk5ODU0MDg5MA.G5vRdW.8JoOWg-ypzVyw3GkpILJnRgeEDUsbSIyDImWec'

NOTIFICATION = 'Hello, Mehidy I wanted to inform you that someone has created a proposal.'
# NOTIFICATION = '.'

should_notify = True


# Discord bot setup
intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)
@client.event
async def on_ready():
    print(f'We have logged in as {client.user}')


# if ETHEREUM_NODE_URL:
#     w3 = Web3(Web3.HTTPProvider(ETHEREUM_NODE_URL))
# else:
#     w3 = None
    
w3 = Web3(Web3.HTTPProvider(ETHEREUM_NODE_URL)) if ETHEREUM_NODE_URL else None    


if w3:
    def event_callback(event):
        print("Event received")
        if client.is_ready():
            channel = client.get_channel(CHANNEL_ID)
            asyncio.ensure_future(channel.send(NOTIFICATION))

    if CONTRACT_ADDRESS and CONTRACT_ABI:
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        event_filter = contract.events.RunFunctionExecuted.createFilter(
            fromBlock="latest"
        )
        while True:
            for event in event_filter.get_new_entries():
                event_callback(event)


# this is just for testing the notifications without events can be removed once the project is done.
if should_notify == True:
    @client.event
    async def on_ready():
        print(f'We have logged in as {client.user}')
        if client.is_ready():
            channel = client.get_channel(CHANNEL_ID)
            if channel:
                asyncio.ensure_future(channel.send(NOTIFICATION))
        else:
            print("Error: Couldn't find the specified channel.")


client.run(BOT_TOKEN)
