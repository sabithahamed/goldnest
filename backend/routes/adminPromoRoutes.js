// backend/routes/adminPromoRoutes.js
const express = require('express');
const router = express.Router();
const { getPromoCodes, createPromoCode, deletePromoCode } = require('../controllers/adminPromoController');
const { protectAdmin, superAdminOnly, confirmPassword } = require('../middleware/adminAuthMiddleware');

router.use(protectAdmin);

router.route('/')
    .get(getPromoCodes)
    .post(confirmPassword, createPromoCode);

router.route('/:id')
    .delete(superAdminOnly, confirmPassword, deletePromoCode);

module.exports = router;