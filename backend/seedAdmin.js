// backend/seedAdmin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const seedSuperAdmin = async () => {
  await connectDB();

  try {
    // --- READS CREDENTIALS FROM YOUR .ENV FILE ---
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in your .env file.');
      process.exit(1);
    }

    // Check if an admin with this email already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`🟡 An admin with the email '${adminEmail}' already exists. Aborting seed.`);
      process.exit();
    }

    // Create the admin user with the data from .env
    const adminData = {
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      nic: '124789412546', // Placeholder NIC for the super admin
      password: adminPassword,
      role: 'superadmin',
      isActive: true
    };

    await Admin.create(adminData);
    
    console.log('✅ Superadmin created successfully!');
    console.log('------------------------------------');
    console.log('You can now log in with the credentials defined in your .env file:');
    console.log('Email:', adminEmail);
    console.log('------------------------------------');

  } catch (error) {
    console.error('❌ Error creating superadmin:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
};

seedSuperAdmin();