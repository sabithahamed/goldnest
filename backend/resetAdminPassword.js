// backend/resetAdminPassword.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

dotenv.config();

const resetPassword = async () => {
  await connectDB();

  try {
    // --- IMPORTANT: CHANGE THIS TO THE EMAIL OF THE ADMIN YOU CREATED ---
    const adminEmailToReset = 'admin@goldnest.lk'; // Or 'admin@goldnest.lk' if you used that in the seed script

    // --- SET THE NEW PASSWORD HERE ---
    const newPassword = 'goldnest1234';

    const admin = await Admin.findOne({ email: adminEmailToReset });

    if (!admin) {
      console.error(`❌ Error: No admin found with the email: ${adminEmailToReset}`);
      console.log('Please check your database or run the seedAdmin.js script first.');
      process.exit(1);
    }

    // Set the new password. The 'pre-save' hook in Admin.js will automatically hash it.
    admin.password = newPassword;
    await admin.save();

    console.log('✅ Admin password has been reset successfully!');
    console.log('------------------------------------');
    console.log('Email:', admin.email);
    console.log('New Password:', newPassword);
    console.log('------------------------------------');
    console.log('You can now log in with these new credentials.');

  } catch (error) {
    console.error('❌ Error resetting admin password:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit();
  }
};

resetPassword();