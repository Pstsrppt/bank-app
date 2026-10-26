# Bank DApp

Web3 DApp สำหรับฝาก ถอน และเช็กยอดเงินกับ Bank Smart Contract บน Ethereum Sepolia ผ่าน MetaMask

> **CSI301 Blockchain — Assignment 5**
> Student ID: **66095681** · Name: **Pongsathorn Siriprompitak** (พงศธร ศิริพรหมพิทักษ์)

**Live demo:** https://pstsrppt.github.io/bank-app/

## Features

- Connect MetaMask พร้อม Authentication Gate
- สลับบัญชี (เปิดหน้าต่างเลือกบัญชีของ MetaMask) และออกจากระบบ
- Deposit / Withdraw / CheckBalance
- ตรวจเครือข่ายและสลับไป Sepolia ได้ในคลิกเดียว
- Validation ก่อนส่งธุรกรรม เพื่อไม่ให้เสีย gas ไปฟรี
- สถานะธุรกรรม 3 ขั้น พร้อมลิงก์ Etherscan
- ประวัติธุรกรรมจาก contract events
- Responsive ใช้บนมือถือได้

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (ES Modules) — ไม่ต้อง build |
| Web3 | Ethers.js v6, MetaMask |
| Smart Contract | Solidity ^0.8.0 บน Sepolia testnet |
| Hosting | GitHub Pages |

## Project Structure

```
bank-dapp/
├── index.html              # Markup เท่านั้น
├── assets/
│   ├── css/
│   │   └── styles.css      # Design tokens + components
│   └── js/
│       ├── config.js       # ⚙️ Contract address / network / student info
│       ├── abi.js          # Bank contract ABI
│       ├── vendor.js       # ethers.js (pinned version)
│       ├── wallet.js       # MetaMask connection & network
│       ├── bank.js         # Contract calls, events, error mapping
│       ├── ui.js           # Rendering only
│       └── main.js         # App state & event wiring
├── contracts/
│   └── Bank.sol            # Smart contract (from assignment)
├── docs/
│   └── DESIGN.md           # Architecture & UX decisions
├── .editorconfig
├── .gitignore
└── .nojekyll
```

## Getting Started

### 1. Deploy the contract

1. เปิด `contracts/Bank.sol` ใน [Remix](https://remix.ethereum.org) แล้ว compile
2. Environment: **Injected Provider – MetaMask** (เครือข่าย Sepolia)
3. Deploy แล้วคัดลอก contract address

### 2. Configure

แก้ `assets/js/config.js`

```js
export const CONTRACT = {
  address: "0xYourBankContractAddress",
  deployBlock: 0,
};
```

### 3. Run locally

ต้องเปิดผ่าน `http://` เพราะ ES Modules และ MetaMask ไม่ทำงานกับ `file://`

- **VS Code:** คลิกขวาที่ `index.html` → **Open with Live Server**
- หรือรันคำสั่ง `npx serve .`

### 4. Deploy to GitHub Pages

1. Push โค้ดขึ้น GitHub repository
2. ไปที่ **Settings → Pages → Source:** `Deploy from a branch` → `main` / `/ (root)`
3. นำ URL ที่ได้ไปส่งในระบบ dlearning

## Documentation

- [Design Decisions](docs/DESIGN.md) — สถาปัตยกรรมและเหตุผลด้าน UX/UI
