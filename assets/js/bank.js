/**
 * Bank service — every interaction with the Bank smart contract lives here.
 *   deposit()      : payable, state-changing (costs gas)  → emits Deposit
 *   withdraw(amt)  : state-changing (costs gas)            → emits Withdraw
 *   checkBlance()  : view, read-only (free, no gas)
 */
import { ethers } from "./vendor.js";
import { BANK_ABI } from "./abi.js";
import { CONTRACT, UI } from "./config.js";

export const isConfigured = () => ethers.isAddress(CONTRACT.address);

export function createBank(signer) {
  const contract = new ethers.Contract(CONTRACT.address, BANK_ABI, signer);

  return {
    /** Free read — returns balance in wei (bigint). */
    getBalance: () => contract.checkBlance(),

    /** ETH is attached as `value` (msg.value), not as a function argument. */
    deposit: (wei) => contract.deposit({ value: wei }),

    withdraw: (wei) => contract.withdraw(wei),

    /** Deposit/Withdraw events for one account, newest first. */
    async getHistory(account, provider) {
      const latest = await provider.getBlockNumber();
      const from = CONTRACT.deployBlock || Math.max(0, latest - UI.historyLookbackBlocks);
      const [deposits, withdrawals] = await Promise.all([
        contract.queryFilter(contract.filters.Deposit(account), from, latest),
        contract.queryFilter(contract.filters.Withdraw(account), from, latest),
      ]);
      return [
        ...deposits.map((e) => ({ type: "deposit", amount: e.args.amount, hash: e.transactionHash, block: e.blockNumber, index: e.index })),
        ...withdrawals.map((e) => ({ type: "withdraw", amount: e.args.amount, hash: e.transactionHash, block: e.blockNumber, index: e.index })),
      ].sort((a, b) => b.block - a.block || b.index - a.index);
    },
  };
}

/** Translate wallet / contract errors into messages a normal user understands. */
export function toFriendlyError(err) {
  const msg = (err?.shortMessage || err?.reason || err?.message || "").toLowerCase();
  if (err?.code === "ACTION_REJECTED" || msg.includes("user rejected")) return "คุณกดยกเลิก (Reject) ใน MetaMask — ไม่มีการตัดเงิน";
  if (msg.includes("insufficient funds")) return "ETH ในกระเป๋าไม่พอสำหรับจำนวนเงิน + ค่า Gas";
  if (msg.includes("not enough money")) return "ยอดเงินในธนาคารไม่พอสำหรับการถอน";
  if (msg.includes("deposit money is zero")) return "จำนวนเงินฝากต้องมากกว่า 0";
  return err?.shortMessage || err?.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}
