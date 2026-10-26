/**
 * Human-readable ABI of contracts/Bank.sol.
 * Note: `checkBlance` keeps the original spelling from the assignment contract.
 */
export const BANK_ABI = [
  "function deposit() payable",
  "function withdraw(uint amount)",
  "function checkBlance() view returns (uint balance)",
  "event Deposit(address indexed owner, uint amount)",
  "event Withdraw(address indexed owner, uint amount)",
];
