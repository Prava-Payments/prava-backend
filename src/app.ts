import express, { Request, Response } from 'express';
import {ethers, Wallet, type TransactionRequest} from 'ethers';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const ALCHEMY_KEY = process.env.ALCHEMY_KEY;
console.log('ALCHEMY_KEY:', ALCHEMY_KEY);

const PRIVATE_KEY = process.env.PRIVATE_KEY;
console.log('PRIVATE_KEY:', PRIVATE_KEY);
let wallet: Wallet;
if (PRIVATE_KEY) {
  wallet = new Wallet(PRIVATE_KEY);
  console.log('Wallet address:', wallet.address);
} else {
  console.error('Private key is undefined');
}

const provider = new ethers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);

const constructTx = async () => {
    const tokenAddress = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
    const recipient = "0x6B2eBFe3FE5c5B84746105421de93Df383b222E8"

    const amount = ethers.parseUnits('1', 6)
    // in other case you get it from the sms
    const nonce = await provider.getTransactionCount(wallet.address, 'latest');
    const gasPrice = 40000000000
    const gasLimit = 31532

    const abi = new ethers.AbiCoder();
    const functionSelector = ethers.id("transfer(address,uint256)").substring(0, 10);

    const data = functionSelector + abi.encode(
        ['address', 'uint256'],
        [recipient, amount]
    ).substring(2);
    console.log('Data:', data);
    // Create the transaction object
    const tx = {
    nonce: nonce,
    gasPrice: gasPrice,
    gasLimit: gasLimit,
    to: tokenAddress,
    value: 0,
    data: data,
    chainId: 137 // Replace with your chain ID
    }
    const signedTx = await wallet.signTransaction(tx);
    console.log('Signed Transaction:', signedTx);
    return signedTx as TransactionRequest
}

async function getRevertReason(txHash: string) {
    const tx = await provider.getTransaction(txHash);
    try {
        // Perform a call to get the revert reason
        const code = await provider.call(tx as TransactionRequest);
        // Extract the reason string from the returned data
        const reason = ethers.toUtf8String('0x' + code.substr(138));
        return reason;
    } catch (error) {
        console.error("Error getting revert reason:", error);
        return "Error getting revert reason";
    }
}


// Middleware to parse JSON bodies
app.use(express.json());

// Define a GET endpoint
app.get('/api/hello', async (req: Request, res: Response) => {
    const signedTx = await constructTx();
    try {
        const txResponse = await provider.send("eth_sendRawTransaction", [signedTx]);
        console.log("Transaction Hash:", txResponse);

        const receipt = await provider.waitForTransaction(txResponse); // Wait for the transaction to be mined

        if (receipt?.status === 0) {
            console.log("Transaction failed");
            const revertReason = await getRevertReason(txResponse);
            console.log("Revert reason:", revertReason);
        } else {
            console.log("Transaction was mined in block:", receipt?.blockNumber);
        }
    } catch (error) {
        console.error("Error sending transaction:", error);
    }
    res.send('Hello, World!');
});

// Define a POST endpoint
app.post('/api/send', (req: Request, res: Response) => {
  const receivedData = req.body;
  // Process the received data here
  res.json({ message: 'Data received', data: receivedData });
});

// Define the port to run the server on
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
