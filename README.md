# 🪙 GoldNest – Gold-Based Micro Investment Platform

> Built with ❤️ by **Team Code Mavericks**

GoldNest is a revolutionary web-based micro-investment platform that enables Sri Lankans to invest in **gold starting from just Rs. 100**. Combining the power of **blockchain (via Polygon Amoy testnet)**, **AI-driven insights**, and modern **fintech**, our platform provides a secure, gamified, and transparent way for anyone to grow their wealth and hedge against inflation through digitally-backed gold.

---

## 🚀 Live Demo

👉 **[Access the Live Web App](https://goldnest.pages.dev/)**

---

## 👨‍💻 Team Code Mavericks

| Name           | Role               | Email                   |
|----------------|--------------------|-------------------------|
| Izzath Nisfer | Backend Developer  | izzathnisfer@gmail.com  |
| Sabith Jiffrey | Frontend & Blockchain Developer | sabithjiffrey@gmail.com |
| Rahim Iqbal    | Frontend & UI/UX Developer | mirahim2003@gmail.com   |

---

## 📌 Key Features

-   💰 **Micro-Investments:** Start investing in fractional gold from just Rs. 100.
-   🔗 **Blockchain Tokenization:** Every gold purchase mints a corresponding GNG token on the Polygon Amoy testnet, providing verifiable proof of ownership.
-   🧠 **AI-Powered Insights:** Get intelligent market analysis, trend summaries, and personalized investment suggestions.
-   🤖 **Automated Savings:** Set up recurring "Auto-Invest" plans to build wealth consistently.
-   🧩 **Gamified Experience:** Complete challenges, earn badges, and claim rewards to make saving engaging.
-   📊 **Dynamic Admin Panel:** Full administrative control over users, redemptions, platform fees, and dynamic gamification content.
-   🔄 **Physical Redemption:** Securely redeem digital gold holdings for physical, certified gold coins.

---

## 🧰 Tech Stack

### Frontend
-   **Framework:** React.js (with Next.js)
-   **Styling:** CSS Modules

### Backend
-   **Runtime:** Node.js
-   **Framework:** Express.js
-   **APIs:** RESTful API
-   **Scheduling:** `node-cron` for automated tasks

### Database
-   MongoDB Atlas (NoSQL)

### Blockchain Integration
-   **Smart Contract:** Solidity (ERC-20 Token)
-   **Library:** `ethers.js`
-   **Network:** Polygon Amoy Testnet
-   **Development:** Hardhat

### Hosting & Deployment
-   **Frontend:** Koyeb
-   **Backend:** Koyeb
-   **Database:** MongoDB Atlas

---

## 🛠️ How to Run Locally

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- MongoDB account (local or Atlas)
- MetaMask browser extension (for testing blockchain features)

### 1. Clone the Repository
```bash
git clone https://github.com/izzathnisfer/goldnest.git
cd goldnest
```

### 2. Backend Setup
```bash
cd backend
npm install
# Create a .env file and populate it with your database URI, JWT secrets, etc.
# Refer to .env.example for required variables
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
# Create a .env.local file and add NEXT_PUBLIC_BACKEND_URL
# Example: NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
npm run dev
```
The application will be running at `http://localhost:3000`.
