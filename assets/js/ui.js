/**
 * UI layer — pure rendering helpers. No blockchain calls in this file.
 */
import { ethers } from "./vendor.js";
import { CONTRACT, NETWORK, STUDENT, UI } from "./config.js";

export const $ = (id) => document.getElementById(id);
export const formatEth = (wei) =>
  Number(ethers.formatEther(wei)).toLocaleString("en-US", { maximumFractionDigits: 6 });
export const shorten = (s) => `${s.slice(0, 6)}…${s.slice(-4)}`;

const txUrl = (hash) => `${NETWORK.explorer}/tx/${hash}`;
const formatTime = (sec) =>
  sec ? new Date(sec * 1000).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "";
const show = (id, visible) => $(id).classList.toggle("hidden", !visible);
const banner = (id, visible) => $(id).classList.toggle("show", visible);

export function renderIdentity() {
  $("studentLine").textContent = `Student ID: ${STUDENT.id} | Name: ${STUDENT.nameEn}`;
  $("studentSub").textContent = `${STUDENT.nameTh} · CSI301 Assignment 5 — Bank DApp`;
  document.title = `Bank DApp · ${STUDENT.id}`;
}

export function renderBanners({ noMetaMask = false, wrongNetwork = false, notConfigured = false }) {
  banner("noMetaMask", noMetaMask);
  banner("wrongNet", wrongNetwork);
  banner("noContract", notConfigured);
}

/** State 1 — locked gate. */
export function renderLocked() {
  show("gate", true);
  show("app", false);
  show("connectBtn", true);
  show("addrChip", false);
  show("netChip", false);
  show("switchAccBtn", false);
  show("disconnectBtn", false);
}

/** State 2 — unlocked dashboard. */
export function renderUnlocked(session) {
  show("gate", false);
  show("app", true);
  show("connectBtn", false);
  show("addrChip", true);
  show("netChip", true);
  show("switchAccBtn", true);
  show("disconnectBtn", true);

  const ok = session.isCorrectNetwork;
  $("addrShort").textContent = shorten(session.account);
  $("netName").textContent = ok ? NETWORK.name : `Chain ${session.chainId}`;
  $("netDot").className = `dot ${ok ? "ok" : "bad"}`;
  $("infoNet").textContent = ok ? `${NETWORK.name} (${parseInt(NETWORK.chainId, 16)})` : `ผิดเครือข่าย — ${session.chainId}`;
  $("infoAddr").textContent = session.account;
  $("infoContract").innerHTML = CONTRACT.address
    ? `<a href="${NETWORK.explorer}/address/${CONTRACT.address}" target="_blank" rel="noopener">${CONTRACT.address}</a>`
    : "ยังไม่ตั้งค่า";
}

export function renderBalances({ bankWei, walletWei }) {
  $("bankBal").textContent = formatEth(bankWei);
  $("walletBal").textContent = formatEth(walletWei);
}

/** Enable/disable action buttons and explain why. */
export function renderValidation({ hint, isError, canDeposit, canWithdraw }) {
  $("hint").textContent = hint;
  $("hint").classList.toggle("bad", isError);
  $("depositBtn").disabled = !canDeposit;
  $("withdrawBtn").disabled = !canWithdraw;
}

/**
 * Feedback section — 3-step transaction progress.
 * step: 1 = waiting for MetaMask, 2 = pending on chain, 3 = done, -1 = failed
 */
export function renderFeedback(type, title, { detail = "", step = 0, hash } = {}) {
  const box = $("feedback");
  box.className = `feedback ${type}`;

  const bars = [1, 2, 3].map((i) => {
    let cls = "";
    if (step === -1) cls = "fail";
    else if (type === "success" || i < step) cls = "done";
    else if (i === step) cls = "on";
    return `<i class="${cls}"></i>`;
  }).join("");

  const icon = { pending: '<span class="spin"></span>', success: "✅ ", error: "⚠️ " }[type] ?? "";
  const showSteps = type !== "idle" && step !== 0; // step 0 = not a transaction (e.g. wallet errors)
  const link = hash
    ? `Tx: <a class="mono" href="${txUrl(hash)}" target="_blank" rel="noopener">${shorten(hash)}</a> · ดูบน Etherscan`
    : "";

  box.innerHTML = `
    <b>${icon}${title}</b>
    ${showSteps ? `<div class="tx-steps">${bars}</div>` : ""}
    <div class="sub">${detail || link}</div>`;
}

export function renderHistory(rows) {
  const list = $("history");
  $("historyNote").textContent = `${UI.historyLimit} รายการล่าสุด · จาก Event บนบล็อกเชน`;
  if (rows === null) {
    list.innerHTML = '<li class="empty">โหลดประวัติไม่สำเร็จ</li>';
    return;
  }
  if (!rows.length) {
    list.innerHTML = '<li class="empty">ยังไม่มีรายการ — ลองฝากเงินครั้งแรกดู</li>';
    return;
  }
  list.innerHTML = rows.map((r) => {
    const isDeposit = r.type === "deposit";
    return `
      <li>
        <span class="tag ${isDeposit ? "dep" : "wd"}">${isDeposit ? "Deposit" : "Withdraw"}</span>
        <div class="tx-meta">
          <a class="mono sub" href="${txUrl(r.hash)}" target="_blank" rel="noopener">${shorten(r.hash)}</a>
          <span class="sub">${formatTime(r.timestamp)}</span>
        </div>
        <span class="amt">${isDeposit ? "+" : "−"}${formatEth(r.amount)} ETH</span>
      </li>`;
  }).join("");
}

export function renderQuickAmounts(amounts) {
  $("quickAmounts").innerHTML =
    amounts.map((v) => `<button type="button" data-amount="${v}">${v}</button>`).join("") +
    `<button type="button" id="maxBtn">ถอนทั้งหมด</button>`;
}
