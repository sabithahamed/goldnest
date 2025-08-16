// backend/routes/marketRoutes.js
const express = require('express');
const { getGoldSummary, getHistoricalGoldData } = require('../controllers/marketController'); // <-- IMPORT getHistoricalGoldData

const router = express.Router();

router.get('/gold-summary', getGoldSummary);
router.get('/historical-data', getHistoricalGoldData); // <-- ADD THIS NEW ROUTE

module.exports = router;