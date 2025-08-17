// backend/controllers/adminGamificationController.js
const DynamicChallenge = require('../models/DynamicChallenge');

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
        res.status(201).json(newChallenge);
    } catch (error) {
        res.status(400).json({ message: "Error creating challenge.", error: error.message });
    }
};

// @desc    Delete a dynamic challenge by ID
// @route   DELETE /api/admin/gamification/:id
// @access  Private (Admin Only)
const deleteChallenge = async (req, res) => {
    try {
        const challenge = await DynamicChallenge.findById(req.params.id);

        if (challenge) {
            await DynamicChallenge.deleteOne({ _id: req.params.id });
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
    deleteChallenge // <-- EXPORT THE NEW FUNCTION
};