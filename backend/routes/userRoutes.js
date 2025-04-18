// backend/routes/userRoutes.js
const express = require('express');
const {
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
    addAutoPayment,
    updateAutoPayment,
    deleteAutoPayment,
    uploadProfilePicture,
    getAutoPayments // <-- IMPORTED NEW CONTROLLER
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary'); // <-- IMPORT MULTER UPLOAD MIDDLEWARE

const router = express.Router();

// Apply protect middleware to all routes defined after this line
// Ensures only authenticated users can access these routes
router.use(protect);

// --- Profile & Settings Routes ---
router.get('/me', getUserProfile); // GET /api/users/me - Fetch current user's profile
router.put('/profile', updateUserProfile); // PUT /api/users/profile - Update user's profile details (name, email etc.)
router.put('/change-password', changeUserPassword); // PUT /api/users/change-password - Change user's password

// --- Profile Picture Upload Route ---
// Handles uploading a new profile picture via multipart/form-data
router.post(
    '/profile-picture',
    upload.single('profilePic'), // Middleware: processes 'profilePic' field, uploads to Cloudinary
    uploadProfilePicture        // Controller: updates user document with picture URL
); // POST /api/users/profile-picture

// --- Automatic Payments CRUD Routes ---

// Routes for collection of auto payments (/api/users/autopayments)
router.route('/autopayments')
    .get(getAutoPayments)     // GET /api/users/autopayments - Fetch all auto payments for the user <-- NEW ROUTE
    .post(addAutoPayment);    // POST /api/users/autopayments - Add a new automatic payment setting

// Routes for a specific auto payment by ID (/api/users/autopayments/:id)
router.route('/autopayments/:id')
    .put(updateAutoPayment)    // PUT /api/users/autopayments/:id - Update an existing automatic payment setting
    .delete(deleteAutoPayment); // DELETE /api/users/autopayments/:id - Delete an automatic payment setting

module.exports = router;