// js/web3.js
import { Contract, BrowserProvider } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config.js';


let provider, signer, contract;

export async function initWeb3() {
  if (!window.ethereum) throw new Error('MetaMask chưa cài đặt');
  provider = new BrowserProvider(window.ethereum);
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  signer = await provider.getSigner();
  contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  return { provider, signer, contract };
}

export function getContract() {
  if (!contract) throw new Error('Chưa init Web3');
  return contract;
}

export async function getAccount() {
  if (!signer) throw new Error('Chưa init Web3');
  return signer.getAddress();
}