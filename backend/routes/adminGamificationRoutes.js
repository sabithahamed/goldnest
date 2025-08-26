// backend/routes/adminGamificationRoutes.js
const express = require('express');
const router = express.Router();
const { getChallenges, createChallenge, deleteChallenge } = require('../controllers/adminGamificationController'); // <-- IMPORT deleteChallenge
const { protectAdmin, superAdminOnly, confirmPassword } = require('../middleware/adminAuthMiddleware');

router.use(protectAdmin);

router.get('/', getChallenges);
router.post('/', confirmPassword,createChallenge);

router.delete('/:id', superAdminOnly, confirmPassword, deleteChallenge);// <-- ADD THIS NEW ROUTE
    
module.exports = router;