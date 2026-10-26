/**
 * App entry — owns state and wires UI events to wallet & bank services.
 */
import { ethers } from "./vendor.js";
import { UI } from "./config.js";
import { hasMetaMask, connectWallet, getSession, switchAccount, disconnectWallet, switchToTargetNetwork, watchWallet } from "./wallet.js";
import { createBank, isConfigured, toFriendlyError } from "./bank.js";
import * as view from "./ui.js";

const { $ } = view;

const state = {
  session: null,
  bank: null,
  bankWei: 0n,
  walletWei: 0n,
  busy: false,
  walletBusy: false, // a MetaMask connect / switch prompt is open
};

const canTransact = () => !!state.bank && state.session?.isCorrectNetwork && !state.busy;

/* Remembers a logout so the page does not auto-unlock again on reload
   (needed for wallets that cannot revoke the site's permission). */
const LOGGED_OUT_KEY = "bank-dapp:logged-out";
const isLoggedOut = () => { try { return localStorage.getItem(LOGGED_OUT_KEY) === "1"; } catch { return false; } };
const setLoggedOut = (on) => { try { on ? localStorage.setItem(LOGGED_OUT_KEY, "1") : localStorage.removeItem(LOGGED_OUT_KEY); } catch { /* storage blocked */ } };

/* ---------- Bootstrap ---------- */

async function loadSession() {
  state.session = isLoggedOut() ? null : await getSession();
  if (!state.session) {
    state.bank = null;
    view.renderBanners({});
    view.renderLocked();
    return;
  }

  const { signer, isCorrectNetwork } = state.session;
  state.bank = isConfigured() ? createBank(signer) : null;

  view.renderBanners({ wrongNetwork: !isCorrectNetwork, notConfigured: !isConfigured() });
  view.renderUnlocked(state.session);
  await refresh();
}

/* ---------- Reads (free) ---------- */

async function refresh() {
  const { provider, account, isCorrectNetwork } = state.session;
  state.walletWei = await provider.getBalance(account);
  state.bankWei = state.bank && isCorrectNetwork ? await state.bank.getBalance().catch(() => 0n) : 0n;

  view.renderBalances(state);
  validate();
  loadHistory();
}

async function loadHistory() {
  if (!state.bank || !state.session.isCorrectNetwork) return view.renderHistory([]);
  try {
    view.renderHistory(await state.bank.getHistory(state.session.account, state.session.provider));
  } catch (err) {
    console.warn(err);
    view.renderHistory(null);
  }
}

/* ---------- Validation (prevent failed tx = wasted gas) ---------- */

function parseAmount() {
  const raw = $("amount").value.trim();
  if (!raw || Number(raw) <= 0) return null;
  try { return ethers.parseEther(raw); } catch { return null; }
}

function validate() {
  const wei = parseAmount();
  const ready = canTransact();

  if (!state.bank) return view.renderValidation({ hint: "ยังไม่ได้ตั้งค่า Contract Address", isError: false, canDeposit: false, canWithdraw: false });
  if (!state.session.isCorrectNetwork) return view.renderValidation({ hint: "สลับไปเครือข่าย Sepolia ก่อนทำธุรกรรม", isError: false, canDeposit: false, canWithdraw: false });
  if (wei === null) return view.renderValidation({ hint: "กรอกจำนวนเงินมากกว่า 0 แล้วเลือก Deposit หรือ Withdraw", isError: false, canDeposit: false, canWithdraw: false });

  const depositOk = wei <= state.walletWei;
  const withdrawOk = wei <= state.bankWei;
  const problems = [];
  if (!depositOk) problems.push("ฝากไม่ได้: ยอดในกระเป๋าไม่พอ");
  if (!withdrawOk) problems.push(`ถอนไม่ได้: ยอดในธนาคารไม่พอ (มี ${view.formatEth(state.bankWei)} ETH)`);

  view.renderValidation({
    hint: problems.length ? problems.join(" · ") : "พร้อมทำธุรกรรม — จะมีหน้าต่าง MetaMask ให้ยืนยัน",
    isError: problems.length === 2,
    canDeposit: ready && depositOk,
    canWithdraw: ready && withdrawOk,
  });
}

/* ---------- Writes (cost gas) ---------- */

async function transact(kind) {
  const wei = parseAmount();
  if (wei === null) return;

  const label = kind === "deposit" ? "ฝากเงิน" : "ถอนเงิน";
  const amountText = `${view.formatEth(wei)} ETH`;
  state.busy = true;
  validate();

  try {
    view.renderFeedback("pending", `รอยืนยันใน MetaMask… (${label} ${amountText})`, {
      detail: "ตรวจสอบจำนวนเงินและค่า Gas ในหน้าต่าง MetaMask แล้วกด Confirm", step: 1,
    });

    const tx = kind === "deposit" ? await state.bank.deposit(wei) : await state.bank.withdraw(wei);
    view.renderFeedback("pending", "Transaction Pending… กำลังรอบล็อกยืนยัน", { step: 2, hash: tx.hash });

    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error("Transaction reverted");

    view.renderFeedback("success", `Success! ${label} ${amountText} สำเร็จ`, { step: 3, hash: tx.hash });
    $("amount").value = "";
    await refresh();
  } catch (err) {
    view.renderFeedback("error", `${label}ไม่สำเร็จ`, { detail: toFriendlyError(err), step: -1 });
  } finally {
    state.busy = false;
    validate();
  }
}

/* ---------- Event wiring ---------- */

const WALLET_BUTTONS = ["connectBtn", "gateConnect", "switchAccBtn", "disconnectBtn"];
const isUserRejection = (err) => err?.code === 4001 || err?.code === "ACTION_REJECTED";

/**
 * Run a MetaMask prompt (connect / switch account) at most once at a time.
 * The user cancelling is not an error — they know they cancelled, so stay quiet.
 */
async function walletAction(request, failTitle) {
  if (state.walletBusy) return;
  state.walletBusy = true;
  WALLET_BUTTONS.forEach((id) => ($(id).disabled = true));
  try {
    await request();
    setLoggedOut(false);
  } catch (err) {
    if (err?.code === -32002) {
      view.renderFeedback("error", failTitle, { detail: "มีหน้าต่าง MetaMask ค้างอยู่ — เปิด MetaMask เพื่อทำต่อ" });
    } else if (!isUserRejection(err)) {
      view.renderFeedback("error", failTitle, { detail: toFriendlyError(err) });
    }
  } finally {
    state.walletBusy = false;
    WALLET_BUTTONS.forEach((id) => ($(id).disabled = false));
  }
  // Always re-sync: a cancelled switch has already revoked the old account, so this may show the gate.
  await loadSession().catch(console.warn);
}

const onConnect = () => walletAction(connectWallet, "เชื่อมต่อไม่สำเร็จ");
const onSwitchAccount = () => walletAction(switchAccount, "สลับบัญชีไม่สำเร็จ");

async function onDisconnect() {
  setLoggedOut(true);
  await disconnectWallet();
  $("amount").value = "";
  view.renderFeedback("idle", "สถานะธุรกรรมจะแสดงที่นี่");
  await loadSession();
}

function bindEvents() {
  $("connectBtn").addEventListener("click", onConnect);
  $("gateConnect").addEventListener("click", onConnect);
  $("switchAccBtn").addEventListener("click", onSwitchAccount);
  $("disconnectBtn").addEventListener("click", onDisconnect);
  $("switchBtn").addEventListener("click", () => switchToTargetNetwork().catch(() =>
    view.renderFeedback("error", "สลับเครือข่ายไม่สำเร็จ", { detail: "กรุณาเลือก Sepolia ใน MetaMask ด้วยตนเอง" })));
  $("refreshBtn").addEventListener("click", refresh);
  $("depositBtn").addEventListener("click", () => transact("deposit"));
  $("withdrawBtn").addEventListener("click", () => transact("withdraw"));
  $("amount").addEventListener("input", validate);

  $("quickAmounts").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    $("amount").value = btn.id === "maxBtn" ? ethers.formatEther(state.bankWei) : btn.dataset.amount;
    validate();
  });

  $("addrChip").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.session.account);
      $("addrShort").textContent = "คัดลอกแล้ว ✓";
      setTimeout(() => ($("addrShort").textContent = view.shorten(state.session.account)), 1200);
    } catch { /* clipboard blocked — ignore */ }
  });
}

/* ---------- Start ---------- */

view.renderIdentity();
view.renderQuickAmounts(UI.quickAmounts);
bindEvents();

if (hasMetaMask()) {
  watchWallet({ onAccountChange: loadSession, onChainChange: () => window.location.reload() });
  loadSession().catch(console.warn); // auto-unlock if the site was already approved
} else {
  view.renderBanners({ noMetaMask: true });
}
