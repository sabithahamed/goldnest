// backend/routes/notificationRoutes.js
const express = require('express');
const { getNotifications, markAllAsRead, markOneAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all notification routes

router.route('/')
    .get(getNotifications);

router.put('/read-all', markAllAsRead);

router.put('/:id/read', markOneAsRead);

module.exports = router;