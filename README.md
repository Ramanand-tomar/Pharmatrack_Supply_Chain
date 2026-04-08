# PharmaTrack — Blockchain Pharmaceutical Supply Chain

PharmaTrack is an end-to-end pharmaceutical supply chain management system built on the **Ethereum (Sepolia)** blockchain. It provides immutable traceability of medicines from raw material suppliers all the way to the end consumer, enables instant batch recalls, and gives the public a way to verify product authenticity by scanning a QR code.

The project combines an on-chain Solidity smart contract (source of truth for stage transitions and ownership), a Node.js/Express backend (off-chain workflows, IPFS metadata, real-time alerts), and a React + Vite frontend with role-based dashboards for each participant in the supply chain.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Smart Contract](#smart-contract)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Key Features](#key-features)
7. [Project Structure](#project-structure)
8. [Setup & Installation](#setup--installation)
9. [Running the Project](#running-the-project)
10. [Environment Variables](#environment-variables)
11. [Workflow Overview](#workflow-overview)

---

## Architecture

```
┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
│   React Frontend   │ ──────► │  Node.js Backend   │ ──────► │      MongoDB       │
│ (Vite + TS + UI)   │         │  (Express + IO)    │         │ (Users, Requests)  │
└─────────┬──────────┘         └─────────┬──────────┘         └────────────────────┘
          │ ethers.js                    │ Socket.io / IPFS
          ▼                              ▼
┌────────────────────────────────────────────────────┐
│   Solidity Smart Contract (Sepolia Testnet)        │
│   SupplyChain.sol — roles, stages, recalls         │
└────────────────────────────────────────────────────┘
```

- **On-chain (Sepolia):** all medicine records, stage transitions, role assignments, recalls.
- **Off-chain (MongoDB + IPFS):** user accounts, product/role requests pending admin approval, medicine images, recall alert history.
- **Real-time layer (Socket.io):** instantly propagates critical recall alerts to every connected dashboard.

---

## Tech Stack

### Frontend (`pharmatrack-chain-main/`)
- **React 18** + **Vite 5** + **TypeScript 5**
- **Tailwind CSS** + **shadcn/ui** (Radix primitives)
- **Ethers.js v6** for smart contract interaction
- **Socket.io-client** for real-time recall alerts
- **TanStack Query** + React Context for state
- **React Hook Form** + **Zod** for validation
- **Recharts** for analytics
- **html5-qrcode** + **qrcode.react** for QR scanning/generation
- **Sonner** for toast notifications

### Backend (`backend/`)
- **Node.js** + **Express 5**
- **MongoDB** + **Mongoose**
- **Socket.io** for WebSockets
- **JWT** + **bcryptjs** for authentication
- **Multer** for file uploads
- **IPFS** integration for decentralized image storage

### Blockchain
- **Solidity ^0.8.19**
- **Sepolia Testnet** (Chain ID `11155111`)
- Contract address: `0x44aFb17E5108871ED2685ac7B9949C0Fc434BFB7`
- RPC: `ethereum-sepolia.publicnode.com`

---

## Smart Contract

Located at [pharmatrack-chain-main/contract/SupplyChain.sol](pharmatrack-chain-main/contract/SupplyChain.sol).

### Roles
| Role | Description |
|---|---|
| **Owner** | Deployer; manages all participants and approves medicines |
| **RawMaterialSupplier (RMS)** | Supplies raw materials |
| **Manufacturer** | Produces medicines from raw materials |
| **Distributor** | Ships medicines to retailers |
| **Retailer** | Sells medicines to consumers |
| **Consumer** | End buyer; can rate the medicine |

### Supply Chain Stages
```
Init → RawMaterialSupply → Manufacture → Distribution → Retail → Sold
                                                              └──► Recalled
```

### Key Functions
- **Role management:** `addRMS`, `addManufacturer`, `addDistributor`, `addRetailer` and their `activate*` / `deactivate*` counterparts.
- **Medicine lifecycle:**
  `addMedicine` → `assignRMS` → `rmsSupply` → `assignManufacturer` → `manufacture` → `assignDistributor` → `distribute` → `assignRetailer` → `retail` → `sold(id, consumer, rating)`
- **Recalls:** `recallMedicine(id)`, `recallBatch(batchNumber)` — block any further stage transitions for affected items.
- **View helpers:** `showStage`, `getMedicinesByRMS/Manufacturer/Distributor/Retailer`, `getMedicinesByStage`.
- **Emergency control:** `pause()` / `unpause()`.

### Events
`MedicineAdded`, `StageChanged`, `MedicineSold`, `MedicineRecalled`, `BatchRecalled`, role events (`RMSAdded`, `ManufacturerAdded`, …), `OwnershipTransferred`, `Paused`, `Unpaused`.

Each medicine struct stores stage timestamps to provide a fully auditable trail.

---

## Backend

Entry point: [backend/server.js](backend/server.js)

### REST API (mounted under `/api`)
| Route | Purpose |
|---|---|
| `POST /auth/register` · `POST /auth/login` | JWT-based auth |
| `POST /upload` | Upload medicine image to IPFS |
| `GET /products` | Off-chain product metadata |
| `POST /manufacturer/request-product` | Manufacturer requests a new product (pending approval) |
| `GET /admin/requests` | List pending product requests |
| `POST /admin/requests/:id/approve` · `/reject` | Approve (mint on-chain) or reject |
| `POST /role-requests` | User requests a supply-chain role |
| `GET /admin/role-requests` | List pending role requests |
| `POST /admin/role-requests/:id/approve` · `/reject` | Process role requests |
| `GET /admin/users` | List all users |
| `POST /products/recall-batch` | Trigger a batch recall alert |
| `GET /metadata/:onChainId` | Retrieve IPFS image hash for a medicine |

### Mongoose Models
- `User` — auth and profile
- `ProductRequest` — manufacturer-initiated product creation requests
- `RoleRequest` — role assignment requests
- `RecallAlert` — recall history ([backend/models/RecallAlert.js](backend/models/RecallAlert.js))
- `MedicineMetadata` — link between on-chain medicine ID and IPFS image hash

### WebSockets
- `recall_alert` — broadcasts batch number, reason, and timestamp to every connected client.

---

## Frontend

Located in [pharmatrack-chain-main/src/](pharmatrack-chain-main/src/).

### Pages (`src/pages/`)
| Page | Description |
|---|---|
| [LandingPage.tsx](pharmatrack-chain-main/src/pages/LandingPage.tsx) | Public page — search/scan medicines, view stage timeline, blockchain event history, participant counts |
| [OwnerDashboard.tsx](pharmatrack-chain-main/src/pages/OwnerDashboard.tsx) | Add medicines, manage all participants, approve product/role requests |
| [ManufacturerDashboard.tsx](pharmatrack-chain-main/src/pages/ManufacturerDashboard.tsx) | Request new products, manufacture assigned medicines, recall batches |
| [DistributorDashboard.tsx](pharmatrack-chain-main/src/pages/DistributorDashboard.tsx) | View assignments, transition to Distribution stage |
| [RetailerDashboard.tsx](pharmatrack-chain-main/src/pages/RetailerDashboard.tsx) | Manage inventory, complete sales with consumer ratings |
| [CustomerDashboard.tsx](pharmatrack-chain-main/src/pages/CustomerDashboard.tsx) | Track purchases, view full timeline and recall status |

### Key Components
- [MedicineStageProgress.tsx](pharmatrack-chain-main/src/components/MedicineStageProgress.tsx) — visual stage indicator
- [ProductTimeline.tsx](pharmatrack-chain-main/src/components/ProductTimeline.tsx) — timestamped transition timeline
- [AppSidebar.tsx](pharmatrack-chain-main/src/components/AppSidebar.tsx) — role-aware navigation
- QR scanner / generator modals

### Contexts
- [Web3Context.tsx](pharmatrack-chain-main/src/contexts/Web3Context.tsx) — MetaMask connection, network validation, role detection (by querying contract address mappings), all read/write contract helpers (`fetchMedicine`, `fetchAllMedicines`, `fetchParticipants`, `fetchCounts`, `fetchEvents`).
- [SocketContext.tsx](pharmatrack-chain-main/src/contexts/SocketContext.tsx) — WebSocket connection, displays critical recall toasts with auto-reconnect.

### Contract Helpers
- [src/lib/contract.ts](pharmatrack-chain-main/src/lib/contract.ts) — address, chain ID, RPC, types (`Medicine`, `Participant`, `UserRole`, `Stage`), stage→color map.
- [src/utils/ABI.ts](pharmatrack-chain-main/src/utils/ABI.ts) / [ABI.json](pharmatrack-chain-main/src/utils/ABI.json) — contract ABI.

---

## Key Features

1. **Immutable audit trail** — every stage transition recorded on-chain with timestamps.
2. **Batch recall system** — instantly blocks further stage transitions for recalled batches and broadcasts alerts in real time.
3. **Role-based access control** — five supply-chain roles plus owner, enforced by Solidity modifiers and frontend route guards.
4. **QR/barcode tracking** — generate QR codes per medicine and scan them on the public landing page.
5. **IPFS image storage** — medicine images stored off-chain with on-chain hash references.
6. **Consumer ratings** — retailers capture 1-5 star ratings at point of sale.
7. **Approval workflow** — manufacturers submit product requests; the owner approves them, which mints them on-chain.
8. **Real-time recall alerts** — Socket.io broadcasts critical alerts to every connected dashboard.
9. **Live blockchain event feed** — landing page tails contract events from the last 1000 blocks.
10. **Pause / unpause** — emergency stop for all on-chain operations.

---

## Project Structure

```
Supply Chain Project/
├── backend/
│   ├── server.js              # Express + Socket.io entry point
│   ├── models/                # Mongoose models (User, ProductRequest, RoleRequest, RecallAlert, …)
│   └── package.json
└── pharmatrack-chain-main/
    ├── contract/
    │   └── SupplyChain.sol    # Solidity smart contract
    ├── src/
    │   ├── pages/             # Role-based dashboards + landing
    │   ├── components/        # Sidebar, timelines, stage progress, UI
    │   ├── contexts/          # Web3Context, SocketContext
    │   ├── lib/contract.ts    # Contract address, types, helpers
    │   └── utils/ABI.ts       # Contract ABI
    └── package.json
```

---

## Setup & Installation

### Prerequisites
- **Node.js** 18+ and **npm**
- **MongoDB** running locally or a connection string
- **MetaMask** browser extension
- A small amount of **Sepolia ETH** for gas (use a faucet)

### 1. Clone & install

```bash
git clone <repo-url>
cd "Supply Chain Project"

# Backend
cd backend
npm install

# Frontend
cd ../pharmatrack-chain-main
npm install
```

---

## Running the Project

### Start the backend
```bash
cd backend
npm run dev      # nodemon (development)
# or
npm start        # production
```
Backend runs on `http://localhost:5000` by default.

### Start the frontend
```bash
cd pharmatrack-chain-main
npm run dev
```
Frontend runs on `http://localhost:5173` (Vite default).

### Other scripts
```bash
npm run build    # production build (frontend)
npm run lint     # ESLint
npm run test     # Vitest
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/supplychain
JWT_SECRET=<your-secret>
IPFS_API_KEY=<optional, if using a hosted IPFS provider>
```

### Frontend
Contract address, RPC, and chain ID are defined in [pharmatrack-chain-main/src/lib/contract.ts](pharmatrack-chain-main/src/lib/contract.ts). Update them if redeploying the contract to a different network.

---

## Workflow Overview

1. **Owner** deploys the contract and registers participants (or approves their role requests).
2. **Manufacturer** submits a product request via the backend; the **Owner** approves it, which calls `addMedicine` on-chain and stores the IPFS image hash.
3. **Owner** assigns the medicine to an **RMS**, who calls `rmsSupply` → stage becomes `RawMaterialSupply`.
4. **Owner** assigns it to a **Manufacturer**, who calls `manufacture` → stage becomes `Manufacture`.
5. **Owner** assigns it to a **Distributor**, who calls `distribute` → stage becomes `Distribution`.
6. **Owner** assigns it to a **Retailer**, who calls `retail` → stage becomes `Retail`.
7. **Retailer** sells the medicine to a **Consumer** with a star rating → stage becomes `Sold`.
8. At any time, the **Manufacturer/Owner** can call `recallBatch`, which blocks further transitions and pushes a real-time alert to every connected dashboard.
9. **Anyone** can scan a medicine's QR code on the landing page to view its complete on-chain history.

---

## License

This project is provided for educational and demonstration purposes.
