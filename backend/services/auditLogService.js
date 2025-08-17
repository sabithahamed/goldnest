// backend/services/auditLogService.js
const AdminActionLog = require('../models/AdminActionLog');

/**
 * Creates a new log entry for an admin action.
 * @param {object} admin - The admin user object from req.admin.
 * @param {string} action - A description of the action taken.
 * @param {object} [target={}] - Optional information about the target of the action.
 * @param {string} [target.type] - The type of the target (e.g., 'User').
 * @param {string} [target.id] - The ID of the target document.
 * @param {object} [details={}] - Optional extra details about the action.
 */
const logAdminAction = async (admin, action, target = {}, details = {}) => {
  try {
    if (!admin || !admin._id) {
        console.warn('Attempted to log action without a valid admin user.');
        return;
    }
    await AdminActionLog.create({
      adminId: admin._id,
      adminName: admin.name,
      action: action,
      targetType: target.type,
      targetId: target.id,
      details: details,
    });
  } catch (error) {
    console.error('Failed to create admin action log:', error);
  }
};

module.exports = { logAdminAction };