# Web-Based Blockchain Supply Chain Management System

### TL;DR

A secure web-based platform tracks goods from manufacturer to end-customer, recording every supply chain event on a blockchain. This system offers transparency, verifiable provenance, and protection against tampering, designed for student-level demonstration and practical use. Target users include businesses, administrators, and end-users who need to trust supply chain data.

---

## Goals

### Business Goals

* Successfully deploy a functioning blockchain-based supply chain tracker in a live demo environment.

* Establish a transparent, immutable product history viewable through the app.

* Enable secure, user-initiated ownership transfer for products along the chain (manufacturer → distributor → retailer → customer).

* Achieve simple onboarding for new users and organizations with minimal technical knowledge required.

* Demonstrate practical smart contract utilization for all core business events.

### User Goals

* Allow users to easily create, register, and track products from manufacturing to final sale.

* Empower parties to securely transfer product ownership and view product lineage.

* Let any user validate authenticity instantly via QR code scanning.

* Tailor feature access by user role: manufacturers create/transfer, retailers track/sell, customers verify.

* Provide a fast, trustworthy history and status for any product.

### Non-Goals

* No support for mobile apps or mobile-first UX.

* No integration with IoT, on-chain GPS, or temperature logging/sensors.

* Exclude advanced enterprise integrations (e.g., SAP, Oracle) and industry compliance certifications.

---

## User Stories

**Manufacturer**

* As a Manufacturer, I want to register for an account, so that I can start adding products to the blockchain.

* As a Manufacturer, I want to create a new product, so that I can initiate its digital provenance.

* As a Manufacturer, I want to transfer product ownership to a distributor, so that supply chain handoff is recorded.

* As a Manufacturer, I want to view all products I created, so that I can monitor their journey.

**Distributor**

* As a Distributor, I want to receive products digitally from a manufacturer, so that I can manage my inventory securely.

* As a Distributor, I want to transfer products to retailer accounts, so that I maintain the certified product chain.

* As a Distributor, I want to track the provenance of products I handle, so that I can audit their history.

**Retailer**

* As a Retailer, I want to accept products from a distributor into my digital inventory, so that I know what I can sell.

* As a Retailer, I want to view full product history, so that I can assure customers of authenticity.

* As a Retailer, I want to transfer ownership to customers on sale, so that transactions are transparent and final.

**Customer**

* As a Customer, I want to scan a QR code on the product, so that I can verify its authenticity and full supply chain history.

* As a Customer, I want to register and take digital ownership of purchased products, so that provenance is established.

* As a Customer, I want to see proof that my product is not counterfeit, so that I have peace of mind.

**Admin**

* As an Admin, I want to manage user permissions and deactivate suspicious accounts, so that the system remains secure.

* As an Admin, I want to oversee products and transfers for compliance and integrity.

* As an Admin, I want to view analytics on system usage, so that I can ensure the system is functioning as intended.

---

## Functional Requirements

### Authentication (Priority: High)

* **Register User Account:** Allow users of all roles to register with email, password, and wallet address.

* **User Login:** Secure authentication with password or Web3 wallet.

* **Role Assignment:** Assign Manufacturer, Distributor, Retailer, Customer, or Admin roles at registration or by Admin.

### Product Management (Priority: High)

* **Add New Product:** Manufacturers can create new product entries, stored immutably on blockchain.

* **Transfer Product:** Enable ownership handoff (manufacturer → distributor → retailer → customer), each transfer logged on blockchain.

* **Track Product:** Any authorized user can view product lineage/history by product ID.

* **View Inventory:** Each user sees a list of products they currently own.

### QR Integration (Priority: Medium)

* **Generate QR Code:** Each product gets a unique QR code linked to its on-chain record.

* **QR Scan to Track:** Scanning QR with web camera shows product authentication and full chain-of-custody history.

### Admin Panel (Priority: Medium)

* **User Management:** Admins can activate, deactivate, or reset users.

* **Product Oversight:** Admin can view all products, transfers, and trigger audits.

* **Analytics Dashboard:** Show system metrics (# products created, # transfers, etc).

---

## User Experience

### Entry Point & First-Time User Experience

* Users access the web app via browser and are greeted with a welcome/login page.

* First-time users select their role and complete a brief registration form with email, password, and wallet connection (MetaMask integration mandatory).

* Onboarding modal introduces platform concepts: “How blockchain secures supply chains,” “How to add or track products.”

* Guided tooltips highlight key features as the user first navigates dashboard.

### Core Experience

Common Steps

* **Step 1:** User logs in with registered email/password or Web3 wallet.

  * Clear error handling for wrong password/wallet mismatch.

  * Informative feedback for successful login or registration.

* **Step 2:** Dashboard presented based on user role.

  * Manufacturer: “Add Product” and “Transfer Ownership” buttons.

  * Distributor/Retailer: “View Incoming Transfers” and “Transfer” options.

  * Customer: “Scan QR Code” feature and “My Products.”

  * Admin: “User Management,” “Product Oversight,” and usage analytics.

* **Step 3:** Product creation (Manufacturer only).

  * Enter product details (name, serial, batch, details).

  * Confirm details; blockchain record is written.

  * Product list updates immediately; QR code is generated, downloadable for printing.

* **Step 4:** Product transfer (Manufacturer, Distributor, Retailer).

  * Select product, choose recipient (input wallet/email), and confirm transfer.

  * Transfer initiates blockchain transaction; status updates on success.

* **Step 5:** Track product via dashboard or QR scan (all users).

  * Enter product ID or scan QR using webcam.

  * Full history shown: creation, all transfers, current owner, dates/times.

* **Step 6:** Customer acceptance (at final sale).

  * Customer accounts scan/accept ownership, chain-of-custody closes.

Advanced Features & Edge Cases

* Power-users (Admins) trigger data exports or perform system audits.

* Invalid transfer attempts (wrong recipient role, double-transfer, etc.) produce actionable errors.

* Out-of-order events rejected by backend/smart contract.

* Lost private key – customers may recover via admin support and identity verification.

* QR code not recognized – fallback for manual product code entry.

UI/UX Highlights

* High contrast and clear status indicators (success, error, pending) on all transactional UIs.

* Responsive layout ensures tablet and laptop friendliness, but not designed for mobile.

* Accessibility: All form elements labeled; keyboard navigation supported.

* Contextual tooltips for role-specific tasks.

* Simple, uncluttered dashboards for student-level clarity.

---

## Narrative

In today’s supply chain, trust and transparency are paramount. A distributor worried about counterfeit goods and a retailer determined to prove authenticity face the daily challenge of tracking each product’s journey from source to shelf. Traditional tracking can be manipulated or lost. Enter the Web-Based Blockchain Supply Chain Management System.

The manufacturer quickly registers on the platform, creates digital twins for each product, and each gets a unique QR code. As shipments leave the factory, ownership is securely handed to distributors with each transaction recorded in an immutable blockchain ledger. Distributors, retailers, and admins see full, unalterable history at every step. When a customer buys a product, scanning its QR reveals a full lineage: manufactured, distributed, and sold step-by-step—no gaps, no guesswork.

For businesses, this means fraud protection and fewer disputes. For customers, it’s instant peace of mind that their purchase is genuine. For students and admins, it demonstrates a practical, working use-case for blockchain and smart contracts, blending conceptual clarity with operational utility. Everyone in the supply chain can finally trust their data and streamline handoffs, reducing risk and building consumer confidence.

---

## Success Metrics

### User-Centric Metrics

* **User Registration Rate:** Number of new users per week by role (manufacturer/distributor/retailer/customer).

* **Engagement Rate:** Percentage of registered users logging in and performing transactions (add/transfer/track) monthly.

* **User Satisfaction Score:** Average CSAT (Customer Satisfaction) from periodic pop-up surveys after key actions.

### Business Metrics

* **Product Creation Volume:** Total products created and registered on the blockchain.

* **Transfer Completion Rate:** Percentage of initiated to successfully completed product transfers.

* **Unique Product Track Events:** Number of tracks or QR scans performed by customers (authenticity checks).

### Technical Metrics

* **Transaction Success Rate:** Successful blockchain transactions vs. errors.

* **System Uptime:** >99% uptime during the pilot/demo period.

* **Average Response Time:** Product tracking and ownership transfer processed in <2 seconds.

### Tracking Plan

* Account registrations (by user type)

* Product adds (blocks written)

* Product transfers (by type and volume)

* Product lookup and QR scans

* Admin actions (user locks, system audits)

* User logins per day/week

---

## Technical Considerations

### Technical Needs

* **Frontend:** Modern web UI for dashboards, registration/login, product management, QR scanning.

* **Backend:** API gateway; business logic for validation, transfer, audit; connects to blockchain and MongoDB.

* **Blockchain/Smart Contract Layer:** Solidity contracts managing product records and transfers.

* **Database:** MongoDB for off-chain user data, role management, and non-critical product metadata.

* **Web3 Wallet Integration:** Required for all transaction signing and product transfers.

### Integration Points

* **Web3 Wallet/MetaMask:** For user authentication and signing blockchain transactions.

* **QR Code Tools:** Library for generation and webcam scanning within the browser.

* **No external supply chain systems or ERP integration required.**

### Data Storage & Privacy

* **Blockchain:** Immutable product history and transfer logs (public chain for transparency, but only IDs and hashes stored).

* **MongoDB:** User profiles, login creds, role assignments (not sensitive product data).

* **Privacy:** No storage of sensitive commercial secrets; focus on product provenance only.

* **Compliance:** Standard data privacy practice; no advanced/data residency requirements.

### Scalability & Performance

* Designed for 100 simultaneously active users (pilot/educational scale).

* Fast write/read operations (<2 seconds per block/transfer event).

* Modular back-end to allow scaling up for larger future demos if needed.

### Potential Challenges

* Blockchain congestion or slow confirmations may delay product transfers.

* User wallet mismanagement (lost keys) requiring admin override.

* Preventing replay or out-of-sequence transfer attacks in smart contract.

* Ensuring all role-based permissions enforced both front and back end.

* Protecting admin functions from malicious abuse.

---

## Milestones & Sequencing

### Project Estimate

* **Medium: 2–4 weeks** (targeting MVP with all key flows).

### Team Size & Composition

* **Small Team: 1–2 people**

  * 1 Full-stack Developer (front-end, back-end, smart contract)

  * 1 (optional) Designer/Product (part-time, or as needed)

### Suggested Phases

**Phase 1: Initial Setup & Planning (2 days)**

* Deliverables: Project repo, requirements clarification, integration checklist.

* Dependencies: None.

**Phase 2: Smart Contract Development (4 days)**

* Deliverables: Product registry and transfer contracts (Solidity), deployed to testnet.

* Dependencies: Ethereum testnet node access.

**Phase 3: Backend/API & DB (4 days)**

* Deliverables: Node.js backend, MongoDB schemas, user/role management, blockchain transaction endpoints.

* Dependencies: Phase 2 contracts deployed.

**Phase 4: Front-End UI (5 days)**

* Deliverables: All user dashboards, onboarding, authentication, QR integration, admin views.

* Dependencies: Backend/API endpoints live.

**Phase 5: Testing & User Demo (2–3 days)**

* Deliverables: End-to-end test cases, live testing with all user roles, demo walkthrough.

* Dependencies: All previous phases complete.

Total estimated MVP timeline: **15–18 working days.**  

Team: **1–2 fast, multi-skilled contributors.**