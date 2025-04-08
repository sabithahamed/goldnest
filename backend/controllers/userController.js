// backend/controllers/userController.js

const User = require('../models/User');
const mongoose = require('mongoose'); // For ObjectId validation
const { getActiveChallenges, getAllBadges } = require('../config/gamification');
const bcrypt = require('bcryptjs'); // Keep if needed by other functions potentially (though not directly used here)
const gamificationService = require('../services/gamificationService'); // Import the service
const { createNotification } = require('../services/notificationService'); // Import notification service

// @desc    Get current user's profile (incl. transactions, gamification, auto payments, default shipping address)
// @route   GET /api/users/me
// @access  Private
const getUserProfile = async (req, res) => {
    if (!req.user) {
        // Should be handled by auth middleware, but provides an extra layer.
        return res.status(401).json({ message: 'Not authorized, no user data' });
    }
    try {
        // --- Initial Fetch (might have populated fields from middleware or be partial) ---
        // We rely on the re-fetch later for guaranteed complete data for the response.
        // Fetching here mainly to get initial state for gamification processing.
        let initialUser = await User.findById(req.user._id); // Fetch base user data
        if (!initialUser) {
            // This case means the user ID from the token is invalid or user was deleted
            // since the token was issued.
            return res.status(404).json({ message: 'User associated with token not found.' });
        }

        let needsSave = false; // Flag if user object needs saving in the DB

        // --- Process Gamification using initial user state ---
        // Ensure the gamification service handles potential missing fields gracefully
        const { newEarnedBadgeIds, updatedProgress, starsToAdd } = gamificationService.processGamificationState(initialUser);

        // --- Prepare Gamification Updates ---
        let updatedGamificationData = {};

        // --- Badge Updates ---
        let finalEarnedBadges = [...(initialUser.earnedBadgeIds || [])]; // Start with existing, handle undefined/null
        let addedNewBadge = false;
        if (newEarnedBadgeIds && newEarnedBadgeIds.length > 0) {
            newEarnedBadgeIds.forEach(badgeId => {
                if (!finalEarnedBadges.includes(badgeId)) {
                    finalEarnedBadges.push(badgeId);
                    addedNewBadge = true; // Mark that a change occurred
                }
            });
            if (addedNewBadge) {
                updatedGamificationData.earnedBadgeIds = finalEarnedBadges;
                needsSave = true;
                console.log(`User ${initialUser._id} badges flagged for update.`);
            }
        }

        // --- Progress Updates ---
        // Ensure challengeProgress exists before attempting to update/compare
        const currentProgressObj = initialUser.challengeProgress ? Object.fromEntries(initialUser.challengeProgress) : {};
        const updatedProgressObj = updatedProgress || {}; // Ensure it's an object

        // Check if progress actually changed. JSON stringify is a simple way for deep comparison.
        if (JSON.stringify(currentProgressObj) !== JSON.stringify(updatedProgressObj) && Object.keys(updatedProgressObj).length > 0) {
            // Convert the updated progress object into a Map for saving
            updatedGamificationData.challengeProgress = new Map(Object.entries(updatedProgressObj));
            needsSave = true;
            console.log(`User ${initialUser._id} challenge progress flagged for update.`);
        }

        // --- Star Updates ---
        if (starsToAdd > 0) {
             // Calculate new total based on initial user state
            const newStarCount = (initialUser.starCount || 0) + starsToAdd;
            updatedGamificationData.starCount = newStarCount;
            needsSave = true;
            console.log(`User ${initialUser._id} stars flagged for update: ${newStarCount}`);
        }

        // --- Save user IF gamification state changed ---
        if (needsSave) {
            try {
                 // Use updateOne with $set for targeted gamification field updates
                 const updateResult = await User.updateOne(
                     { _id: initialUser._id },
                     { $set: updatedGamificationData }
                 );

                 if (updateResult.modifiedCount > 0) {
                     console.log(`User ${initialUser._id} gamification state updated successfully in DB.`);
                 } else if (updateResult.matchedCount > 0) {
                     console.log(`User ${initialUser._id} gamification state update attempted, but no changes were needed in DB.`);
                 } else {
                      console.warn(`User ${initialUser._id} not found during gamification update attempt.`);
                      // This shouldn't happen if initialUser was found, but log it.
                 }

            } catch (saveError) {
                console.error(`Error saving updated user gamification state for user ${initialUser._id}:`, saveError);
                // Continue without failing request, but gamification might be slightly out of sync
                // The re-fetch below will get the last known good state from the DB.
            }
        }

        // --- Explicitly Re-fetch the User AFTER potential save ---
        // This ensures we have the latest data including populated fields needed for the response,
        // regardless of save() side effects or if the updateOne modified the data.
        const finalUser = await User.findById(req.user._id)
            .populate('transactions')        // Populate necessary fields for the response
            .populate('automaticPayments')  // Populate necessary fields for the response
            .select('-password');           // Exclude password

        if (!finalUser) {
            // Should not happen if user existed before, but provides robustness
            console.error(`User ${req.user._id} not found during final re-fetch after potential update.`);
            return res.status(404).json({ message: 'User data could not be retrieved after update.' });
        }

        // --- Sort transactions using the freshly fetched finalUser data ---
        const sortedTransactions = (finalUser.transactions || []) // Use finalUser here
            ?.filter(tx => tx && tx.date) // Check tx exists and has a date
            ?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [];

        // Get gamification definitions
        const activeChallenges = getActiveChallenges();
        const allBadges = getAllBadges();

        // --- Send Response using finalUser data ---
        res.json({
             // Basic Info
             _id: finalUser._id,
             name: finalUser.name,
             email: finalUser.email,
             phone: finalUser.phone,
             address: finalUser.address,
             city: finalUser.city,
             nic: finalUser.nic, // Make sure NIC is included if needed
             createdAt: finalUser.createdAt,
             // Wallet Core Data
             goldBalanceGrams: finalUser.goldBalanceGrams,
             cashBalanceLKR: finalUser.cashBalanceLKR,
             transactions: sortedTransactions, // Use the sorted list
             automaticPayments: finalUser.automaticPayments || [], // Use data from finalUser
             defaultShippingAddress: finalUser.defaultShippingAddress || null, // Use data from finalUser

             // --- Gamification Data for Frontend (from finalUser) ---
             earnedBadgeIds: finalUser.earnedBadgeIds || [],
             // Send challengeProgress as a plain object for JSON compatibility
             challengeProgress: finalUser.challengeProgress ? Object.fromEntries(finalUser.challengeProgress) : {},
             starCount: finalUser.starCount || 0,

             // Definitions for the frontend to render badges/challenges
             gamificationDefs: {
                 badges: allBadges,
                 challenges: activeChallenges
             }
         });

    } catch (error) {
        console.error("Error fetching user profile:", error); // Log the actual error stack
        res.status(500).json({ message: "Server Error getting user profile" }); // Generic message to client
    }
};


// @desc    Update user profile (subset of fields)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    // Fetch fresh from DB for updates
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only update fields that are present in the request body
    const { name, phone, address, city, defaultShippingAddress } = req.body;

    // Update fields if they were provided in the request
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (defaultShippingAddress !== undefined) {
        // Add validation for defaultShippingAddress structure if needed here or in model
        user.defaultShippingAddress = defaultShippingAddress;
    }

    const updatedUser = await user.save();

    // Return a consistent subset of user data, ensure NIC is included if expected
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      address: updatedUser.address,
      city: updatedUser.city,
      nic: updatedUser.nic, // Include NIC
      defaultShippingAddress: updatedUser.defaultShippingAddress,
    });

  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation Error", details: error.message });
    }
    res.status(500).json({ message: 'Server Error updating profile' });
  }
};

// @desc    Change user password (when logged in)
// @route   PUT /api/users/change-password
// @access  Private
const changeUserPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Basic validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide current and new passwords.' });
  }
  if (newPassword.length < 8) { // Use a config value e.g., process.env.MIN_PASSWORD_LENGTH
    return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'New password cannot be the same as the current password.' });
  }

  try {
    // Fetch user and explicitly select the password field
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the provided current password matches the stored hash
    const isMatch = await user.matchPassword(currentPassword); // Assumes matchPassword method exists on User model

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // Hash the new password (typically done via pre-save hook in User model)
    user.password = newPassword;
    await user.save();

    // --- Create Notification ---
    try {
        await createNotification(user._id, 'security_password_change', {
            title: 'Password Changed',
            message: 'Your GoldNest account password was successfully changed.',
            // Optionally add a link: link: '/settings/security'
        });
        console.log(`Password change notification created for user ${user._id}`);
    } catch (notificationError) {
        console.error(`Failed to create password change notification for user ${user._id}:`, notificationError);
        // Do not fail the request, password change was successful. Just log the error.
    }
    // --- End Notification ---

    res.json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error("Error changing password:", error);
     if (error.name === 'ValidationError') { // Handle potential validation errors from pre-save hook
      return res.status(400).json({ message: "Validation Error", details: error.message });
    }
    res.status(500).json({ message: 'Server Error changing password' });
  }
};


// @desc    Add a new automatic payment setting
// @route   POST /api/users/autopayments
// @access  Private
const addAutoPayment = async (req, res) => {
  const { frequency, amountLKR } = req.body;
  const validFrequencies = ['daily', 'weekly', 'monthly']; // Define valid frequencies

  // Input validation
  if (!frequency || !validFrequencies.includes(frequency)) {
      return res.status(400).json({ message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}.` });
  }
  const numericAmount = Number(amountLKR);
  // Use config for minimum amount?
  const MIN_AUTOPAY_AMOUNT = process.env.MIN_AUTOPAY_AMOUNT_LKR || 100;
  if (isNaN(numericAmount) || numericAmount < MIN_AUTOPAY_AMOUNT) {
      return res.status(400).json({ message: `Invalid amount. Amount must be a number and at least Rs. ${MIN_AUTOPAY_AMOUNT}.` });
  }

  try {
    // Fetch fresh user data to modify subdocuments
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Optional: Add limit check
    const MAX_AUTOPAYMENTS = process.env.MAX_AUTOPAYMENTS_PER_USER || 5;
    if (user.automaticPayments && user.automaticPayments.length >= MAX_AUTOPAYMENTS) {
      return res.status(400).json({ message: `Maximum number of automatic payments (${MAX_AUTOPAYMENTS}) reached.` });
    }

    const newPayment = {
      frequency,
      amountLKR: numericAmount, // Store validated number
      isActive: true // Default to active when adding
      // nextRunDate could be calculated and set here if needed immediately
    };

    user.automaticPayments.push(newPayment);
    await user.save();

    // Return the newly added payment object (it will have an _id assigned by Mongoose)
    const addedPayment = user.automaticPayments[user.automaticPayments.length - 1];
    res.status(201).json(addedPayment);

  } catch (error) {
    console.error("Error adding auto payment:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation Error", details: error.message });
    }
    res.status(500).json({ message: 'Server Error adding auto payment' });
  }
};

// @desc    Update an existing automatic payment setting
// @route   PUT /api/users/autopayments/:id
// @access  Private
const updateAutoPayment = async (req, res) => {
  const { id } = req.params;
  // Allow updating frequency, amount, and potentially isActive status
  const { frequency, amountLKR, isActive } = req.body;
  const validFrequencies = ['daily', 'weekly', 'monthly'];

  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid payment ID format.' });
  }

  // Input validation (only validate fields that are provided)
  let numericAmount;
  if (amountLKR !== undefined) {
      numericAmount = Number(amountLKR);
      const MIN_AUTOPAY_AMOUNT = process.env.MIN_AUTOPAY_AMOUNT_LKR || 100;
      if (isNaN(numericAmount) || numericAmount < MIN_AUTOPAY_AMOUNT) {
          return res.status(400).json({ message: `Invalid amount. Amount must be a number and at least Rs. ${MIN_AUTOPAY_AMOUNT}.` });
      }
  }
  if (frequency !== undefined && !validFrequencies.includes(frequency)) {
      return res.status(400).json({ message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}.` });
  }
   if (isActive !== undefined && typeof isActive !== 'boolean') {
     return res.status(400).json({ message: 'Invalid value for isActive. Must be true or false.' });
   }


  try {
    // Fetch fresh user data
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find the subdocument by its _id using Mongoose's .id() method
    const payment = user.automaticPayments.id(id);
    if (!payment) {
      return res.status(404).json({ message: 'Automatic payment setting not found.' });
    }

    // Update the fields of the subdocument if they were provided
    if (frequency !== undefined) payment.frequency = frequency;
    if (numericAmount !== undefined) payment.amountLKR = numericAmount; // Use validated numeric amount
    if (isActive !== undefined) payment.isActive = isActive; // Update active status
    // Consider updating nextRunDate if frequency changes? Or handle in scheduler.

    await user.save(); // Save the parent document
    res.json(payment); // Return the updated payment object

  } catch (error) {
    console.error("Error updating auto payment:", error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation Error", details: error.message });
    }
    res.status(500).json({ message: 'Server Error updating auto payment' });
  }
};

// @desc    Delete an automatic payment setting
// @route   DELETE /api/users/autopayments/:id
// @access  Private
const deleteAutoPayment = async (req, res) => {
  const { id } = req.params;

  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid payment ID format.' });
  }

  try {
    // Fetch fresh user data
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find the subdocument by its _id
    const payment = user.automaticPayments.id(id);
    if (!payment) {
      return res.status(404).json({ message: 'Automatic payment setting not found.' });
    }

    // Remove the subdocument using Mongoose v6+ method .remove() on the subdocument instance
    // For older Mongoose versions use: user.automaticPayments.pull({ _id: id });
    payment.remove(); // Mark for removal
    await user.save(); // Persist the removal by saving the parent

    res.json({ message: 'Automatic payment deleted successfully.', deletedId: id });

  } catch (error) {
    console.error("Error deleting auto payment:", error);
    res.status(500).json({ message: 'Server Error deleting auto payment' });
  }
};

// Make sure all controller functions are exported
module.exports = {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  addAutoPayment,
  updateAutoPayment,
  deleteAutoPayment
};