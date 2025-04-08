// backend/routes/marketRoutes.js
const express = require('express');
const { getGoldSummary } = require('../controllers/marketController');

const router = express.Router();

router.get('/gold-summary', getGoldSummary);

module.exports = router;