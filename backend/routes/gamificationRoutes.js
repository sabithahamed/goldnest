// backend/routes/gamificationRoutes.js
const express = require('express');
const { claimChallengeReward } = require('../controllers/gamificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/claim/:challengeId', claimChallengeReward);

module.exports = router;