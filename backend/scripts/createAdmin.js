// backend/scripts/createAdmin.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin'); // <-- Adjust path if your models folder is elsewhere

// Load environment variables from .env file
dotenv.config({ path: './backend/.env' }); // <-- Point to the .env file in the root backend folder

// --- 🔑 CONFIGURE YOUR NEW ADMIN HERE ---
const newAdminDetails = {
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@goldnest.lk',    // <-- SET THE EMAIL
    password: 'goldnest1234', // <-- SET THE PLAIN TEXT PASSWORD HERE
    nic: '199512345678',                // <-- SET A VALID NIC (12 digits or 9 digits + V/X)
    role: 'superadmin'
};
// -----------------------------------------


const createAdmin = async () => {
    console.log('Connecting to database...');
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected.');

        // 1. Check if an admin with this email already exists
        const existingAdmin = await Admin.findOne({ email: newAdminDetails.email });
        if (existingAdmin) {
            console.warn(`⚠️ An admin with the email "${newAdminDetails.email}" already exists.`);
            return;
        }

        console.log('Creating new admin...');

        // 2. Create a new admin instance using the model
        // The 'pre save' hook in your Admin model will automatically hash the password.
        const admin = new Admin(newAdminDetails);
        
        // 3. Save the new admin to the database
        await admin.save();

        console.log('✅ Admin user created successfully!');
        console.log('---------------------------------');
        console.log(`Email: ${newAdminDetails.email}`);
        console.log(`Password: (the one you set in the script)`);
        console.log('---------------------------------');

    } catch (error) {
        // Handle potential validation errors or database errors
        console.error('❌ Error creating admin:', error.message);
    } finally {
        // 4. Disconnect from the database
        await mongoose.disconnect();
        console.log('Database connection closed.');
    }
};

// Run the script
createAdmin();