// backend/models/AdminSession.js
const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  adminName: { type: String, required: true },
  adminEmail: { type: String, required: true },
  loginTime: { type: Date, default: Date.now },
  logoutTime: { type: Date },
  durationMinutes: { type: Number },
  ipAddress: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'logged_out', 'expired'], 
    default: 'active' 
  },
}, { timestamps: true });

const AdminSession = mongoose.model('AdminSession', adminSessionSchema);
module.exports = AdminSession;