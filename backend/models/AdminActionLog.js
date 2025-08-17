// backend/models/AdminActionLog.js
const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  adminName: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'Locked User Account', 'Updated Redemption Status'
  targetType: { type: String }, // e.g., 'User', 'Redemption', 'Setting'
  targetId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed }, // Store extra info, like the new status
}, { timestamps: true });

const AdminActionLog = mongoose.model('AdminActionLog', adminActionLogSchema);
module.exports = AdminActionLog;