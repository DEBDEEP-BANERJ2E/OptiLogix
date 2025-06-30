const { docks, appointments, truckQueue } = require('../data/inMemoryStore');
const { getPool } = require('../data/database');
const { findAvailableDock, assignTruckToDock } = require('./dockService');
const { updateAppointmentStatus, getAppointmentById } = require('./appointmentService');

const DOCK_HOLD_DURATION_MS = 5 * 1000; // 5 seconds

const autoAssignAndReleaseDocks = async () => {
  const pool = getPool();

  try {
    // Fetch trucks from queue, sorted by arrivalTime
    const [truckQueue] = await pool.execute('SELECT * FROM truck_queue ORDER BY arrivalTime ASC');

    // Attempt to assign trucks from queue to available docks
    for (const truckInLine of truckQueue) {
      const appointment = await getAppointmentById(truckInLine.appointmentId);

      if (appointment && appointment.status === 'arrived') {
        const availableDock = await findAvailableDock(appointment.type);
        if (availableDock) {
          const assigned = await assignTruckToDock(truckInLine.truckId, availableDock.id, appointment.id);
          if (assigned) {
            // Remove from queue
            await pool.execute('DELETE FROM truck_queue WHERE id = ?', [truckInLine.id]);
            console.log(`Automatically assigned Truck ${truckInLine.truckId} to Dock ${availableDock.id} and removed from queue.`);

            // Schedule dock release after DOCK_HOLD_DURATION_MS
            setTimeout(async () => {
              try {
                // Update dock status to available
                await pool.execute(
                  'UPDATE docks SET status = ?, currentTruck = ?, assignedTime = ? WHERE id = ?',
                  ['available', null, null, availableDock.id]
                );
                console.log(`Dock ${availableDock.id} released from Truck ${truckInLine.truckId}`);

                // Update appointment status to completed and then departed
                await updateAppointmentStatus(appointment.id, 'completed');
                console.log(`Appointment ${appointment.id} status set to completed.`);

                await updateAppointmentStatus(appointment.id, 'departed');
                console.log(`Truck ${truckInLine.truckId} departed.`);

                // Update departureTime in recent_assignments table
                await pool.execute(
                  'UPDATE recent_assignments SET departureTime = ? WHERE truckId = ? AND dockId = ? AND appointmentId = ?',
                  [new Date(), truckInLine.truckId, availableDock.id, appointment.id]
                );
              } catch (error) {
                console.error('Error during dock release or status update:', error);
              }
            }, DOCK_HOLD_DURATION_MS);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in autoAssignAndReleaseDocks:', error);
  }
};

async function getDockStatus() {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM docks');
  return rows;
}

async function getTruckQueue() {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM truck_queue ORDER BY arrivalTime ASC');
  return rows;
}

async function getAppointments(truckId) {
  const pool = getPool();
  let query = 'SELECT * FROM appointments';
  const params = [];

  if (truckId) {
    query += ' WHERE truckId = ? ORDER BY scheduledTime DESC';
    params.push(truckId);
  }

  const [rows] = await pool.execute(query, params);
  return rows;
}

async function getRecentAssignments() {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM recent_assignments ORDER BY assignedTime DESC LIMIT 3');
  return rows;
}

module.exports = {
  autoAssignAndReleaseDocks,
  getDockStatus,
  getTruckQueue,
  getAppointments,
  getRecentAssignments
};