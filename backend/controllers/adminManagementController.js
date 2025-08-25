// backend/controllers/adminManagementController.js
const Admin = require('../models/Admin');
const AdminActionLog = require('../models/AdminActionLog');
const AdminSession = require('../models/AdminSession');
// --- THIS IS THE FIX: Add missing model imports for the Undo function ---
const Setting = require('../models/Setting');
const DynamicChallenge = require('../models/DynamicChallenge');
const InventoryLog = require('../models/InventoryLog');
// --------------------------------------------------------------------
const { logAdminAction } = require('../services/auditLogService');
const { sendAdminSetupEmail } = require('../services/emailService');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Helper to build a date range query for Mongoose
const buildDateQuery = (startDate, dateField) => {
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        return { [dateField]: { $gte: start } };
    }
    return {};
};

// GET ADMIN ACCOUNTS (now also returns the role)
const getAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select('firstName lastName _id role');
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: "Server error fetching admin accounts." });
    }
};

// CREATE ADMIN
const createAdmin = async (req, res) => {
    const { firstName, lastName, email, nic, role } = req.body;
    if (!firstName || !lastName || !email || !nic || !role) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { nic }] });
    if (existingAdmin) {
        return res.status(400).json({ message: 'Admin with this email or NIC already exists.' });
    }
    try {
        const tempPassword = crypto.randomBytes(20).toString('hex');
        const newAdmin = new Admin({ firstName, lastName, email, nic, role, password: tempPassword });
        const setupToken = newAdmin.getResetPasswordToken();
        const savedAdmin = await newAdmin.save();
        await sendAdminSetupEmail(email, setupToken);
        await logAdminAction(req.admin, 'Created new admin account', { type: 'Admin', id: savedAdmin._id }, { newAdminEmail: email, role });
        const adminResponse = savedAdmin.toObject();
        delete adminResponse.password;
        res.status(201).json(adminResponse);
    } catch (error) {
        if (error.name === 'ValidationError') { return res.status(400).json({ message: error.message }); }
        res.status(500).json({ message: "Server error while creating admin." });
    }
};

// DELETE ADMIN
const deleteAdmin = async (req, res) => {
    try {
        const adminToDelete = await Admin.findById(req.params.id);

        if (!adminToDelete) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        // --- NEW SECURITY CHECK: Protect the root superadmin defined in .env ---
        if (adminToDelete.email === process.env.SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Action forbidden: The root superadmin account cannot be deleted.' });
        }

        if (adminToDelete._id.toString() === req.admin._id.toString()) {
            return res.status(400).json({ message: 'Action forbidden: You cannot delete your own account.' });
        }
        
        const deletedAdminEmail = adminToDelete.email;
        await Admin.deleteOne({ _id: req.params.id });
        await logAdminAction(req.admin, 'Deleted admin account', { type: 'Admin', id: req.params.id }, { deletedAdminEmail });
        res.json({ message: 'Admin account deleted successfully.' });

    } catch (error) {
        console.error("Error deleting admin:", error);
        res.status(500).json({ message: "Server error while deleting admin." });
    }
};

// FIND ADMIN BY NIC OR EMAIL
const findAdminByNicOrEmail = async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ message: 'A search query (NIC or Email) is required.' });
    }
    try {
        const admin = await Admin.findOne({ $or: [{ email: query }, { nic: query }] }).select('-password');
        if (!admin) {
            return res.status(404).json({ message: 'No admin account found with that NIC or Email.' });
        }
        res.json(admin);
    } catch (error) {
        res.status(500).json({ message: "Server error while searching for admin." });
    }
};

// --- THIS IS THE NEW FUNCTION YOU NEED ---
const updateAdminRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['superadmin', 'support', 'finance'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role provided.' });
    }

    try {
        const adminToUpdate = await Admin.findById(id);
        if (!adminToUpdate) {
            return res.status(404).json({ message: 'Admin account not found.' });
        }

        // --- NEW SECURITY CHECK: Protect the root superadmin defined in .env ---
        if (adminToUpdate.email === process.env.SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Action forbidden: The role of the root superadmin account cannot be changed.' });
        }
        
        if (id === req.admin._id.toString()) {
            return res.status(400).json({ message: 'Action forbidden: You cannot change your own role.' });
        }
        
        if (adminToUpdate.role === 'superadmin' && role !== 'superadmin') {
            const superadminCount = await Admin.countDocuments({ role: 'superadmin' });
            if (superadminCount <= 1) {
                return res.status(400).json({ message: 'Action forbidden: Cannot demote the last superadmin.' });
            }
        }

        const oldRole = adminToUpdate.role;
        adminToUpdate.role = role;
        const savedAdmin = await adminToUpdate.save();
        
        await logAdminAction(req.admin, `Updated admin role for ${savedAdmin.email}`, { type: 'Admin', id: savedAdmin._id }, { from: oldRole, to: role });
        res.json({ message: 'Admin role updated successfully.', admin: savedAdmin });

    } catch (error) {
        console.error("Error updating admin role:", error);
        res.status(500).json({ message: "Server error while updating admin role." });
    }
};

// Get simplified, filterable admin session (login/logout) history
const getAdminSessionHistory = async (req, res) => {
    try {
        const { startDate, searchQuery } = req.query;
        let query = {};
        if (searchQuery) {
            query.adminEmail = { $regex: searchQuery, $options: 'i' };
        }
        const dateQuery = buildDateQuery(startDate, 'loginTime');
        query = { ...query, ...dateQuery };
        const sessions = await AdminSession.find(query).sort({ loginTime: -1 }).limit(100);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Server error fetching session history." });
    }
};

// Get simplified, filterable admin action logs
const getAdminActionLogs = async (req, res) => {
    try {
        const { startDate, searchQuery, role } = req.query;
        let query = {};
        if (searchQuery) {
            query.action = { $regex: searchQuery, $options: 'i' };
        }
        const dateQuery = buildDateQuery(startDate, 'createdAt');
        query = { ...query, ...dateQuery };
        
        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'admins',
                    localField: 'adminId',
                    foreignField: '_id',
                    as: 'adminDetails'
                }
            },
            { $unwind: '$adminDetails' }
        ];

        if (role && role !== 'all') {
            aggregationPipeline.push({ $match: { 'adminDetails.role': role } });
        }
        aggregationPipeline.push({
            $project: {
                _id: 1,
                createdAt: 1,
                adminName: 1,
                adminEmail: 1, // <-- Explicitly include the adminEmail from the log
                'adminDetails.role': 1, // Keep the role from the joined admin document
                action: 1,
                details: 1,
                isUndoable: 1,
                isUndone: 1,
                targetId: 1
            }
        });        
        
        aggregationPipeline.push(
            { $sort: { createdAt: -1 } },
            { $limit: 200 }
        );

        const logs = await AdminActionLog.aggregate(aggregationPipeline);
        res.json(logs);
    } catch (error) {
        console.error("Error fetching admin action logs:", error);
        res.status(500).json({ message: "Server error fetching action logs." });
    }
};
const undoAdminAction = async (req, res) => {
    try {
        const logId = req.params.id;
        const actionLog = await AdminActionLog.findById(logId);

        if (!actionLog || !actionLog.isUndoable || actionLog.isUndone) {
            return res.status(400).json({ message: 'This action cannot be undone.' });
        }
        
        const { undoData } = actionLog;
        let successMessage = '';

        // --- Logic to reverse the original action ---
        switch (actionLog.action) {
            case 'Updated platform settings':
                const updatePromises = Object.entries(undoData).map(([key, value]) => 
                    Setting.findOneAndUpdate({ key }, { value }, { upsert: true })
                );
                await Promise.all(updatePromises);
                successMessage = 'Platform settings have been restored.';
                break;
                
            case 'Deleted challenge':
                // Re-create the deleted document from the stored undoData
                await DynamicChallenge.create(undoData.document);
                successMessage = 'The deleted challenge has been restored.';
                break;

            case 'Added physical gold to reserve':
                // Perform the reverse action: delete the inventory log entry
                await InventoryLog.findByIdAndDelete(undoData.targetId);
                // NOTE: This does NOT "un-mint" the tokens. That would require a "burn" function.
                // For simplicity, we are only reverting the database state.
                successMessage = 'The inventory addition has been reverted.';
                break;

            default:
                return res.status(400).json({ message: 'Undo logic for this action is not implemented.' });
        }

        // Mark the log as "undone" so it can't be used again
        actionLog.isUndone = true;
        actionLog.undoneBy = req.admin._id;
        actionLog.undoneAt = new Date();
        await actionLog.save();
        
        // Log the "undo" action itself
        await logAdminAction(
            req.admin,
            `Undid action: "${actionLog.action}"`,
            { type: 'AdminActionLog', id: logId }
        );

        res.json({ message: successMessage });
    } catch (error) {
        console.error("Error undoing action:", error);
        res.status(500).json({ message: 'Server error while undoing the action.' });
    }
};
// --- UPDATED EXPORTS ---
module.exports = { 
    getAdmins, 
    createAdmin, 
    deleteAdmin,
    findAdminByNicOrEmail,
    updateAdminRole,
    getAdminSessionHistory,
    undoAdminAction,
    getAdminActionLogs
};