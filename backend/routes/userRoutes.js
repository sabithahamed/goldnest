// backend/routes/userRoutes.js
const express = require('express');
const {
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
    addAutoPayment,
    updateAutoPayment,
    deleteAutoPayment,
    uploadProfilePicture // <-- IMPORT NEW CONTROLLER
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary'); // <-- IMPORT MULTER UPLOAD MIDDLEWARE

const router = express.Router();

// Apply protect middleware to all routes defined after this line
// Ensures only authenticated users can access these routes
router.use(protect);

// Profile & Settings Routes
router.get('/me', getUserProfile); // GET /api/users/me - Fetch current user's profile
router.put('/profile', updateUserProfile); // PUT /api/users/profile - Update user's profile details (name, email etc.)
router.put('/change-password', changeUserPassword); // PUT /api/users/change-password - Change user's password

// --- NEW PROFILE PICTURE UPLOAD ROUTE ---
// This route handles uploading a new profile picture.
// 1. `protect` middleware (already applied globally) ensures the user is logged in.
// 2. `upload.single('profilePic')` middleware processes the file upload.
//    - It expects a file field named 'profilePic' in the multipart/form-data request.
//    - It uploads the file to Cloudinary (based on the 'upload' config).
//    - It attaches file information (like the URL) to `req.file`.
// 3. `uploadProfilePicture` controller handles updating the user's profile picture URL in the database.
router.post(
    '/profile-picture',
    upload.single('profilePic'), // 'profilePic' must match the FormData key from frontend
    uploadProfilePicture
); // POST /api/users/profile-picture
// --- END NEW PROFILE PICTURE ROUTE ---

// Automatic Payments CRUD Routes
router.post('/autopayments', addAutoPayment); // POST /api/users/autopayments - Add a new automatic payment setting

router.route('/autopayments/:id')
    .put(updateAutoPayment)    // PUT /api/users/autopayments/:id - Update an existing automatic payment setting
    .delete(deleteAutoPayment); // DELETE /api/users/autopayments/:id - Delete an automatic payment setting

module.exports = router;