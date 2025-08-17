// backend/routes/adminPromoRoutes.js
const express = require('express');
const router = express.Router();
const { getPromoCodes, createPromoCode, deletePromoCode } = require('../controllers/adminPromoController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

router.use(protectAdmin);

router.route('/')
    .get(getPromoCodes)
    .post(createPromoCode);

router.route('/:id')
    .delete(deletePromoCode);

module.exports = router;