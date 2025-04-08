// backend/routes/priceAlertRoutes.js
const express = require('express');
const {
    getPriceAlerts, addPriceAlert, updatePriceAlert, deletePriceAlert
} = require('../controllers/priceAlertController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all price alert routes

router.route('/')
    .get(getPriceAlerts)
    .post(addPriceAlert);

router.route('/:id')
    .put(updatePriceAlert)
    .delete(deletePriceAlert);

module.exports = router;