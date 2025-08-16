// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// --- Transaction Sub-Schema ---
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    // Enum includes all relevant types identified previously
    enum: ['investment', 'redemption', 'bonus', 'fee', 'deposit', 'withdrawal', 'sell_gold'],
    required: true
  },
  amountGrams: { type: Number }, // Optional: Grams involved (investment, redemption, sell_gold)
  amountLKR: { type: Number },   // Optional: Value in LKR (investment, deposit, withdrawal, sell_gold, fee)
  feeLKR: { type: Number, default: 0 }, // Store calculated fee for the transaction
  date: { type: Date, default: Date.now }, // Date the transaction was initiated/recorded
  description: { type: String }, // General description or notes
  status: {
    type: String,
    // Using the comprehensive enum from the original 'old code'
    enum: ['pending', 'processing', 'shipped', 'delivered', 'completed', 'failed', 'cancelled'],
    default: 'completed' // Keep default as per original, adjust if needed per transaction type logic elsewhere
  },
  relatedRedemptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Redemption' }, // Link if using a separate Redemption model (Confirmed presence)

  // --- Fields specific to redemption or potentially sell_gold (if shipped) transaction types ---
  shippingAddress: { // Store address used for this specific shipment if applicable
      fullName: String,
      addressLine1: String,
      addressLine2: String, // Optional address line
      city: String,
      state: String,        // Or Province
      zipCode: String,      // Or Postal Code
      country: String,
      phone: String
  },
  itemDescription: String, // e.g., "1 x 5g Gold Coin", "Gold Sale Confirmation"
  trackingNumber: String,   // To be added later by an admin or automated process for shipments (Confirmed presence)
  estimatedDeliveryDate: Date, // New field for estimated delivery date for shipments
  // +++ NEW: Blockchain Transaction Hash +++
  blockchainTxHash: String
});


// --- Auto Payment Sub-Schema ---
const autoPaymentSchema = new mongoose.Schema({
    // _id is implicitly added by Mongoose unless you define it explicitly.
    // Let Mongoose handle the default _id generation for subdocuments in the array.
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        required: true
    },
    amountLKR: { type: Number, required: true, min: 100 }, // Define minimum here
    dayOfMonth: { type: Number, min: 1, max: 28 }, // For monthly frequency (Max 28 to avoid issues)
    // --- V V V FIELD ADDED AS REQUESTED V V V ---
    isActive: {
        type: Boolean,
        default: true // Default new plans to active when created
    }
    // --- ^ ^ ^ END ADDED FIELD ^ ^ ^ ---
    // Optional: Add createdAt, updatedAt if needed for tracking subdoc changes
    // createdAt: { type: Date, default: Date.now },
    // updatedAt: { type: Date } // Needs manual update logic if used
});


// --- Default Shipping Address Sub-Schema ---
// Optional: Define a reusable schema for addresses
const shippingAddressSchema = new mongoose.Schema({
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
}, { _id: false }); // Don't create a separate _id for the embedded default address

// +++ NEW: Price Alert Sub-Schema +++
const priceAlertSchema = new mongoose.Schema({
   // Mongoose adds _id implicitly here as well
   targetPriceLKRPerGram: { type: Number, required: true },
   condition: { type: String, enum: ['below', 'above'], required: true },
   isActive: { type: Boolean, default: true },
   // Optional: lastTriggered to prevent spamming
   // lastTriggered: { type: Date }
});


// --- User Schema ---
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String },
  nic: { type: String },
  address: { type: String }, // Keep primary address if needed, separate from shipping
  city: { type: String },    // Keep primary city if needed

  // +++ NEW: Blockchain Fields +++
  blockchainAddress: String,    // User's public wallet address
  blockchainPrivateKey: String, // User's encrypted private key

  profilePictureUrl: {
      type: String,
      default: null // Or an empty string '' if you prefer
  },
  goldBalanceGrams: { type: Number, required: true, default: 0.0, min: 0 }, // Ensure non-negative gold
  cashBalanceLKR: { type: Number, required: true, default: 0.0, min: 0 }, // Ensure non-negative cash

  transactions: [transactionSchema], // Array of transactions

  defaultShippingAddress: shippingAddressSchema, // Store user's preferred default shipping address

  automaticPayments: {
    type: [autoPaymentSchema], // Array using the updated autoPaymentSchema
    default: []
  },

  // --- Gamification Fields ---
  earnedBadgeIds: {
    type: [String],
    default: []
  },
  challengeProgress: {
    type: Map,
    of: Number,
    default: {}
  },
  starCount: { type: Number, default: 0 }, // New field for stars
  completedChallengeIds: { type: [String], default: [] },

  // +++ NEW: Price Alerts +++
  priceAlerts: [priceAlertSchema],

  // +++ NEW: Notification Preferences +++
  notificationPreferences: {
      email: { // Settings per channel
          price_alert: { type: Boolean, default: true },
          market_movement: { type: Boolean, default: false }, // Default off maybe?
          transaction_updates: { type: Boolean, default: true }, // Combines buy/sell/deposit/withdraw
          redemption_updates: { type: Boolean, default: true },
          gamification: { type: Boolean, default: true },
          autopay: { type: Boolean, default: true },
          security: { type: Boolean, default: true }, // Critical, maybe force true?
          promotions: { type: Boolean, default: false }, // Optional marketing
      },
      // Add push: { ... } section later if implementing push notifications
      // push: {
      //    price_alert: { type: Boolean, default: true }, ...
      // },
      // sms: { ... } // If adding SMS
  },

  // --- Password Reset Fields ---
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // --- Email Verification Fields ---
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String, // Store hashed OTP/token
  emailVerificationExpire: Date,

}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

// --- Password Hashing Middleware ---
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  try {
    // console.log(`Hashing password for user ${this._id || this.email}...`); // Optional debug log
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // console.log(`Password hashed for user ${this._id || this.email}.`); // Optional debug log
    next();
  } catch (error) {
    console.error("Error hashing password:", error); // Log error
    next(error); // Pass error to the next middleware/handler
  }
});

// --- Compare Entered Password Method ---
userSchema.methods.matchPassword = async function(enteredPassword) {
  // Ensure password exists before comparing
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- Generate Password Reset Token Method ---
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire time (10 minutes from now)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token (to be sent to the user)
  return resetToken;
};

// --- Generate Email Verification OTP Method ---
userSchema.methods.getEmailVerificationOtp = function() {
  // Generate a 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Hash the OTP before saving
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expiry time (e.g., 10 minutes from now)
  this.emailVerificationExpire = Date.now() + 10 * 60 * 1000;

  // Return the plain OTP (to be sent via email)
  return otp;
};

// --- Create and Export User Model ---
const User = mongoose.model('User', userSchema);
module.exports = User;