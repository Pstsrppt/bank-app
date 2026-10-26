# Design Decisions

เอกสารนี้อธิบายว่าทำไมหน้าเว็บถึงออกแบบแบบนี้ อ้างอิงตามสไลด์ CSI301 L9 Web3 DApp Architecture Blueprint

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌────────────────────┐
│  index.html  │ ──▶ │   MetaMask   │ ──▶ │  Bank.sol (Sepolia) │
│  (Frontend)  │ ◀── │  (Provider + │ ◀── │  deposit / withdraw │
│ GitHub Pages │     │    Signer)   │     │  checkBlance        │
└──────────────┘     └──────────────┘     └────────────────────┘
```

Frontend คุยกับ blockchain โดยตรงไม่ได้ ต้องผ่าน MetaMask ซึ่งใช้ Ethers.js v6 เป็นตัวเชื่อม (สไลด์หน้า 5)

### การแบ่ง JavaScript module

| File | หน้าที่ | เหตุผล |
|---|---|---|
| `config.js` | address, network, ข้อมูลนักศึกษา | หลัง deploy ต้องแก้แค่ไฟล์นี้ |
| `abi.js` | ABI ของ contract | แยกจาก logic เมื่อ contract เปลี่ยน แก้ที่นี่ที่เดียว |
| `vendor.js` | import ethers (ล็อก version) | เปลี่ยน version ได้จากที่เดียว |
| `wallet.js` | MetaMask: connect, network, events | Middleware layer |
| `bank.js` | เรียกฟังก์ชัน contract, อ่าน event, แปล error | Contract layer — เป็นไฟล์เดียวที่เรียก contract |
| `ui.js` | render อย่างเดียว ไม่เรียก blockchain | ทดสอบหน้าตาได้โดยไม่ต้องมีกระเป๋า |
| `main.js` | เก็บ state + ผูก event ของปุ่ม | จุดเริ่มต้นของแอป |

## UX ที่เพิ่มจาก wireframe และเหตุผล

| # | สิ่งที่ทำ | เหตุผล |
|---|---|---|
| 1 | **Authentication Gate** ซ่อนปุ่มธุรกรรมจนกว่าจะ Connect | ตามสไลด์หน้า 6 และกันการกดปุ่มตอนที่ยังไม่มี `msg.sender` |
| 2 | **ตรวจ network + ปุ่มสลับไป Sepolia** | ปัญหาที่เจอบ่อยที่สุดคือกระเป๋าอยู่ Mainnet ทำให้เรียก contract ไม่ได้หรือเสี่ยงเสียเงินจริง |
| 3 | **แสดงยอดธนาคารและยอดกระเป๋าคู่กัน** | ผู้ใช้มักสับสนระหว่างเงินใน contract กับเงินใน MetaMask |
| 4 | **Validation ก่อนส่ง** ปิดปุ่มเมื่อยอดไม่พอ พร้อมบอกเหตุผล | ธุรกรรมที่ revert ก็ยังเสียค่า Gas จึงควรกันไว้ที่หน้าเว็บ |
| 5 | **ปุ่มจำนวนลัด + ถอนทั้งหมด** | การพิมพ์ทศนิยมยาว ๆ ผิดได้ง่าย และการถอนทั้งหมดต้องตรงทุกหลัก wei |
| 6 | **ปุ่มสีแยกชัด** (เขียว = เงินเข้า, ส้ม = เงินออก) และบอกทิศทางใต้ปุ่ม | สไลด์หน้า 10: "แยกสีชัดเจนเพื่อป้องกัน User Error" |
| 7 | **Feedback 3 ขั้น** Confirm → Pending (ลิงก์ Etherscan) → Success/Fail | ธุรกรรมใช้เวลา 10–20 วินาที ถ้าไม่มีสถานะ ผู้ใช้จะคิดว่าเว็บค้างแล้วกดซ้ำ |
| 8 | **ข้อความ error ภาษาไทย** | error ดิบอย่าง `ACTION_REJECTED` หรือ `execution reverted` ผู้ใช้ทั่วไปอ่านไม่เข้าใจ |
| 9 | **ประวัติจาก Event Log** กรองตาม address ของผู้ใช้ | ใช้ event `Deposit`/`Withdraw` ตามสไลด์หน้า 3 และตรวจย้อนหลังได้จากข้อมูลบน chain จริง |
| 10 | **ป้าย "CheckBalance ฟรี ไม่เสีย Gas"** | สไลด์หน้า 4 และ 9 ช่วยให้ผู้ใช้กล้ากด Refresh |
| 11 | **รีโหลดเมื่อเปลี่ยน account/network** | ข้อมูลบนหน้าจอจะไม่ค้างเป็นของบัญชีเก่า |
| 12 | **Responsive** 2 คอลัมน์ → 1 คอลัมน์ | ใช้งานบนมือถือได้ |

## หมายเหตุเรื่อง contract

`contracts/Bank.sol` ใช้ตามที่โจทย์ให้มาโดยไม่แก้ไข

- `checkBlance` สะกดตามโจทย์ ไฟล์ ABI จึงใช้ชื่อเดียวกัน
- `withdraw` ใช้ `transfer` ก่อนหักยอด ทำงานได้ถูกต้องเพราะ `transfer` จำกัด gas ไว้ที่ 2300 แต่แนวปฏิบัติที่ดีคือหักยอดก่อนโอน (Checks-Effects-Interactions) ส่วน compiler 0.8.3x จะขึ้น warning ว่า `transfer` deprecated ซึ่งไม่กระทบการทำงาน
