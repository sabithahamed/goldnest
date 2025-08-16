// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService'); // Import email service
const { createNotification } = require('../services/notificationService'); // Import notification service
const { createWallet } = require('../services/blockchainService'); // <--- ADDED

dotenv.config();

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register a new user & Send Verification Email
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, phone, nic, address, city } = req.body;

    try {
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            // Consider if user exists but isn't verified - maybe resend OTP?
            // For now, just reject duplicate registration attempts.
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Create new user - password hashed by hook, emailVerified defaults to false
        const user = await User.create({
            name, email: email.toLowerCase(), password, phone, nic, address, city,
            goldBalanceGrams: 0, cashBalanceLKR: 0, // Initialize balances
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid user data during creation' });
        }

        // --- Create Blockchain Wallet --- // <--- MODIFIED SECTION
        const wallet = createWallet();
        user.blockchainAddress = wallet.address;
        user.blockchainPrivateKey = wallet.privateKey; // IMPORTANT: In a real app, you MUST encrypt this key before saving!

       // --- Send Verification Email ---
       const otp = user.getEmailVerificationOtp(); // Generate OTP and set hash/expiry on user
       // This save will now include the blockchain details as well
       await user.save({ validateBeforeSave: false }); // Save user with OTP and wallet details

       const emailSent = await sendVerificationEmail(user.email, otp);
       if (!emailSent) {
           // If email fails, should we delete the user or let them try verifying later?
           // For simplicity, we'll proceed but log the error. User might need a "resend OTP" option.
           console.error(`Failed to send verification email to ${user.email} during registration.`);
           // Don't send token yet, as email isn't verified
            return res.status(201).json({
               message: 'Registration successful, but failed to send verification email. Please try verifying later or contact support.',
               userId: user._id // Send ID so frontend knows who to verify
           });
       }

        // Respond - DO NOT log user in yet (no token)
         res.status(201).json({
             message: 'Registration successful! Please check your email for the verification OTP.',
             userId: user._id // Send ID so frontend knows who to verify
         });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: 'Server Error during registration' });
    }
};


// @desc    Verify user email using OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
   const { userId, otp } = req.body;

   if (!userId || !otp) {
       return res.status(400).json({ message: 'User ID and OTP are required.' });
   }

   try {
       // Hash the provided OTP to compare with the stored hash
       const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

       const user = await User.findById(userId);

       if (!user) {
           return res.status(404).json({ message: 'User not found.' });
       }

        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email already verified.' });
        }

       // Check if token matches and hasn't expired
       if (user.emailVerificationToken !== hashedOtp || user.emailVerificationExpire < Date.now()) {
           // Clear expired/invalid token
           user.emailVerificationToken = undefined;
           user.emailVerificationExpire = undefined;
           await user.save({ validateBeforeSave: false });
           return res.status(400).json({ message: 'Invalid or expired OTP.' });
       }

       // --- Verification Successful ---
       user.isEmailVerified = true;
       user.emailVerificationToken = undefined; // Clear token fields
       user.emailVerificationExpire = undefined;
       await user.save();

       // --- Create welcome notification --- //
       try {
            await createNotification(user._id, 'account_welcome', {
                title: 'Welcome to GoldNest!',
                message: `Your email ${user.email} has been verified. Welcome aboard!`,
                link: '/dashboard' // Link to dashboard
            });
       } catch (notificationError) {
            console.error(`Failed to create welcome notification for user ${user._id}:`, notificationError);
            // Non-critical error, log it but don't fail the request
       }

       // Now log the user in by generating a token
       res.json({
           message: 'Email verified successfully! You are now logged in.',
           _id: user._id,
           name: user.name,
           email: user.email,
           // Include other essential fields needed after login
           isEmailVerified: user.isEmailVerified,
           token: generateToken(user._id), // Generate JWT token
       });

   } catch (error) {
       console.error("Email Verification Error:", error);
       res.status(500).json({ message: 'Server Error during email verification.' });
   }
};


// @desc    Authenticate user & get token (Login) - Enforce Email Verification
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Fetch user, including password and verification status
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password +isEmailVerified'); // Explicitly select isEmailVerified

        // Scenario 1: User not found
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Scenario 2: Password doesn't match
        if (!(await user.matchPassword(password))) {
             return res.status(401).json({ message: 'Invalid email or password' });
        }

        // --- Scenario 3: User Found, Password Correct, BUT Email NOT Verified ---
        if (!user.isEmailVerified) {
            console.log(`Login attempt failed for unverified email: ${email}`); // Log for debugging
            // Optional: Consider resending OTP automatically here if desired, but requires more logic
            // const otp = user.getEmailVerificationOtp(); await user.save(); await sendVerificationEmail(user.email, otp);
            return res.status(403).json({ // 403 Forbidden is appropriate
                message: 'Email not verified. Please check your email for the OTP or resend.',
                verificationNeeded: true, // Flag for frontend
                userId: user._id // Send ID if frontend needs to trigger verify action
            });
        }

        // --- Scenario 4: User Found, Password Correct, Email IS Verified ---
        // Proceed with successful login and token generation
        console.log(`Login successful for verified email: ${email}`); // Log for debugging
        res.json({
             _id: user._id,
             name: user.name,
             email: user.email,
             isEmailVerified: user.isEmailVerified, // Should be true here
             // Include other necessary user info needed immediately after login
             // goldBalanceGrams: user.goldBalanceGrams, // Example
             // cashBalanceLKR: user.cashBalanceLKR, // Example
             token: generateToken(user._id),
         });

    } catch (error) {
         console.error("Login Error:", error);
         // Avoid sending specific error details to the client in production
         res.status(500).json({ message: 'Server Error during login' });
    }
};

// @desc    Handle forgot password request - Sends Email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // SECURITY: Don't reveal if user exists. Always send success-like message.
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Get reset token (plain text) and save hash/expiry to user doc
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

       // --- Send Password Reset Email ---
       const emailSent = await sendPasswordResetEmail(user.email, resetToken);

       if (!emailSent) {
            console.error(`Failed to send password reset email to ${user.email}.`);
            // Clear the token fields again to allow retry later
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
        }

       // Send generic success message
       res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error during forgot password process.' });
    }
};


// @desc    Handle reset password action
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  const resetToken = req.params.resettoken;
  const { password } = req.body;

  console.log(`--- Reset Password Request Received ---`); // Log start
  console.log(`Received reset token from URL: ${resetToken}`);
  console.log(`Received new password (length): ${password?.length}`);

  if (!password || password.length < 8) {
       console.log("Password validation failed.");
       return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  try {
      // Hash the token from the URL *exactly* as it's done in the User model
      const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');
      console.log(`Hashed token for searching: ${hashedToken}`);

      const user = await User.findOne({
          resetPasswordToken: hashedToken,
          resetPasswordExpire: { $gt: Date.now() },
      });

      if (!user) {
          console.log(`User NOT found with hashed token or token expired.`);
          return res.status(400).json({ message: 'Invalid or expired reset token.' });
      }

      // --- User Found ---
      console.log(`User found: ${user.email}`);

      user.password = password; // Password will be hashed by the pre-save hook
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      console.log(`Attempting to save updated user: ${user.email}`);
      await user.save();
      console.log(`User saved successfully: ${user.email}`);

      // --- Create password changed notification --- //
      try {
           await createNotification(user._id, 'password_changed', {
               title: 'Password Changed Successfully',
               message: 'Your password was successfully changed using the password reset link.',
               link: '/dashboard' // Or maybe link to security settings '/settings/security'
           });
      } catch (notificationError) {
           console.error(`Failed to create password reset notification for user ${user._id}:`, notificationError);
           // Non-critical error, log it but don't fail the request
      }

      res.status(200).json({ message: 'Password reset successful.' });

  } catch (error) {
      console.error('!!! Reset Password Controller Error !!!:', error);
      res.status(500).json({ message: 'Server error during password reset.' });
  }
};

// @desc    Resend verification OTP
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerificationOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.isEmailVerified) return res.status(400).json({ message: "Email already verified." });

        const otp = user.getEmailVerificationOtp();
        await user.save({ validateBeforeSave: false });
        const emailSent = await sendVerificationEmail(user.email, otp);

        if (!emailSent) {
            return res.status(500).json({ message: "Failed to resend OTP. Please try again later." });
        }

        res.status(200).json({ message: "New verification OTP sent to your email." });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        res.status(500).json({ message: 'Server Error resending OTP.' });
    }
};

module.exports = {
     registerUser,
     verifyEmail,
     loginUser,
     forgotPassword,
     resetPassword,
     resendVerificationOtp
};