// backend/services/blockchainService.js
const { ethers } = require('ethers');
require('dotenv').config();
const GNG_ARTIFACT = require('../blockchain/artifacts/contracts/GoldNestGold.sol/GoldNestGold.json');

// Setup connection to the blockchain
const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
const wallet = new ethers.Wallet(process.env.BACKEND_WALLET_PRIVATE_KEY, provider);

// Get contract details from .env and artifacts
const contractAddress = process.env.GNG_CONTRACT_ADDRESS;
const contractABI = GNG_ARTIFACT.abi;
const gngContract = new ethers.Contract(contractAddress, contractABI, wallet);

/**
 * Mints GNG tokens and sends them to a user's address.
 * @param {string} userAddress The user's blockchain wallet address.
 * @param {number} amountInGrams The amount of gold in grams to be minted as tokens.
 * @returns {Promise<string>} The transaction hash.
 */
const mintTokens = async (userAddress, amountInGrams) => {
    try {
        console.log(`[Blockchain] Attempting to mint ${amountInGrams} GNG to ${userAddress}`);
        
        // Safeguard: Ensure the amount has a reasonable number of decimals before parsing.
        const roundedAmountInGrams = parseFloat(amountInGrams.toFixed(7));
        const amountInWei = ethers.parseUnits(roundedAmountInGrams.toString(), 18);

        const tx = await gngContract.mint(userAddress, amountInWei);
        console.log(`[Blockchain] Mint transaction sent. Hash: ${tx.hash}`);
        await tx.wait(1); // Wait for 1 block confirmation
        console.log(`[Blockchain] Mint transaction confirmed. Hash: ${tx.hash}`);
        return tx.hash;
    } catch (error) {
        console.error("[Blockchain] Error minting tokens:", error);
        throw new Error("Blockchain token minting failed.");
    }
};

/**
 * Creates a new blockchain wallet for a user.
 * @returns {{address: string, privateKey: string}}
 */
const createWallet = () => {
    const newUserWallet = ethers.Wallet.createRandom();
    return {
        address: newUserWallet.address,
        privateKey: newUserWallet.privateKey
    };
};

module.exports = { mintTokens, createWallet };