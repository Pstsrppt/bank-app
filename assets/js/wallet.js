/**
 * Wallet layer — MetaMask connection, account & network state.
 * (Middleware: Frontend → Web3 Provider → Ethereum Network)
 */
import { ethers } from "./vendor.js";
import { NETWORK } from "./config.js";

export const hasMetaMask = () => typeof window.ethereum !== "undefined";

/** Ask MetaMask for permission, then return the current session. */
export async function connectWallet() {
  await window.ethereum.request({ method: "eth_requestAccounts" });
  return getSession();
}

/**
 * Read the current session without prompting.
 * Returns null when the user has not connected yet (locked gate).
 */
export async function getSession() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_accounts", []);
  if (!accounts.length) return null;

  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const chainIdHex = "0x" + network.chainId.toString(16);

  return {
    provider,
    signer,
    account: ethers.getAddress(accounts[0]),
    chainId: network.chainId,
    isCorrectNetwork: chainIdHex === NETWORK.chainId,
  };
}

/** Re-open MetaMask's account picker so the user can choose a different account. */
export async function switchAccount() {
  await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
  return getSession();
}

/** Revoke this site's access in MetaMask. Older wallets lack this method, so failures are ignored. */
export async function disconnectWallet() {
  await window.ethereum
    .request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] })
    .catch(() => {});
}

export async function switchToTargetNetwork() {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: NETWORK.chainId }],
  });
}

/** Re-run `onChange` whenever the user switches account or network in MetaMask. */
export function watchWallet({ onAccountChange, onChainChange }) {
  window.ethereum.on?.("accountsChanged", onAccountChange);
  window.ethereum.on?.("chainChanged", onChainChange);
}
