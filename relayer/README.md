# human-relayer-app

## Prerequisites

To run this application, you will need Docker and Docker Compose installed on your machine. If you haven't installed Docker yet, please visit the [official Docker website](https://docs.docker.com/get-docker/) for installation instructions. Docker Compose is often bundled with Docker, but if you don't have it, please visit the [Docker Compose page](https://docs.docker.com/compose/install/) for installation instructions.

## Configuration

To configure the environment for your project, copy the `.example.env` file to `.env` in the `human-relayer-app` directory.     
Execute `npm i` command inside `human-relayer-app` directory.       
Fill in the values as per the instructions below:
### ENVIRONMENT

Possible values: `testnet`, `mainnet` example: `ENVIRONMENT=mainnet`

### PROVIDERS_CHAIN_10002

Enter the provider URL for the chain with ID 10002.

example: `PROVIDERS_CHAIN_10002=https://eth-sepolia.g.alchemy.com/v2/wfXNo_GK-Fm00CrmS2ORmMrXuLDy`

### PRIVATE_KEYS_CHAIN_10002 and PRIVATE_KEYS_CHAIN_5

Enter the private keys, separated by commas, for the respective chains.

example: `PRIVATE_KEYS_CHAIN_5=keyA,keyB,keyC`

## Deployment Process

1. **Download the project**: Download the latest version of the project from the repository.

2. **Build Docker images**: Run the following command in the project's root directory to build the Docker images for the application:

    ```bash
    docker build -t human-relayer-app -f Dockerfile.human-relayer-app .
    ```

3. **Launch the services**: Now that the images are built, you can start the services using the Docker Compose configuration file corresponding to your environment:

   - For the production environment, use:

       ```bash
       docker-compose -f docker-compose.prod.yml up
       ```

   - For the testing environment, use:

       ```bash
       docker-compose -f docker-compose.test.yml up
       ```

   If you want to run the services in the background, add the `-d` flag:

    ```bash
    docker-compose -f docker-compose.[CONFIG].yml up -d
    ```

To stop the services, use the `docker-compose down` command in the project's root directory.

## Important Notes

- The `human-relayer-app` service depends on `testnet-spy` and `redis-store` services. Therefore, Docker will start these two services before `human-relayer-app`.
- `redis-store` is configured to expose port `6379` to other Docker services only, not to the host.
- The `testnet-spy` service uses the latest `ghcr.io/wormhole-foundation/guardiand` image.
- The source code for `human-relayer-app` is built in place using `Dockerfile.human-relayer-app`.
