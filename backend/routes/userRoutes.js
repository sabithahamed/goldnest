// backend/routes/userRoutes.js
const express = require('express');
const {
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
    addAutoPayment,
    updateAutoPayment,
    deleteAutoPayment
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect); // Apply protect to all routes below

// Profile & Settings
router.get('/me', getUserProfile); // GET /api/users/me
router.put('/profile', updateUserProfile); // PUT /api/users/profile
router.put('/change-password', changeUserPassword); // PUT /api/users/change-password

// Automatic Payments CRUD
router.post('/autopayments', addAutoPayment); // POST /api/users/autopayments
router.route('/autopayments/:id')
    .put(updateAutoPayment)    // PUT /api/users/autopayments/:id
    .delete(deleteAutoPayment); // DELETE /api/users/autopayments/:id

module.exports = router;
