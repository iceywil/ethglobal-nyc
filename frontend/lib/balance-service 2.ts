import { ethers } from 'ethers';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { getTokensMarketData, TokenMarketData } from './coingecko';

interface Balance {
  coin: string;
  amount: number;
  usdValue: number;
}

const ETHEREUM_RPC = 'https://rpc.ankr.com/eth';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const getEthereumBalance = async (address: string): Promise<number> => {
  try {
    const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (error) {
    console.error('Error fetching Ethereum balance:', error);
    return 0;
  }
};

const getSolanaBalance = async (address: string): Promise<number> => {
  try {
    const connection = new Connection(SOLANA_RPC);
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    return 0;
  }
};

const getBitcoinBalance = async (address: string): Promise<number> => {
  try {
    const response = await axios.get(`https://blockchain.info/q/addressbalance/${address}`);
    return response.data / 100000000; // Convert satoshis to BTC
  } catch (error) {
    console.error('Error fetching Bitcoin balance:', error);
    return 0;
  }
};

export const getBalances = async (addresses: { bitcoin?: string; ethereum?: string; solana?: string }): Promise<Balance[]> => {
  const balances: { coin: string; amount: number }[] = [];

  if (addresses.ethereum) {
    const ethBalance = await getEthereumBalance(addresses.ethereum);
    if (ethBalance > 0) balances.push({ coin: 'ethereum', amount: ethBalance });
  }

  if (addresses.solana) {
    const solBalance = await getSolanaBalance(addresses.solana);
    if (solBalance > 0) balances.push({ coin: 'solana', amount: solBalance });
  }

  if (addresses.bitcoin) {
    const btcBalance = await getBitcoinBalance(addresses.bitcoin);
    if (btcBalance > 0) balances.push({ coin: 'bitcoin', amount: btcBalance });
  }

  if (balances.length === 0) return [];

  const tokenIds = balances.map(b => b.coin);
  const marketData: TokenMarketData[] = await getTokensMarketData(tokenIds);

  return balances.map(balance => {
    const marketInfo = marketData.find(m => m.id.toLowerCase() === balance.coin.toLowerCase());
    return {
      ...balance,
      usdValue: marketInfo ? balance.amount * marketInfo.current_price : 0,
    };
  });
};
