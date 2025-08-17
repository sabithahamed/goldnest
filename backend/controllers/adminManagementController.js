// backend/controllers/adminManagementController.js
const Admin = require('../models/Admin');
const AdminActionLog = require('../models/AdminActionLog');
const { logAdminAction } = require('../services/auditLogService');

const getAdmins = async (req, res) => {
    // Find all admins except the current one
    const admins = await Admin.find({ _id: { $ne: req.admin._id } }).select('-password');
    res.json(admins);
};

const createAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;

    // Add validation for password
    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        return res.status(400).json({ message: 'Admin with this email already exists.' });
    }

    try {
        // --- THIS IS THE FIX ---
        // Create a new document instance instead of using the static .create()
        const newAdmin = new Admin({ 
            name, 
            email, 
            password, // Pass the plain text password here
            role 
        });

        // Calling .save() on the instance will reliably trigger the 'pre' save hook for hashing
        const savedAdmin = await newAdmin.save();
        // --- END OF FIX ---

        await logAdminAction(req.admin, 'Created new admin account', { type: 'Admin', id: savedAdmin._id }, { newAdminEmail: email, role });
        
        // Don't send the password back, even though it's a hash
        const adminResponse = savedAdmin.toObject();
        delete adminResponse.password;

        res.status(201).json(adminResponse);
    } catch (error) {
        console.error("Error creating admin:", error);
        res.status(500).json({ message: "Server error while creating admin." });
    }
};

const getAuditLogs = async (req, res) => {
    const logs = await AdminActionLog.find({}).sort({ createdAt: -1 }).limit(50); // Get latest 50 logs
    res.json(logs);
};

module.exports = { getAdmins, createAdmin, getAuditLogs };