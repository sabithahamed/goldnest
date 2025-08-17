// backend/routes/adminAuthRoutes.js
const express = require('express');
const { loginAdmin } = require('../controllers/adminAuthController');
const router = express.Router();

router.post('/login', loginAdmin);

// We can add logout, forgot-password routes here later

module.exports = router;