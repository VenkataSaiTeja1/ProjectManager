const { query } = require('../config/database');
const { asyncHandler, paginatedResponse } = require('../utils/helpers');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, user_id, entity, action, start_date, end_date } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (user_id) { conditions.push(`a.user_id = $${idx++}`); params.push(user_id); }
  if (entity) { conditions.push(`a.entity = $${idx++}`); params.push(entity); }
  if (action) { conditions.push(`a.action ILIKE $${idx++}`); params.push(`%${action}%`); }
  if (start_date) { conditions.push(`a.created_at >= $${idx++}`); params.push(start_date); }
  if (end_date) { conditions.push(`a.created_at <= $${idx++}`); params.push(`${end_date} 23:59:59`); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM audit_log a ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await query(
    `SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role
     FROM audit_log a
     LEFT JOIN users u ON a.user_id = u.id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

module.exports = { getAll };
