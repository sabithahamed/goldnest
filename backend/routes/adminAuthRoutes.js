// backend/routes/adminAuthRoutes.js
const express = require('express');
const { loginAdmin, logoutAdmin, resetAdminPassword,validateAdminSession  } = require('../controllers/adminAuthController');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

// ... existing login route ...
router.post('/login', loginAdmin);
router.put('/reset-password/:resettoken', resetAdminPassword);
// Add the logout route, protected to ensure an admin is logged in
router.get('/validate-session', protectAdmin, validateAdminSession);
router.post('/logout', protectAdmin, logoutAdmin);
module.exports = router;