const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const adminSchema = new mongoose.Schema({
firstName: { type: String, required: true },
lastName: { type: String, required: true },
nic: {
type: String,
required: [true, 'NIC is required.'],
unique: true,
validate: {
// --- ALTERNATIVE VALIDATION LOGIC ---
// This version uses conditional logic instead of a single complex Regex.
validator: function(v) {
// Ensure the input is a non-empty string before checking
if (typeof v !== 'string' || v.length === 0) {
return false;
}
// 1. Check for the new 12-digit format
    if (v.length === 12) {
      // Check if all characters in the string are numbers.
      return /^\d+$/.test(v);
    }

    // 2. Check for the old 10-character format (9 digits + 'V' or 'X')
    if (v.length === 10) {
      const firstNineChars = v.substring(0, 9);
      const lastChar = v.charAt(9).toUpperCase();

      // Check if the first part is all numbers AND the last character is 'V' or 'X'.
      return /^\d+$/.test(firstNineChars) && (lastChar === 'V' || lastChar === 'X');
    }

    // 3. If the length is not 12 or 10, it's automatically invalid.
    return false;
  },
  message: function(props) {
    return `${props.value} is not a valid NIC number!`;
  }
}
},
email: { type: String, required: true, unique: true, lowercase: true },
password: { type: String, required: true, select: false },
role: {
type: String,
enum: ['superadmin', 'support', 'finance'],
required: true,
default: 'support',
},
isActive: { type: Boolean, default: true },
lastLogin: { type: Date },
resetPasswordToken: String,
resetPasswordExpire: Date,
}, { timestamps: true });
// Middleware to hash password before saving
adminSchema.pre('save', async function(next) {
if (!this.isModified('password')) return next();
const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(this.password, salt);
next();
});
// Method to compare entered password with the hashed password
adminSchema.methods.matchPassword = async function(enteredPassword) {
return await bcrypt.compare(enteredPassword, this.password);
};
// Method to generate a password reset token (for new admin setup)
adminSchema.methods.getResetPasswordToken = function() {
const resetToken = crypto.randomBytes(20).toString('hex');
this.resetPasswordToken = crypto
.createHash('sha256')
.update(resetToken)
.digest('hex');
this.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000;
return resetToken;
};
const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;