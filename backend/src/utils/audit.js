const { query } = require('../config/database');

const logAudit = async (userId, action, entity, entityId, details = null) => {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entity, entityId, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { logAudit };
