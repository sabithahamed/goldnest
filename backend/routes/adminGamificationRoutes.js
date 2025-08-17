// backend/routes/adminGamificationRoutes.js
const express = require('express');
const router = express.Router();
const { getChallenges, createChallenge, deleteChallenge } = require('../controllers/adminGamificationController'); // <-- IMPORT deleteChallenge
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

router.use(protectAdmin);

router.get('/', getChallenges);
router.post('/', createChallenge);

router.route('/:id')
    .delete(deleteChallenge); // <-- ADD THIS NEW ROUTE
    
module.exports = router;