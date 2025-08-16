// backend/blockchain/ignition/modules/DeployGoldNestGold.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("GoldNestGoldModule", (m) => {
  // This is where we define the deployment.
  // We're deploying the contract named "GoldNestGold".
  const gngToken = m.contract("GoldNestGold");

  // Ignition handles logging and waiting for deployment automatically.
  // We return the contract instance so we can potentially use it in other modules later.
  return { gngToken };
});