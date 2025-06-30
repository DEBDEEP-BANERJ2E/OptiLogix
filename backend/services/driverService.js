const { getPool } = require('../data/database');

async function getDriverAssignment(truckId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT * FROM appointments WHERE truckId = ? AND (status = 'arrived' OR status = 'loading/unloading')`,
    [truckId]
  );
  return rows[0] || null;
}

module.exports = {
  getDriverAssignment
};