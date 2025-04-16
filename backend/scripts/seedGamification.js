// backend/scripts/seedGamification.js
require('dotenv').config({ path: '../.env' }); // Adjust path if needed
const connectDB = require('../config/db');
const BadgeDefinition = require('../models/BadgeDefinition');
const ChallengeDefinition = require('../models/ChallengeDefinition');
const { BADGES, CHALLENGES } = require('../config/gamification'); // Import from config

connectDB();

const seedData = async () => {
    try {
        // Clear existing definitions (optional, be careful in production)
        await BadgeDefinition.deleteMany();
        await ChallengeDefinition.deleteMany();
        console.log('Existing definitions cleared...');

        // Seed Badges
        const badgeDocs = Object.values(BADGES).map(badge => ({
            badgeId: badge.id, // Use 'id' from config as 'badgeId'
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            criteria: badge.criteria,
            starsAwarded: badge.starsAwarded
            // isActive will default to true
        }));
        await BadgeDefinition.insertMany(badgeDocs);
        console.log('Badge definitions seeded!');

        // Seed Challenges
         const challengeDocs = Object.values(CHALLENGES).map(challenge => ({
             challengeId: challenge.id, // Use 'id' from config as 'challengeId'
             name: challenge.name,
             description: challenge.description,
             goal: challenge.goal,
             unit: challenge.unit,
             type: challenge.type,
             rewardText: challenge.rewardText,
             duration: challenge.duration,
             starsAwarded: challenge.starsAwarded,
             rewardType: challenge.rewardType, // Include new fields
             rewardValue: challenge.rewardValue  // Include new fields
             // isActive will default to true
         }));
         await ChallengeDefinition.insertMany(challengeDocs);
         console.log('Challenge definitions seeded!');

        process.exit();
    } catch (error) {
        console.error('Error seeding gamification data:', error);
        process.exit(1);
    }
};

seedData();