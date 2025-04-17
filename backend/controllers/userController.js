// backend/controllers/userController.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer'); // <-- IMPORT Multer for error handling
const cloudinary = require('../config/cloudinary'); // <-- IMPORT Cloudinary instance
const User = require('../models/User');
const BadgeDefinition = require('../models/BadgeDefinition');
const ChallengeDefinition = require('../models/ChallengeDefinition');
const { createNotification } = require('../services/notificationService');
const { getGoldMarketSummary } = require('../utils/goldDataUtils');

// Helper Function (Optional but recommended)
const sendErrorResponse = (res, statusCode, message, error) => {
    console.error(`[API Error] ${statusCode}: ${message}`, error || '');
    // Avoid sending detailed errors to client in production
    const responseMessage = process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : message;
    res.status(statusCode).json({ message: responseMessage });
};

// @desc    Get current user's profile (incl. transactions, gamification state, auto payments, default shipping address, profit calculation, profile picture)
// @route   GET /api/users/me
// @access  Private
const getUserProfile = async (req, res) => {
    // 1. Validate Middleware User ID
    if (!req.user || !req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
        console.error("[UCP getUserProfile] Invalid user object or ID from 'protect' middleware.");
        return res.status(401).json({ message: 'Authentication error: Invalid user data.' });
    }
    const userId = req.user._id;

    try {
        // 2. Fetch User Data AND Gamification Definitions in parallel
        const [user, allBadgeDefs, activeChallengeDefs] = await Promise.all([
            User.findById(userId)
                .populate('transactions')       // Populate for calculations & response
                .populate('automaticPayments') // Populate for response
                .select('-password'),          // Exclude password
            BadgeDefinition.find({ isActive: true }).lean(), // Use .lean() for plain JS objects
            ChallengeDefinition.find({ isActive: true }).lean() // Use .lean()
        ]);
        // --- END Fetch ---

        if (!user) {
            console.error(`[UCP getUserProfile] User ${userId} not found in database.`);
            return res.status(404).json({ message: 'User not found.' });
        }
        // Log warnings if definitions couldn't be fetched, but don't fail the request
        if (!allBadgeDefs) console.warn("[UCP getUserProfile] Failed to fetch badge definitions.");
        if (!activeChallengeDefs) console.warn("[UCP getUserProfile] Failed to fetch challenge definitions.");

        console.log(`[UCP Debug getUserProfile] Fetched user ${userId} state successfully.`);

        // --- V V V PROFIT CALCULATION (Keep this logic) V V V ---

        let totalInvestedLKR = 0;
        let totalGramsPurchased = 0;

        // Iterate through user's actual transactions array (populated)
        (user.transactions || []).forEach(tx => {
            if (tx && tx.type === 'investment' && tx.status === 'completed') {
                totalInvestedLKR += tx.amountLKR || 0;
                totalGramsPurchased += tx.amountGrams || 0;
            }
        });

        const averagePurchasePricePerGram = (totalGramsPurchased > 0)
            ? (totalInvestedLKR / totalGramsPurchased)
            : 0;

        // Get current market price
        const marketSummary = getGoldMarketSummary();
        const currentPricePerGram = marketSummary?.latestPricePerGram || 0;

        // Calculate current value and profit
        const currentValueLKR = user.goldBalanceGrams * currentPricePerGram;
        let overallProfitLKR = 0;
        let overallProfitPercent = 0;

        if (averagePurchasePricePerGram > 0 && user.goldBalanceGrams > 0) {
            const costBasisOfCurrentHoldings = user.goldBalanceGrams * averagePurchasePricePerGram;
            overallProfitLKR = currentValueLKR - costBasisOfCurrentHoldings;
            if (costBasisOfCurrentHoldings > 0) {
                overallProfitPercent = (overallProfitLKR / costBasisOfCurrentHoldings) * 100;
            }
        }
        // --- ^ ^ ^ END PROFIT CALCULATION ^ ^ ^ ---

        // 3. Prepare Response Data
        const sortedTransactions = (user.transactions || [])
            ?.filter(tx => tx && tx.date) // Ensure transaction and date exist
            ?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [];

        console.log(`[UCP Debug getUserProfile] Responding for user ${user._id}. AvgPrice=${averagePurchasePricePerGram.toFixed(2)}, CurrentValue=${currentValueLKR.toFixed(2)}, Profit=${overallProfitLKR.toFixed(2)}`);

        // 4. Send Response with current user state, calculated values, AND DB definitions
        res.json({
             // Basic Info
             _id: user._id,
             name: user.name,
             email: user.email,
             phone: user.phone,
             address: user.address,
             city: user.city,
             nic: user.nic,
             profilePictureUrl: user.profilePictureUrl || null, // <-- INCLUDE PROFILE PICTURE URL
             createdAt: user.createdAt,
             // Wallet Core Data
             goldBalanceGrams: user.goldBalanceGrams,
             cashBalanceLKR: user.cashBalanceLKR,
             transactions: sortedTransactions,
             automaticPayments: user.automaticPayments || [],
             defaultShippingAddress: user.defaultShippingAddress || null,

             // Calculated Values
             averagePurchasePricePerGram: averagePurchasePricePerGram,
             currentGoldValueLKR: currentValueLKR,
             overallProfitLKR: overallProfitLKR,
             overallProfitPercent: overallProfitPercent,

             // Gamification State (from user document)
             earnedBadgeIds: user.earnedBadgeIds || [],
             challengeProgress: user.challengeProgress ? Object.fromEntries(user.challengeProgress) : {},
             completedChallengeIds: user.completedChallengeIds || [],
             starCount: user.starCount || 0,

             // Gamification Definitions (fetched from DB)
             gamificationDefs: {
                 badges: allBadgeDefs || [], // Send fetched definitions (fallback to empty array)
                 challenges: activeChallengeDefs || [] // Send fetched definitions (fallback to empty array)
             }
         });

    } catch (error) {
        // Catch unexpected errors during the fetch/preparation process
        sendErrorResponse(res, 500, `Unexpected server error getting user profile for ${userId}.`, error);
    }
};


// @desc    Update user profile (subset of fields)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  // 1. Validate Middleware User ID
  if (!req.user || !req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      return res.status(401).json({ message: 'Authentication error: Invalid user data.' });
  }
  const userId = req.user._id;

  try {
    // 2. Fetch fresh user data from DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Apply updates only for provided fields
    const { name, phone, address, city, defaultShippingAddress } = req.body;
    let updated = false;

    if (name !== undefined && user.name !== name) { user.name = name; updated = true; }
    if (phone !== undefined && user.phone !== phone) { user.phone = phone; updated = true; }
    if (address !== undefined && user.address !== address) { user.address = address; updated = true; }
    if (city !== undefined && user.city !== city) { user.city = city; updated = true; }
    // Basic check for defaultShippingAddress; add deeper validation if needed
    if (defaultShippingAddress !== undefined && JSON.stringify(user.defaultShippingAddress) !== JSON.stringify(defaultShippingAddress)) {
        // Add validation for required fields in defaultShippingAddress if needed
        user.defaultShippingAddress = defaultShippingAddress;
        updated = true;
    }

    // 4. Save only if changes were made
    let updatedUser = user;
    if (updated) {
        updatedUser = await user.save();
    }

    // 5. Respond with consistent subset of data
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email, // Email usually not updatable here, but good to return
      phone: updatedUser.phone,
      address: updatedUser.address,
      city: updatedUser.city,
      nic: updatedUser.nic, // Include NIC
      defaultShippingAddress: updatedUser.defaultShippingAddress,
      profilePictureUrl: updatedUser.profilePictureUrl || null, // Include profile picture in response
      // Avoid sending back balances/transactions on profile update
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
        sendErrorResponse(res, 400, "Validation Error updating profile.", error);
    } else {
        sendErrorResponse(res, 500, `Server Error updating profile for ${userId}.`, error);
    }
  }
};

// @desc    Change user password (when logged in)
// @route   PUT /api/users/change-password
// @access  Private
const changeUserPassword = async (req, res) => {
    // 1. Validate Middleware User ID
    if (!req.user || !req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
        return res.status(401).json({ message: 'Authentication error: Invalid user data.' });
    }
    const userId = req.user._id;

    const { currentPassword, newPassword } = req.body;
    const MIN_PASSWORD_LENGTH = parseInt(process.env.MIN_PASSWORD_LENGTH || '8', 10);

    // 2. Input Validation
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Please provide current and new passwords.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'New password cannot be the same as the current password.' });
    }

    try {
        // 3. Fetch user including password hash
        const user = await User.findById(userId).select('+password');
        if (!user) {
            // Should not happen if middleware is correct, but safety check
            return res.status(404).json({ message: 'User not found' });
        }

        // 4. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            // Generic message for security
            return res.status(401).json({ message: 'Authentication failed.' });
        }

        // 5. Update password (pre-save hook in User model handles hashing)
        user.password = newPassword;
        await user.save();

        // 6. Create Notification (after successful save)
        try {
            await createNotification(userId, 'security_password_change', {
                title: 'Password Changed',
                message: 'Your GoldNest account password was successfully changed.',
                // link: '/settings/security' // Optional link
            });
            console.log(`[UCP changePassword] Password change notification created for user ${userId}`);
        } catch (notificationError) {
            console.error(`[UCP ERROR changePassword] Failed notification for user ${userId}:`, notificationError);
            // Log error but don't fail the main request as password change succeeded
        }

        // 7. Respond
        res.json({ message: 'Password changed successfully.' });

    } catch (error) {
        if (error.name === 'ValidationError') {
             sendErrorResponse(res, 400, "Validation Error changing password.", error);
        } else {
             sendErrorResponse(res, 500, `Server Error changing password for ${userId}.`, error);
        }
    }
};

// @desc    Upload or update user profile picture
// @route   POST /api/users/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
    // 1. Validate Middleware User ID
    if (!req.user || !req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
        return res.status(401).json({ message: 'Authentication error: Invalid user data.' });
    }
    const userId = req.user._id;

    try {
        // 2. Check if file was uploaded by multer
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided.' });
        }

        // 3. Get the URL from Cloudinary (stored in req.file.path by multer-storage-cloudinary)
        const imageUrl = req.file.path;
        console.log(`[UCP uploadProfilePicture] Cloudinary URL for user ${userId}: ${imageUrl}`);

        // 4. Find user
        const user = await User.findById(userId);
        if (!user) {
            // Should not happen if 'protect' middleware works, but safety check
            console.error(`[UCP uploadProfilePicture] User ${userId} not found after successful auth.`);
            // Optionally try to delete the uploaded image if user suddenly not found
            // (consider edge cases and if this is necessary)
            return res.status(404).json({ message: 'User not found.' });
        }

        // 5. Optional: Delete old image from Cloudinary if one exists
        const oldImageUrl = user.profilePictureUrl;
        if (oldImageUrl) {
             try {
                // Extract public_id from the Cloudinary URL.
                // This regex assumes the standard Cloudinary structure and your specific folder/naming convention.
                // Example URL: https://res.cloudinary.com/<cloud_name>/image/upload/v167.../goldnest_profile_pics/user_60d..._167...jpg
                // Need to extract: goldnest_profile_pics/user_60d..._167...
                const publicIdMatch = oldImageUrl.match(/upload\/(?:v\d+\/)?(.*)\.\w+$/);
                if (publicIdMatch && publicIdMatch[1]) {
                    const publicId = publicIdMatch[1];
                    // Basic check to avoid deleting unrelated files if URL format is unexpected
                    if (publicId.startsWith('goldnest_profile_pics/')) {
                        console.log(`[UCP uploadProfilePicture] Attempting to delete old Cloudinary image: ${publicId}`);
                        // Use the imported cloudinary instance
                        const deletionResult = await cloudinary.uploader.destroy(publicId);
                        console.log(`[UCP uploadProfilePicture] Cloudinary deletion result for ${publicId}:`, deletionResult);
                    } else {
                        console.warn(`[UCP uploadProfilePicture] Skipping deletion - extracted publicId "${publicId}" does not match expected prefix.`);
                    }
                } else {
                     console.warn(`[UCP uploadProfilePicture] Could not extract public_id from old URL: ${oldImageUrl}`);
                }
             } catch (deleteError) {
                  console.error("[UCP ERROR uploadProfilePicture] Failed to delete old Cloudinary image:", deleteError);
                  // Don't block the update if deletion fails, just log it
             }
        }

        // 6. Update user's profilePictureUrl
        user.profilePictureUrl = imageUrl;
        await user.save();
        console.log(`[UCP uploadProfilePicture] User ${userId} profile picture URL updated.`);

        // 7. Respond with success and the new URL
        res.json({
            message: 'Profile picture uploaded successfully.',
            profilePictureUrl: imageUrl,
        });

    } catch (error) {
        console.error('[UCP ERROR uploadProfilePicture] Error:', error);
         // Handle potential Multer errors (like file size limit)
         if (error instanceof multer.MulterError) {
             return res.status(400).json({ message: `File upload error: ${error.message}` });
         }
         // Handle custom file filter error (if defined in multer config)
         if (error.message === 'Only image files are allowed!' || error.message === 'File type not allowed') { // Adapt error message if needed
              return res.status(400).json({ message: error.message });
         }
         // Handle other potential errors (e.g., Cloudinary API errors during deletion - though we try/catch that)
         sendErrorResponse(res, 500, 'Server error during profile picture upload.', error);
    }
};


// @desc    Add a new automatic payment setting
// @route   POST /api/users/autopayments
// @access  Private
const addAutoPayment = async (req, res) => {
    // 1. Validate Middleware User ID
    if (!req.user || !req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
        return res.status(401).json({ message: 'Authentication error: Invalid user data.' });
    }
    const userId = req.user._id;

    const { frequency, amountLKR } = req.body;
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    const MIN_AUTOPAY_AMOUNT = Number(process.env.MIN_AUTOPAY_AMOUNT_LKR) || 100;
    const MAX_AUTOPAYMENTS = Number(process.env.MAX_AUTOPAYMENTS_PER_USER) || 5;

    // 2. Input Validation
    if (!frequency || !validFrequencies.includes(frequency)) {
        return res.status(400).json({ message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}.` });
    }
    const numericAmount = Number(amountLKR);
    if (isNaN(numericAmount) || numericAmount < MIN_AUTOPAY_AMOUNT) {
        return res.status(400).json({ message: `Invalid amount. Must be >= Rs. ${MIN_AUTOPAY_AMOUNT}.` });
    }
    const finalAmount = Math.round(numericAmount * 100) / 100; // Round LKR

    try {
        // 3. Fetch fresh user data
        const user = await User.findById(userId).populate('automaticPayments'); // Populate to check length accurately
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 4. Check Limit
        if (user.automaticPayments && user.automaticPayments.length >= MAX_AUTOPAYMENTS) {
            return res.status(400).json({ message: `Maximum automatic payments (${MAX_AUTOPAYMENTS}) reached.` });
        }

        // 5. Create and Add Subdocument
        const newPayment = {
            _id: new mongoose.Types.ObjectId(), // Generate ID explicitly if needed before save
            frequency,
            amountLKR: finalAmount,
            isActive: true, // Default new payments to active
            // createdAt: new Date(), // Mongoose adds timestamps if schema configured
            // nextRunDate: calculateNextRunDate(frequency), // Calculate if scheduler needs it immediately
        };
        user.automaticPayments.push(newPayment);

        // 6. Save Parent Document
        await user.save();

        // 7. Respond with the newly added payment (which now has an _id)
        // Find the specific payment added to ensure we return the correct one with its generated _id
        const addedPayment = user.automaticPayments.find(p => p._id.equals(newPayment._id));
        if (!addedPayment) {
            // This shouldn't happen if save was successful, but good practice
             return sendErrorResponse(res, 500, `Server Error finding added auto payment for user ${userId}.`, null);
        }
        res.status(201).json(addedPayment);

    } catch (error) {
        if (error.name === 'ValidationError') {
             sendErrorResponse(res, 400, "Validation Error adding auto payment.", error);
        } else {
             sendErrorResponse(res, 500, `Server Error adding auto payment for user ${userId}.`, error);
        }
    }
};

// @desc    Update an existing automatic payment setting
// @route   PUT /api/users/autopayments/:id
// @access  Private
const updateAutoPayment = async (req, res) => {
    // 1. Validate Middleware User ID & Payment ID
    if (!req.user || !req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
        return res.status(401).json({ message: 'Authentication error: Invalid user data.' });
    }
    const userId = req.user._id;
    const { id: paymentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({ message: 'Invalid automatic payment ID format.' });
    }

    // 2. Input Validation (only for fields provided)
    const { frequency, amountLKR, isActive } = req.body;
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    const MIN_AUTOPAY_AMOUNT = Number(process.env.MIN_AUTOPAY_AMOUNT_LKR) || 100;

    let finalAmount;
    if (amountLKR !== undefined) {
        const numericAmount = Number(amountLKR);
        if (isNaN(numericAmount) || numericAmount < MIN_AUTOPAY_AMOUNT) {
            return res.status(400).json({ message: `Invalid amount. Must be >= Rs. ${MIN_AUTOPAY_AMOUNT}.` });
        }
        finalAmount = Math.round(numericAmount * 100) / 100;
    }
    if (frequency !== undefined && !validFrequencies.includes(frequency)) {
        return res.status(400).json({ message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}.` });
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Invalid value for isActive. Must be true or false.' });
    }
    if (frequency === undefined && finalAmount === undefined && isActive === undefined) {
        return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    try {
        // 3. Fetch fresh user data
        const user = await User.findById(userId).populate('automaticPayments'); // Populate needed to find subdoc by ID
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 4. Find the subdocument using Mongoose's id() method
        const payment = user.automaticPayments.id(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Automatic payment setting not found.' });
        }

        // 5. Apply updates to subdocument if values changed
        let updated = false;
        if (frequency !== undefined && payment.frequency !== frequency) {
            payment.frequency = frequency; updated = true;
            // payment.nextRunDate = calculateNextRunDate(frequency); // Optional: recalculate if needed
        }
        if (finalAmount !== undefined && payment.amountLKR !== finalAmount) {
            payment.amountLKR = finalAmount; updated = true;
        }
        if (isActive !== undefined && payment.isActive !== isActive) {
            payment.isActive = isActive; updated = true;
            // if (!isActive) payment.nextRunDate = null; // Optional: clear next run if deactivated
        }

        // 6. Save Parent Document only if subdocument changed
        if (updated) {
            // payment.updatedAt = new Date(); // Mongoose handles timestamps if schema configured
            await user.save();
        }

        // 7. Respond with the (potentially) updated payment object
        res.json(payment);

    } catch (error) {
         if (error.name === 'ValidationError') {
             sendErrorResponse(res, 400, "Validation Error updating auto payment.", error);
        } else {
             sendErrorResponse(res, 500, `Server Error updating auto payment ${paymentId} for user ${userId}.`, error);
        }
    }
};

// @desc    Delete an automatic payment setting
// @route   DELETE /api/users/autopayments/:id
// @access  Private
const deleteAutoPayment = async (req, res) => {
    // 1. Validate Middleware User ID & Payment ID
    if (!req.user || !req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
        return res.status(401).json({ message: 'Authentication error: Invalid user data.' });
    }
    const userId = req.user._id;
    const { id: paymentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({ message: 'Invalid automatic payment ID format.' });
    }

    try {
        // 2. Fetch fresh user data
        const user = await User.findById(userId).populate('automaticPayments'); // Populate to allow subdoc removal
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 3. Find the subdocument
        const payment = user.automaticPayments.id(paymentId);
        if (!payment) {
            // Already deleted or never existed - return success-like or 404. 404 is clearer.
            return res.status(404).json({ message: 'Automatic payment setting not found.' });
        }

        // 4. Remove the subdocument using the remove() method on the subdocument itself
        // Note: Mongoose 8+ might require pulling by ID instead. Check docs if upgrading.
        // Mongoose 6/7 way:
        await payment.remove(); // Mark for removal (or directly remove depending on Mongoose version/context)

        // Alternative for Mongoose 8+ (if `remove()` is deprecated on subdocs):
        // user.automaticPayments.pull({ _id: paymentId });

        console.log(`[UCP deleteAutoPayment] Marked/Removed auto payment ${paymentId} for user ${userId}`);


        // 5. Save Parent Document to persist the removal
        await user.save();
        console.log(`[UCP deleteAutoPayment] Auto payment ${paymentId} deletion saved successfully for user ${userId}`);


        // 6. Respond
        res.json({ message: 'Automatic payment deleted successfully.', deletedId: paymentId });

    } catch (error) {
         console.error(`[UCP ERROR deleteAutoPayment] Error deleting payment ${paymentId} for user ${userId}:`, error);
         sendErrorResponse(res, 500, `Server Error deleting auto payment ${paymentId} for user ${userId}.`, error);
    }
};

// Export all controller functions
module.exports = {
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
    uploadProfilePicture, // <-- EXPORT NEW CONTROLLER
    addAutoPayment,
    updateAutoPayment,
    deleteAutoPayment
};