# Vote Aggregator

The "Vote Aggregator" is an application designed to serve as a backend component for the Human Protocol. It's responsible for collecting votes from various chains, with a simple REST API to interface with the frontend.

## What does the app do?

Once fully developed, the application will:

1. Query smart contracts across different Ethereum-compatible chains using Alchemy/Infura.
2. Aggregate vote results from different chains.
3. Store the aggregated data in Redis for faster retrieval.
4. Offer a REST API for data retrieval from the frontend.

Contract classes are generated from ABIs, and all configurations (like the hub, spokes, cache ttl, and rpc addresses) are derived from the `.env` file. The application also has the flexibility to query multiple contract addresses for each network.

## How to Setup

1. Clone this repository: `git clone https://github.com/blockydevs/bdmh-cross-chain-governance`
2. Navigate to the project directory: `cd vote-aggregator`
3. Create an .env file in the project root and populate it with appropriate values (refer to the Configuration section)
4. Build: `docker-compose -f docker-compose.yml build vote-aggregator`
5. Run: `docker-compose -f docker-compose.yml up`

## Configuration

Your .env file should contain:

```
NODE_PORT=3000

REDIS_PORT=6379     
REDIS_HOST=redis-docker

MUMBAI_RPC_URL=     
AVALANCHE_RPC_URL=      
MOONBASE_RPC_URL=   

MUMBAI_SPOKE_CHAIN=0x95b49867E28F0F7553cAeb1365644a1861FEbFf3,0x95b49867E28F0F7553cAeb1365644a1861FEbFf3    
AVALANCHE_SPOKE_CHAIN=0x75e9990D2b4CE167282BA2071f771f3248D3B9F9    
MOONBASE_SPOKE_CHAIN=0xF42e5eeFd8E2Fb3382732bF1e6a7A377FD2523CB 

REDIS_EXPIRATION_TIME_IN_SEC=180
```

Replace with other configurations as necessary.

## API Endpoints
Example endpoint:

GET /proposal?id=123

Response:
```json
[
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
]
```

## Built With
Express - Web application framework.        
Redis - In-memory data structure store.     
dotenv - Module to load environment variables from .env file.       
web3.js - Ethereum JavaScript API.




