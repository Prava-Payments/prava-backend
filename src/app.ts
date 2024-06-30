import express, { Request, Response } from 'express';
import {ethers, formatEther, Wallet, type TransactionRequest} from 'ethers';
import dotenv from 'dotenv';
import SafeApiKit from '@safe-global/api-kit'
import { MetaTransactionData, } from '@safe-global/safe-core-sdk-types'
import Safe, { SafeFactory, SafeAccountConfig, SafeConfig } from '@safe-global/protocol-kit'
import { createClient } from 'redis'

// Load environment variables from .env file
dotenv.config();
const ALCHEMY_KEY = process.env.ALCHEMY_KEY;
console.log('ALCHEMY_KEY:', ALCHEMY_KEY);
const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`);
const RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const apiKit = new SafeApiKit({
    chainId: BigInt(8453),
  })
  
const defaultClient = () =>
	createClient({
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: 18930
        }
    })

export const getDefaultClient = async () => {
    const client = defaultClient()
    client.on('error', (err) => console.error('Redis Client Error', err));
    if (!client.isOpen) {
        try {
          await client.connect();
          console.log('Connected to Redis');
        } catch (err) {
          console.error('Error connecting to Redis:', err);
        }
    }
    console.log('Connected to Redis')
    return client
}
const id  = (mobileNumber: number) => `user:${mobileNumber}`


const Tokens = {
        USDC : {
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            decimals: 6
        },
        DEGEN :{
            address: "",
            decimals: 18
        }
    }

const app = express();
console.log('PRIVATE_KEY:', PRIVATE_KEY);
let wallet: Wallet;
if (PRIVATE_KEY) {
  wallet = new Wallet(PRIVATE_KEY, provider);
  console.log('Wallet address:', wallet.address);
} else {
  console.error('Private key is undefined');
}
const getBalance = async (address: string, tokenAddress: string) => {
    const tokenContract = new ethers.Contract(tokenAddress, [
        'function balanceOf(address) view returns (uint)'
    ], provider);

    const balance = await tokenContract.balanceOf(address);
    return balance;
}

const randomString = (length: number) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}



// const constructTx = async () => {
//     const tokenAddress = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
//     const recipient = "0x6B2eBFe3FE5c5B84746105421de93Df383b222E8"

//     const amount = 1000
//     // in other case you get it from the sms
//     const nonce = await provider.getTransactionCount(wallet.address, 'latest');
//     const gasPrice = 40000000000
//     const gasLimit = 31532

//     const abi = new ethers.AbiCoder();
//     const functionSelector = ethers.id("transfer(address,uint256)").substring(0, 10);

//     const data = functionSelector + abi.encode(
//         ['address', 'uint256'],
//         [recipient, amount]
//     ).substring(2);
//     console.log('Data:', data);
//     // Create the transaction object
//     const tx = {
//     nonce: nonce,
//     gasPrice: gasPrice,
//     gasLimit: gasLimit,
//     to: tokenAddress,
//     value: ethers.parseEther('0'),
//     data: data,
//     chainId: ethers.toBeHex(137) // Replace with your chain ID
//     }
//     const signedTx = await wallet.signTransaction(tx);
//     console.log('Signed Transaction:', signedTx);
//     return signedTx as TransactionRequest
// }

// const constructTx1 = async () => {
//     const gasPrice = 40000000000
//     const gasLimit = 315320

//     const erc20Address = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
//     const erc20Abi = [
//         "function transfer(address recipient, uint256 amount) public returns (bool)"
//     ];
//     const contract = new ethers.Contract(erc20Address, erc20Abi);
//     const recipient = "0x6B2eBFe3FE5c5B84746105421de93Df383b222E8"
//     const amount = ethers.parseUnits('0.001', 6);
//     const data = contract.interface.encodeFunctionData('transfer', [recipient, amount]);
//     console.log('data:', data);
//     const tx = {
//     from: wallet.address,
//     nonce: await provider.getTransactionCount(wallet.address, 'latest'),
//     gasPrice: gasPrice,
//     gasLimit: gasLimit,
//     to: erc20Address,
//     value: ethers.parseEther('0'),
//     data: data,
//     chainId: ethers.toBeHex(137) // Replace with your chain ID
//     }
//     const signedTx = await wallet.signTransaction(tx);
//     console.log('Signed Transaction:', signedTx);
//     return signedTx as TransactionRequest
// }

const recharge = async (address: string) => {
    const transactionParameters = {
        to: address,
        value: ethers.parseEther('0.0002')
      }
    try {
        (await wallet.sendTransaction(transactionParameters)).wait()
        return 1
    } catch (error) {
        console.error('Error:', error);
        return 0
    }
}

const safeConstructTx = async (saltNonce: string) => {
    try {
    const safeFactory = await SafeFactory.init({
        provider: RPC_URL,
        signer: PRIVATE_KEY
    })
    const safeAccountConfig: SafeAccountConfig = {
        owners: [
        wallet.address,
        ],
        threshold: 1,
        // Optional params
      }
      saltNonce = saltNonce.replace(/\D/g, '') || ethers.hexlify(ethers.randomBytes(32))
      /* This Safe is tied to owner 1 because the factory was initialized with the owner 1 as the signer. */
      const protocolKitOwner1 = await safeFactory.deploySafe({ safeAccountConfig, saltNonce })
      const safeAddress = await protocolKitOwner1.getAddress()
      console.log('Safe Address:', safeAddress);
      return safeAddress
    }
    catch (error) {
        console.error('Error:', error);
    }
}

const update = async (address: string) => {
    if(address === undefined) {
        return {address: '', Balance: ''}
    }
    const Balance = {
        ETH: '',
        USDC : ''
    }
    const NativeBalance = await provider.getBalance(address);
    Balance.ETH = formatEther(NativeBalance);
    const tokenBalance = await getBalance(address, Tokens.USDC.address);
    Balance.USDC = ethers.formatUnits(tokenBalance, Tokens.USDC.decimals);
    return {address, Balance}
}


// Middleware to parse JSON bodies
app.use(express.json());

// Define a GET endpoint
app.post('/api/instructions', async (req: Request, res: Response) => {
    const receivedData = req.body;
    const mobileNumber = receivedData.sender;
    const instructions = receivedData.instruction;
    const sessionKey = receivedData.session;
    const amount = receivedData.amount;
    const destination = receivedData.destination;
    const token = receivedData.token;
    const client = await getDefaultClient()
    console.log('Instructions:', instructions);
    if (instructions === 'signup') {
        console.log('here 1');
        const json  = await client.get(id(mobileNumber))
        console.log('json:', json);
        if(json !== null) {
            console.log('here');
            const data = JSON.parse(json as string)
            const address = data.address
            const sessionString = randomString(10);
            await client.set(id(mobileNumber), JSON.stringify({address: address, session: sessionString}))
            const {Balance} = await update(address)
            res.send({deployedWallet: address, Balance: Balance, session: sessionString});
        }else {
            console.log('here 2');
            const sessionString = randomString(10);
            let address;
            try{
                console.log('here 3');
                address = await safeConstructTx(mobileNumber);
                console.log('Address:', address);
            }catch(error){
                console.error(error)
                res.send({error: 'Error creating wallet'})
            }
            if(address !== undefined) {
                const jsonNew = JSON.stringify({address: address, session: sessionString})
                await client.set(id(mobileNumber), jsonNew)
            }
            const {Balance} = await update(address as string)
            res.send({deployedWallet: address, Balance: Balance, session: sessionString});
        }
    }
    if(instructions === 'sendETH') {
        const json = await client.get(id(mobileNumber))
        const data = JSON.parse(json as string)
        if(json !== null && sessionKey === data.session) {
            const sessionString = data.session
            const address: string = data.address
            // Safe Part
            const amountInWei = ethers.parseEther(amount)
            const safeTransactionData: MetaTransactionData = {
                to: destination,
                data: '0x',
                value: amountInWei.toString(),
              }
            const owner:Safe = await Safe.init({
                provider: RPC_URL,
                signer: PRIVATE_KEY,
                safeAddress: address
            })
            console.log('Owner:', await owner.getAddress());
              // Create a Safe transaction with the provided parameters
            const safeTransaction = await owner.createTransaction({ transactions: [safeTransactionData] })
            const safeTxHash = await owner.getTransactionHash(safeTransaction)
            const senderSignature = await owner.signHash(safeTxHash)
            await apiKit.proposeTransaction({
                safeAddress: address,
                safeTransactionData: safeTransaction.data,
                safeTxHash,
                senderAddress: wallet.address,
                senderSignature: senderSignature.data,
              })
            const pendingTransactions = (await apiKit.getPendingTransactions(address)).results
            const transaction = pendingTransactions[0]
            const safeTxHash2 = transaction.safeTxHash
            const signature = await owner.signHash(safeTxHash2)
            await apiKit.confirmTransaction(safeTxHash2, signature.data)
            const safeTransaction2 = await apiKit.getTransaction(safeTxHash2)
            const executeTxResponse = await owner.executeTransaction(safeTransaction2)
            const receipt = await executeTxResponse.transactionResponse

            const {Balance} = await update(address)
            res.send({deployedWallet: address, Balance: Balance, session: sessionString});
        }else {
            res.send({error: 'No wallet found or session expired'})
        }
    }
    if(instructions === 'sendToken') {
        const json = await client.get(id(mobileNumber))
        const data = JSON.parse(json as string)
        if(json !== null && sessionKey === data.session) {
            const sessionString = data.session
            const address: string = data.address
            const tokenSymbol: 'USDC' | 'DEGEN' = token
            console.log('Token:', tokenSymbol);
            const tokenAddress = Tokens[tokenSymbol].address
            console.log('Token Address:', tokenAddress);
            const erc20Abi = [
                "function transfer(address recipient, uint256 amount) public returns (bool)"
            ];
            const contract = new ethers.Contract(tokenAddress, erc20Abi)
            const recipient = destination
            const amount2 = ethers.parseUnits(amount.toString(), 6)
            const dataTx = contract.interface.encodeFunctionData('transfer', [recipient, amount2])
            console.log('Data:', dataTx);
            // Safe Part
            const amountInWei = ethers.parseEther("0")
            const safeTransactionData: MetaTransactionData = {
                to: tokenAddress,
                data: dataTx,
                value: amountInWei.toString(),
              }
            const owner:Safe = await Safe.init({
                provider: RPC_URL,
                signer: PRIVATE_KEY,
                safeAddress: address
            })
            console.log('Owner:', await owner.getAddress());
              // Create a Safe transaction with the provided parameters
            const safeTransaction = await owner.createTransaction({ transactions: [safeTransactionData] })
            const safeTxHash = await owner.getTransactionHash(safeTransaction)
            const senderSignature = await owner.signHash(safeTxHash)
            await apiKit.proposeTransaction({
                safeAddress: address,
                safeTransactionData: safeTransaction.data,
                safeTxHash,
                senderAddress: wallet.address,
                senderSignature: senderSignature.data,
              })
            const pendingTransactions = (await apiKit.getPendingTransactions(address)).results
            const transaction = pendingTransactions[0]
            const safeTxHash2 = transaction.safeTxHash
            const signature = await owner.signHash(safeTxHash2)
            await apiKit.confirmTransaction(safeTxHash2, signature.data)
            const safeTransaction2 = await apiKit.getTransaction(safeTxHash2)
            const executeTxResponse = await owner.executeTransaction(safeTransaction2)
            const receipt = await executeTxResponse.transactionResponse
            //Safe Part end
            const {Balance} = await update(address)
            res.send({deployedWallet: address, Balance: Balance, session: sessionString});
        }else {
            res.send({error: 'No wallet found or session expired'})
        }
    }
    if(instructions === 'recharge') {
        const json = await client.get(id(mobileNumber))
        const data = JSON.parse(json as string)
        if(json !== null && sessionKey === data.session) {
            const sessionString = data.session
            const address = data.address
            await recharge(address)
            const {Balance} = await update(address)
            res.send({deployedWallet: address, Balance: Balance, session: sessionString});
        }else {
            res.send({error: 'No wallet found or session expired'})
        }
    }
    client.quit()
});

// Define a POST endpoint
// For sending updated State of the wallet
app.post('/api/refresh', async (req: Request, res: Response) => {
    const client = await getDefaultClient()
    const receivedData = req.body;
    const mobileNumber = receivedData.sender;
    const sessionKey = receivedData.session;
    const json = await client.get(id(mobileNumber))
    const data = JSON.parse(json as string)
    // fetch address from the database
    if(json !== null && sessionKey === data.session) {
        const sessionString = data.session
        const address = data.address
        const {Balance} = await update(address)
        res.send({deployedWallet: address, Balance: Balance, session: sessionString});
    }else {
        res.send({error: 'No wallet found or session expired'})
    }
    client.quit()
});

// Define the port to run the server on
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
