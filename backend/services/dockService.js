const { getPool } = require('../data/database');

const findAvailableDock = async (type) => {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM docks WHERE status = ? AND type = ? LIMIT 1', ['available', type]);
  return rows[0];
};



const releaseDock = async (dockId) => {
  const pool = getPool();
  try {
    await pool.execute(
      'UPDATE docks SET status = ?, currentTruck = ?, assignedTime = ? WHERE id = ?',
      ['available', null, null, dockId]
    );
    console.log(`Dock ${dockId} released.`);
  } catch (error) {
    console.error('Error releasing dock:', error);
  }
};

const assignTruckToDock = async (truckId, dockId, appointmentId) => {
  const pool = getPool();
  const now = new Date();
  try {
    await pool.execute(
      'UPDATE docks SET status = ?, currentTruck = ?, assignedTime = ? WHERE id = ?',
      ['occupied', truckId, now, dockId]
    );
    // Add to recent_assignments table
    await pool.execute(
      'INSERT INTO recent_assignments (truckId, dockId, assignedTime, appointmentId) VALUES (?, ?, ?, ?)',
      [truckId, dockId, now, appointmentId]
    );

    // Remove truck from truck_queue
    await pool.execute('DELETE FROM truck_queue WHERE truckId = ?', [truckId]);

    // Schedule dock to be released after 10 seconds
    setTimeout(() => releaseDock(dockId), 10000); // 10 seconds

    return true;
  } catch (error) {
    console.error('Error assigning truck to dock:', error);
    return false;
  }
};

module.exports = {
  findAvailableDock,
  assignTruckToDock,
  releaseDock
};