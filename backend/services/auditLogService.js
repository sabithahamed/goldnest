// backend/services/auditLogService.js
const AdminActionLog = require('../models/AdminActionLog');

/**
 * Creates a new log entry for an admin action.
 * @param {object} admin - The admin user object from req.admin. Must include firstName, lastName, and email.
 * @param {string} action - A description of the action taken.
 * @param {object} [target={}] - Optional information about the target of the action.
 * @param {string} [target.type] - The type of the target (e.g., 'User').
 * @param {string} [target.id] - The ID of the target document.
 * @param {object} [details={}] - Optional extra details about the action.
 * @param {object} [undoData=null] - Optional data required to reverse the action.
 */
// --- FIX #1: Added 'undoData = null' to the function parameters ---
const logAdminAction = async (admin, action, target = {}, details = {}, undoData = null) => {
  try {
    if (!admin || !admin._id) {
        console.warn('Attempted to log action without a valid admin user.');
        return;
    }

    await AdminActionLog.create({
      adminId: admin._id,
      // --- FIX #2: Construct adminName from firstName and lastName ---
      adminName: `${admin.firstName} ${admin.lastName}`,
      // --- FIX #3: Use the admin.email property ---
      // (Ensure req.admin includes the email field where this is called)
      adminEmail: admin.email, 
      action: action,
      targetType: target.type,
      targetId: target.id,
      details: details,
      // --- FIX #4: Use the correctly passed-in 'undoData' parameter ---
      isUndoable: !!undoData, // isUndoable is true if undoData is not null
      undoData: undoData
    });
  } catch (error) {
    console.error('Failed to create admin action log:', error);
  }
};

module.exports = { logAdminAction };