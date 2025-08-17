// backend/models/InventoryLog.js
const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  gramsAdded: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  adminName: { // Denormalize for easy display
    type: String,
    required: true,
  },
}, { timestamps: true });

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
module.exports = InventoryLog;