// backend/routes/userPreferenceRoutes.js
const express = require('express');
const { getNotificationPreferences, updateNotificationPreferences } = require('../controllers/userPreferenceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all preference routes

router.route('/notifications')
    .get(getNotificationPreferences)
    .put(updateNotificationPreferences);

module.exports = router;