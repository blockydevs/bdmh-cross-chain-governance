from web3 import Web3


ethereum_node_url = ""  # 'YOUR_ETHEREUM_NODE_URL'


if ethereum_node_url:
    w3 = Web3(Web3.HTTPProvider(ethereum_node_url))
else:
    w3 = None


run_script = False

if w3:
    contract_address = ""
    
    contract_abi = []

    def event_callback(event):
        global should_print_hello_world
        print("Event received")
        run_script = True

    # Start listening to the event (if contract address and ABI are provided)
    if contract_address and contract_abi:
        contract = w3.eth.contract(address=contract_address, abi=contract_abi)
        event_filter = contract.events.RunFunctionExecuted.createFilter(
            fromBlock="latest"
        )
        while True:
            for event in event_filter.get_new_entries():
                event_callback(event)

if run_script:
    print("Code to be executed when the CreateProposal function is ran.")
