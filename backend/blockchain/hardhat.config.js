require("@nomicfoundation/hardhat-toolbox");
const path = require("path"); // <-- ADD THIS LINE

// --- UPDATED .env CONFIGURATION ---
// This creates an absolute path to the .env file in the parent 'backend' directory,
// which is more reliable than a relative path.
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    amoy: {
      url: process.env.AMOY_RPC_URL,
      accounts: [process.env.BACKEND_WALLET_PRIVATE_KEY],
    },
  },
};