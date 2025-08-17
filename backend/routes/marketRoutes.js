// backend/routes/marketRoutes.js
const express = require('express');
const { getGoldSummary, getHistoricalGoldData, getFees } = require('../controllers/marketController'); // <-- IMPORT getFees

const router = express.Router();

router.get('/gold-summary', getGoldSummary);
router.get('/historical-data', getHistoricalGoldData);
router.get('/fees', getFees); // <-- ADD THIS NEW ROUTE

module.exports = router;