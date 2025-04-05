const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Each email must be unique
    lowercase: true, // Store emails in lowercase
  },
  password: {
    type: String,
    required: true,
  },
  phone: { // Added from your signup form
    type: String,
    required: false, // Making it optional for now
  },
  nic: { // Added from your signup form
    type: String,
    required: false, // Making it optional for now
  },
  address: { // Added from your signup form
    type: String,
    required: false,
  },
  city: { // Added from your signup form
    type: String,
    required: false,
  },
  // --- Fields for your app's core logic ---
  goldBalanceGrams: { // Store gold balance in grams for precision
    type: Number,
    required: true,
    default: 0.0,
  },
  transactions: [ // Array to store transaction history (simplified for now)
    {
      type: { type: String, enum: ['investment', 'redemption', 'transfer'], required: true },
      amountGrams: { type: Number, required: true },
      amountLKR: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      description: { type: String }
    }
  ]
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// --- Password Hashing Middleware ---
// This function runs *before* a user document is saved
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  // Generate a salt and hash the password
  const salt = await bcrypt.genSalt(10); // 10 rounds is generally recommended
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// --- Method to compare entered password with hashed password ---
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;