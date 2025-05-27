import requests
import time
import json
import csv
from datetime import datetime
import os  # Add os import for directory operations

API_KEY = "14FXCDBK2YRHZM2F77TZ2JV25HG7F9ADG1"
BASE_URL = "https://api.etherscan.io/api"

# ADDRESS is the wallet/account address we are interested in
ADDRESS = "0xe11a3c6d20B464c77ca7dBe8cF9E83c91Dd337Be"
START_BLOCK = "14978379"
END_BLOCK = "99999999"

CALLS_PER_SECOND_LIMIT = 5
SECONDS_PER_CALL = 1.0 / CALLS_PER_SECOND_LIMIT
# FORCED_PAGE_FETCH_THRESHOLD removed

# Status codes for API response handling
STATUS_CONTINUE_NEXT = 0
STATUS_RETRY_CURRENT = 1
STATUS_STOP_END_OF_DATA = 2
STATUS_STOP_ERROR = 3
STATUS_STOP_DUPLICATE = 4

def _handle_api_success_response(response_data, all_transactions, current_page_transactions_cache, page, offset):
    """Handles successful API response (status '1')."""
    page_transactions = response_data["result"]

    if current_page_transactions_cache and page_transactions and \
       len(current_page_transactions_cache) == len(page_transactions) and \
       current_page_transactions_cache[0]["hash"] == page_transactions[0]["hash"]:
        are_all_hashes_same = all(
            current_page_transactions_cache[i]["hash"] == page_transactions[i]["hash"]
            for i in range(len(page_transactions))
        )
        if are_all_hashes_same:
            print("Duplicate page content detected based on all transaction hashes, stopping.")
            return STATUS_STOP_DUPLICATE

    all_transactions.extend(page_transactions)
    current_page_transactions_cache[:] = page_transactions
    print(f"Fetched {len(page_transactions)} transactions on page {page}. Total: {len(all_transactions)}")

    if not page_transactions:
        print("No more transactions found on this page.")
        return STATUS_STOP_END_OF_DATA # Reverted: stop if no transactions

    if len(page_transactions) < offset:
        print("Fetched less than offset, likely the last page.")
        return STATUS_STOP_END_OF_DATA # Reverted: stop if less than offset
    
    return STATUS_CONTINUE_NEXT

def _handle_api_error_response(response_data):
    """Handles API error response (status '0')."""
    message = response_data.get("message", "").lower()
    result_content = response_data.get("result")
    
    # Handle result_content carefully as it might not be a string
    result_text = ""
    if isinstance(result_content, str):
        result_text = result_content.lower()
    elif result_content is not None:
        result_text = str(result_content).lower() # Convert non-string to string then lower

    if message == "no transactions found" or result_text == "no transactions found":
        print("API indicated no transactions found for the current query parameters.")
        return STATUS_STOP_END_OF_DATA # Reverted: stop if no transactions found by API
    
    if "max rate limit reached" in result_text:
        print("Rate limit reached, waiting for 10 seconds...")
        time.sleep(10)
        return STATUS_RETRY_CURRENT
    
    # Default to stop error for other status '0' messages
    print(f"API Error: Message: {response_data.get('message')} - Result: {result_content}")
    return STATUS_STOP_ERROR

def _handle_api_response(response_data, all_transactions, current_page_transactions_cache, page, offset):
    """Helper function to process the API response."""
    status = response_data.get("status")
    if status == "1":
        return _handle_api_success_response(response_data, all_transactions, current_page_transactions_cache, page, offset)
    if status == "0":
        return _handle_api_error_response(response_data)

    # Unknown status or structure
    print(f"Unknown API response structure: {response_data}")
    return STATUS_STOP_ERROR

def get_eth_transactions(wallet_address, start_block, end_block, api_key):
    """
    Fetches regular ETH transactions for a wallet address from Etherscan API.
    """
    all_transactions = []
    current_page_transactions_cache = []
    page = 1
    offset = 100

    print(f"\nFetching ETH transactions for address: {wallet_address}")
    print(f"Blocks: {start_block}-{end_block}")

    while True:
        params = {
            "module": "account", "action": "txlist", "address": wallet_address,
            "page": page, "offset": offset, "startblock": start_block,
            "endblock": end_block, "sort": "asc", "apikey": api_key,
        }
        
        print(f"Fetching page {page} for ETH...")
        
        response = None
        try:
            response = requests.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            status = _handle_api_response(data, all_transactions, current_page_transactions_cache, page, offset)
            
            if status != STATUS_CONTINUE_NEXT:
                if status == STATUS_STOP_END_OF_DATA:
                    print(f"Stopping fetch for ETH due to status: {status}")
                    break
                elif status == STATUS_STOP_ERROR:
                    print(f"Error occurred, stopping fetch for ETH")
                    break
                elif status == STATUS_STOP_DUPLICATE:
                    print(f"Duplicate content detected, stopping fetch for ETH")
                    break
                elif status == STATUS_RETRY_CURRENT:
                    print(f"Retrying current page {page}")
                    continue

            page += 1
            time.sleep(SECONDS_PER_CALL)

        except requests.exceptions.RequestException as req_e:
            print(f"Request error on page {page}: {req_e}")
            if response:
                print(f"Response status code: {response.status_code}")
                print(f"Response content: {response.text}")
            break
        except Exception as e:
            print(f"An unexpected error occurred on page {page}: {e}")
            break

    print(f"\nSuccessfully fetched {len(all_transactions)} ETH transactions.")
    
    # Save ETH transactions to CSV
    if all_transactions:
        eth_filename = f"temp/eth_transactions_{ADDRESS[-6:].lower()}.csv"
        print(f"Saving ETH transactions to {eth_filename}...")
        
        try:
            with open(eth_filename, 'w', newline='', encoding='utf-8') as csvfile:
                if all_transactions:
                    fieldnames = all_transactions[0].keys()
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(all_transactions)
            print(f"All ETH transactions saved to {eth_filename}")
        except Exception as e:
            print(f"Error saving ETH transactions: {e}")
    
    return all_transactions

def get_erc20_token_transfers(token_symbol, contract_address, wallet_address, start_block, end_block, api_key):
    """
    Fetches ERC20 token transfer events for a specific token from Etherscan API.
    """
    all_transactions = []
    current_page_transactions_cache = []
    page = 1
    offset = 100 # Number of transactions per page

    print(f"\nFetching {token_symbol} transactions for address: {wallet_address}")
    print(f"Contract: {contract_address}, Blocks: {start_block}-{end_block}")

    while True:
        params = {
            "module": "account", "action": "tokentx", "contractaddress": contract_address,
            "address": wallet_address, "page": page, "offset": offset, "startblock": start_block,
            "endblock": end_block, "sort": "asc", "apikey": api_key,
        }
        # Removed page 150 safety break
        print(f"Fetching page {page} for {token_symbol}...")
        
        response = None # Initialize response here for wider scope in except block
        try:
            response = requests.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            status_code = _handle_api_response(data, all_transactions, current_page_transactions_cache, page, offset)
            
            if status_code == STATUS_RETRY_CURRENT:
                continue 
            if status_code in (STATUS_STOP_DUPLICATE, STATUS_STOP_ERROR, STATUS_STOP_END_OF_DATA):
                print(f"Stopping fetch for {token_symbol} due to status: {status_code}")
                break
            # if status_code == STATUS_CONTINUE_NEXT, proceed to increment page

        except requests.exceptions.RequestException as req_e:
            print(f"HTTP Request failed for {token_symbol}: {req_e}. Retrying in 5 seconds...")
            time.sleep(5)
            continue 
        except json.JSONDecodeError as json_e:
            response_text_snippet = response.text[:200] if response and hasattr(response, 'text') else "[No response text]"
            response_url_snippet = response.url if response and hasattr(response, 'url') else '[No response URL]'
            print(f"Failed to decode JSON for {token_symbol}: {json_e}. Response text: {response_text_snippet}... Retrying in 5 seconds...")
            print(f"Request URL: {response_url_snippet}")
            time.sleep(5)
            continue 
        
        page += 1
        time.sleep(SECONDS_PER_CALL)

    return all_transactions

def create_combined_csv(all_transactions_by_token, output_filename):
    """
    Creates a combined CSV with simplified transaction data from all tokens.
    
    Args:
        all_transactions_by_token: Dict with token symbol as key and list of transactions as value
        output_filename: Name of the output CSV file
    """
    combined_data = []
    
    for token_symbol, transactions in all_transactions_by_token.items():
        for tx in transactions:
            # Convert timestamp to datetime
            timestamp = datetime.fromtimestamp(int(tx['timeStamp']))
            formatted_time = timestamp.strftime('%Y-%m-%d %H:00')
            
            # Convert value based on token decimals
            decimals = int(tx.get('tokenDecimal', 18))  # ETH has 18 decimals
            amount = float(tx['value']) / (10 ** decimals)
            
            # Determine if this is an incoming or outgoing transaction
            is_incoming = tx['to'].lower() == ADDRESS.lower()
            action = 'TO' if is_incoming else 'FROM'
            # Get the relevant address (sender if incoming, receiver if outgoing)
            relevant_address = tx['from'] if is_incoming else tx['to']
            
            combined_data.append({
                'Time': formatted_time,
                'Token': token_symbol,
                'Action': action,
                'Address': relevant_address,
                'Amount': amount
            })
    
    # Sort by timestamp
    combined_data.sort(key=lambda x: x['Time'])
    
    # Write to CSV
    fieldnames = ['Time', 'Token', 'Action', 'Address', 'Amount']
    try:
        with open(output_filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(combined_data)
        print(f"Combined transactions saved to {output_filename}")
    except IOError as io_e:
        print(f"I/O error while saving combined CSV: {io_e}")
    except Exception as e:
        print(f"An unexpected error occurred while saving combined CSV: {e}")

if __name__ == "__main__":
    # Create temp directory if it doesn't exist
    os.makedirs('temp', exist_ok=True)
    
    # First, fetch ETH transactions
    print("=== Fetching ETH Transactions ===")
    eth_transactions = get_eth_transactions(
        wallet_address=ADDRESS,
        start_block=START_BLOCK,
        end_block=END_BLOCK,
        api_key=API_KEY
    )
    
    all_transactions_by_token = {}
    if eth_transactions:
        all_transactions_by_token["ETH"] = eth_transactions

    # Then fetch ERC20 tokens
    tokens_to_fetch = [
        {"symbol": "USDC", "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"},
        {"symbol": "USDT", "contract_address": "0xdAC17F958D2ee523a2206206994597C13D831ec7"},
    ]

    for token_info in tokens_to_fetch:
        token_symbol = token_info["symbol"]
        contract_addr = token_info["contract_address"]

        fetched_transactions = get_erc20_token_transfers(
            token_symbol=token_symbol,
            contract_address=contract_addr,
            wallet_address=ADDRESS,
            start_block=START_BLOCK,
            end_block=END_BLOCK, 
            api_key=API_KEY
        )

        if fetched_transactions:
            print(f"\nSuccessfully fetched {len(fetched_transactions)} {token_symbol} transactions.")
            all_transactions_by_token[token_symbol] = fetched_transactions

            # Save individual token transactions
            output_filename_csv = f"temp/erc20_transfers_{token_symbol}_{ADDRESS.replace('0x', '')[:6]}.csv"
            fieldnames = [
                'blockNumber', 'timeStamp', 'hash', 'nonce', 'blockHash', 'from', 
                'contractAddress', 'to', 'value', 'tokenName', 'tokenSymbol',
                'tokenDecimal', 'transactionIndex', 'gas', 'gasPrice', 'gasUsed',
                'cumulativeGasUsed', 'input', 'confirmations'
            ]

            print(f"Saving {token_symbol} transactions to {output_filename_csv}...")
            try:
                with open(output_filename_csv, "w", newline='', encoding='utf-8') as csvfile:
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction='ignore')
                    writer.writeheader()
                    writer.writerows(fetched_transactions)
                print(f"All {token_symbol} transactions saved to {output_filename_csv}")
            except IOError as io_e:
                print(f"I/O error while saving {token_symbol} CSV: {io_e}")
            except Exception as e:
                print(f"An unexpected error occurred while saving {token_symbol} CSV: {e}")
        else:
            print(f"No {token_symbol} transactions were fetched for address {ADDRESS}.")

    # Create combined CSV if we have any transactions
    if all_transactions_by_token:
        combined_output_filename = f"temp/combined_transfers_{ADDRESS.replace('0x', '')[:6]}.csv"
        create_combined_csv(all_transactions_by_token, combined_output_filename)

    print("\nScript finished processing all specified tokens.")
