// backend/services/blockchainService.js
const { ethers } = require('ethers');
const GNG_ARTIFACT = require('../blockchain/artifacts/contracts/GoldNestGold.sol/GoldNestGold.json');

// --- Setup ---
const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
// This wallet is the Owner of the contract and the Treasury
const treasuryWallet = new ethers.Wallet(process.env.BACKEND_WALLET_PRIVATE_KEY, provider);

const contractAddress = process.env.GNG_CONTRACT_ADDRESS;
const contractABI = GNG_ARTIFACT.abi;
// This instance is signed by the treasury, so it can mint and transfer from its own balance
const gngContract = new ethers.Contract(contractAddress, contractABI, treasuryWallet);

/**
 * Mints NEW GNG tokens directly to the Treasury Wallet.
 * This should only be called when an admin adds physical gold.
 */
const mintToTreasury = async (amountInGrams) => {
    try {
        const amountInWei = ethers.parseUnits(amountInGrams.toString(), 18);
        const tx = await gngContract.mint(treasuryWallet.address, amountInWei);
        await tx.wait(1);
        console.log(`[Blockchain] Minted ${amountInGrams} GNG to Treasury. Hash: ${tx.hash}`);
        return tx.hash;
    } catch (error) {
        console.error("[Blockchain] Error minting to treasury:", error);
        throw new Error("Blockchain treasury minting failed.");
    }
};

/**
 * Transfers GNG tokens FROM the treasury wallet TO a user's wallet.
 * This is called when a user BUYS gold.
 */
const transferToUser = async (userAddress, amountInGrams) => {
    try {
        const roundedAmount = parseFloat(amountInGrams.toFixed(8));
        const amountInWei = ethers.parseUnits(roundedAmount.toString(), 18);
        const tx = await gngContract.transfer(userAddress, amountInWei);
        await tx.wait(1);
        console.log(`[Blockchain] Transferred ${amountInGrams} GNG to user ${userAddress}. Hash: ${tx.hash}`);
        return tx.hash;
    } catch (error) {
        console.error("[Blockchain] Error transferring to user:", error);
        throw new Error("Blockchain token transfer failed.");
    }
};

/**
 * Transfers GNG tokens FROM a user's wallet back TO the treasury.
 * This is called when a user SELLS gold.
 * NOTE: This requires the user's private key, which we have stored (for demo purposes).
 */
const transferFromUserToTreasury = async (userPrivateKey, amountInGrams) => {
    try {
        // Create a temporary wallet instance for the user to sign the transaction
        const userWallet = new ethers.Wallet(userPrivateKey, provider);
        const userContractInstance = new ethers.Contract(contractAddress, contractABI, userWallet);

        const roundedAmount = parseFloat(amountInGrams.toFixed(8));
        const amountInWei = ethers.parseUnits(roundedAmount.toString(), 18);
        
        const tx = await userContractInstance.transfer(treasuryWallet.address, amountInWei);
        await tx.wait(1);
        console.log(`[Blockchain] Transferred ${amountInGrams} GNG from user back to Treasury. Hash: ${tx.hash}`);
        return tx.hash;
    } catch (error) {
        console.error("[Blockchain] Error transferring from user:", error);
        throw new Error("Blockchain token transfer from user failed.");
    }
};

/**
 * Creates a new blockchain wallet for a user.
 */
const createWallet = () => {
    const newUserWallet = ethers.Wallet.createRandom();
    return {
        address: newUserWallet.address,
        privateKey: newUserWallet.privateKey
    };
};

module.exports = { mintToTreasury, transferToUser, transferFromUserToTreasury, createWallet };