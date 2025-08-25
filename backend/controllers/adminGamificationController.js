// backend/controllers/adminGamificationController.js
const DynamicChallenge = require('../models/DynamicChallenge');
const { logAdminAction } = require('../services/auditLogService'); // <-- ADD THIS IMPORT

const getChallenges = async (req, res) => {
    try {
        const challenges = await DynamicChallenge.find({}).sort({ createdAt: -1 });
        res.json(challenges);
    } catch (error) {
        res.status(500).json({ message: "Error fetching challenges." });
    }
};

const createChallenge = async (req, res) => {
    try {
        const newChallenge = new DynamicChallenge(req.body);
        await newChallenge.save();
        
        // --- NEW: Log this action ---
        await logAdminAction(
            req.admin,
            'Created new challenge',
            { type: 'DynamicChallenge', id: newChallenge._id },
            { name: newChallenge.name }
        );
        
        res.status(201).json(newChallenge);
    } catch (error) {
        res.status(400).json({ message: "Error creating challenge.", error: error.message });
    }
};

const deleteChallenge = async (req, res) => {
    try {
        const challenge = await DynamicChallenge.findById(req.params.id);

        if (challenge) {
            // --- NEW: Create a plain object of the challenge BEFORE deleting for the undo log ---
            const challengeDataForUndo = challenge.toObject();
            delete challengeDataForUndo._id;
            delete challengeDataForUndo.createdAt;
            delete challengeDataForUndo.updatedAt;
            delete challengeDataForUndo.__v; // Also remove version key

            const challengeName = challenge.name; // Get name for the details log
            
            await DynamicChallenge.deleteOne({ _id: req.params.id });

            // --- UPDATED: Pass the old challenge data for the undo feature ---
            await logAdminAction(
                req.admin,
                'Deleted challenge',
                { type: 'DynamicChallenge', id: req.params.id },
                { name: challengeName },
                { document: challengeDataForUndo } // Pass the full old document for restoration
            );
            
            res.json({ message: 'Challenge removed' });
        } else {
            res.status(404).json({ message: 'Challenge not found' });
        }
    } catch (error) {
        console.error('Error deleting challenge:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getChallenges,
    createChallenge,
    deleteChallenge
};