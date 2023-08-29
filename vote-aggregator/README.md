# Vote Aggregator

The "Vote Aggregator" is an application designed to serve as a backend component for the Human Protocol. It's responsible for collecting votes from various chains, with a simple REST API to interface with the frontend.

## What does the app do?

Once fully developed, the application will:

1. Query smart contracts using Alchemy/Infura.
2. Parse the responses.
3. Store the parsed data in Redis.
4. Offer a REST API for data retrieval.

Contract classes will be generated from ABIs and all configurations (hub, spokes, cache ttl, rpc addresses) will be derived from the `.env` file.

## How to Setup

1. Clone this repository: `git clone https://github.com/blockydevs/bdmh-cross-chain-governance`
2. Navigate to the project directory: `cd vote-aggregator`
3. Create an .env file in the project root and populate it with appropriate values (refer to the Configuration section)
4. Build: `docker-compose -f docker-compose.yml build vote-aggregator`
5. Run: `docker-compose -f docker-compose.yml up`

## Configuration

Your .env file should contain:

NODE_PORT=3000  
REDIS_PORT=6379     
REDIS_HOST=redis-docker

Replace with other configurations as necessary.

## API Endpoints
Example endpoint:

GET /proposal?id=123

Response:

`[
{
"chain_name": "sepolia",
"for": 100,
"against": 200,
"abstain": 300
},
{
"chain_name": "mumbai",
"for": 100,
"against": 200,
"abstain": 300
}
]`

## Built With
Express - Web application framework.        
Redis - In-memory data structure store.     
dotenv - Module to load environment variables from .env file.       
web3.js - Ethereum JavaScript API.




