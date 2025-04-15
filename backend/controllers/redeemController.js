// backend/controllers/redeemController.js
const User = require('../models/User');
const { getGoldMarketSummary } = require('../utils/goldDataUtils'); // Keep if needed later, though not used in this function currently
const { createNotification } = require('../services/notificationService');
const { updateGamificationOnAction } = require('../services/gamificationTriggerService'); // <<< Added gamification service import

// --- Configuration ---
const REDEMPTION_FEES = { // Example fees (can be more dynamic)
    '1g': 150,  // Example fee for 1g coin
    '5g': 250,  // Example fee for 5g coin
    '10g': 400, // Example fee for 10g coin
    'default': 500 // Fee for sizes not listed or for custom calc base
    // Add fees for bars if needed: e.g., '20g': 600, '50g': 1000, '100g': 1500
};

const GRAMS_PER_ITEM = { // Map item size string to grams
    '1g': 1,
    '5g': 5,
    '10g': 10,
    // Add bars if needed: '20g': 20, '50g': 50, '100g': 100
};

// Helper function for formatting currency - might move to utils
const formatCurrency = (value) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value);

// Helper function for formatting dates (simple YYYY-MM-DD)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A'; // Handle cases where date might be null/undefined
    try {
        // Use 'en-CA' locale for YYYY-MM-DD, or adjust as needed
        return new Date(dateString).toLocaleDateString('en-CA');
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date'; // Fallback for invalid date strings
    }
};

// @desc    Initiate a gold redemption request & optionally save address
// @route   POST /api/redeem
// @access  Private
const requestRedemption = async (req, res) => {
    // Add saveAddressAsDefault flag from request body
    const { itemSize, quantity, shippingDetails, saveAddressAsDefault } = req.body; // e.g., itemSize = "5g", saveAddressAsDefault = true/false
    const userId = req.user._id;

    // --- Validation ---
    if (!itemSize || !GRAMS_PER_ITEM[itemSize] || !quantity || isNaN(quantity) || Number(quantity) <= 0) {
        return res.status(400).json({ message: 'Invalid item size or quantity.' });
    }
    const qty = Math.floor(Number(quantity)); // Ensure integer quantity
    if (qty <= 0) {
        return res.status(400).json({ message: 'Quantity must be positive.' });
    }

    // Validate shipping details (basic presence check)
    if (!shippingDetails || !shippingDetails.fullName || !shippingDetails.addressLine1 || !shippingDetails.city || !shippingDetails.zipCode || !shippingDetails.country || !shippingDetails.phone) {
        return res.status(400).json({ message: 'Incomplete shipping details provided.' });
    }

    const goldRequired = GRAMS_PER_ITEM[itemSize] * qty;
    const shippingFee = (REDEMPTION_FEES[itemSize] || REDEMPTION_FEES['default']) * qty; // Example: Fee per item
    const itemDescription = `${itemSize} ${GRAMS_PER_ITEM[itemSize] > 10 ? 'Bar' : 'Coin'} x ${qty}`; // Calculate description earlier for reuse

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // --- Check Balances ---
        if (user.goldBalanceGrams < goldRequired) {
            return res.status(400).json({ message: 'Insufficient gold balance for this redemption.' });
        }
        if (user.cashBalanceLKR < shippingFee) {
             return res.status(400).json({ message: `Insufficient cash balance for shipping fees (Requires ${formatCurrency(shippingFee)}). Please deposit funds.` });
        }

        // --- Calculate Estimated Delivery Date (Simplified) ---
        const calculateDeliveryDate = () => {
            const deliveryStartDate = new Date(); // Today
            let estimatedDate = new Date(deliveryStartDate);
            estimatedDate.setDate(deliveryStartDate.getDate() + 3); // Add 3 calendar days initially

            const dayOfWeek = estimatedDate.getDay(); // 0 = Sunday, 6 = Saturday
            if (dayOfWeek === 6) { // If Saturday
                estimatedDate.setDate(estimatedDate.getDate() + 2); // Move to Monday
            } else if (dayOfWeek === 0) { // If Sunday
                estimatedDate.setDate(estimatedDate.getDate() + 1); // Move to Monday
            }
            // Ensure delivery is at least next day even with weekend adjustments
            if (estimatedDate <= deliveryStartDate) estimatedDate.setDate(deliveryStartDate.getDate() + 4); // Simple check to avoid same/past date

            return estimatedDate;
        };
        const estimatedDeliveryDate = calculateDeliveryDate();
        // --- End Delivery Date Calculation ---

        // --- Update Balances ---
        user.goldBalanceGrams -= goldRequired;
        user.cashBalanceLKR -= shippingFee; // Deduct fee from cash balance

        // --- Add Transaction Record ---
        user.transactions.push({
            type: 'redemption',
            amountGrams: goldRequired, // Gold deducted
            amountLKR: shippingFee, // LKR deducted (fee)
            description: `Redemption request for ${itemDescription}`,
            status: 'processing', // Use 'processing' as per the change request.
            shippingAddress: { // Store a clean copy of the address used for THIS redemption
                fullName: shippingDetails.fullName,
                addressLine1: shippingDetails.addressLine1,
                addressLine2: shippingDetails.addressLine2 || '', // Handle optional field
                city: shippingDetails.city,
                state: shippingDetails.state || '', // Handle optional field
                zipCode: shippingDetails.zipCode,
                country: shippingDetails.country,
                phone: shippingDetails.phone,
            },
            itemDescription: itemDescription, // Store calculated description
            estimatedDeliveryDate: estimatedDeliveryDate, // Save the calculated date
            // trackingNumber will be added later by an admin/process
        });

        // --- Update Default Shipping Address IF requested ---
        if (saveAddressAsDefault === true) {
            const newDefaultAddress = {
                fullName: shippingDetails.fullName,
                addressLine1: shippingDetails.addressLine1,
                addressLine2: shippingDetails.addressLine2 || '',
                city: shippingDetails.city,
                state: shippingDetails.state || '',
                zipCode: shippingDetails.zipCode,
                country: shippingDetails.country,
                phone: shippingDetails.phone
            };
            user.defaultShippingAddress = newDefaultAddress;
            console.log(`Updated default shipping address for user ${userId}`);
        }

        // Save all changes (balances, transaction, optional default address)
        const updatedUser = await user.save(); // Save redemption first

        // --- Retrieve the Newly Created Transaction ---
        const newTransaction = updatedUser.transactions[updatedUser.transactions.length - 1];

        // --- Create Notification ---
        try {
             await createNotification(userId, 'redemption_requested', {
                 title: 'Redemption Requested',
                 // Use formatDate helper for the message
                 message: `Your request to redeem ${newTransaction.itemDescription} is confirmed and processing. Estimated delivery: ${formatDate(newTransaction.estimatedDeliveryDate)}.`,
                 link: '/wallet', // Or '/orders', '/transactions' etc. depending on your frontend routing
                 metadata: { transactionId: newTransaction._id.toString() } // Ensure ID is a string if needed
             });
             console.log(`Notification created for successful redemption request for user ${userId}, transaction ${newTransaction._id}`);
        } catch (notificationError) {
            // Log the notification error but don't fail the entire request
             console.error(`Failed to create notification for user ${userId} after redemption ${newTransaction._id}:`, notificationError);
             // Optionally: Add to a retry queue or specific logging system
        }
        // --- End Create Notification ---

        // --- Trigger Gamification Update ---  <<< Added Section
        // This runs in the background and does not block the response.
        // Errors are logged but don't cause the redemption request to fail.
        updateGamificationOnAction(userId, 'redemption', {
            amountGrams: newTransaction.amountGrams // Pass the redeemed grams amount
        }).catch(gamError => console.error(`Gamification update failed after redemption for user ${userId} (transaction ${newTransaction._id}):`, gamError));
        // --- End Trigger Gamification Update ---


        // --- Success Response ---
        // Send response immediately after saving and initiating background tasks
        res.status(201).json({ // 201 Created (request created)
            message: `Redemption request for ${itemDescription} submitted successfully.`,
            newGoldBalanceGrams: updatedUser.goldBalanceGrams,
            newCashBalanceLKR: updatedUser.cashBalanceLKR,
            // Send back the newly created transaction object
            transaction: newTransaction
        });

    } catch (error) {
        console.error("Error during redemption request:", error);
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: 'Validation Error saving data.', details: error.errors });
        }
        res.status(500).json({ message: 'Server Error processing redemption request.' });
    }
};


module.exports = { requestRedemption };