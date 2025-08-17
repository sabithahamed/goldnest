// backend/models/Setting.js
const mongoose = require('mongoose');

// A simple key-value store for global platform settings
const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Can store numbers, strings, objects, etc.
    required: true,
  },
  description: {
    type: String,
  }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;