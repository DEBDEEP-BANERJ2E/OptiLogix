const { getPool } = require('../data/database');
const { findAvailableDock, getAllAvailableDocks, assignTruckToDock } = require('./dockService');
const { updateAppointmentStatus, getAppointmentById } = require('./appointmentService');

const DOCK_HOLD_DURATION_MS = 15 * 1000; // 10 seconds

const autoAssignAndReleaseDocks = async () => {
  const pool = getPool();

  try {
    // Fetch trucks from queue, sorted by arrivalTime
    const [truckQueue] = await pool.execute('SELECT * FROM truck_queue ORDER BY arrivalTime ASC');
    console.log('Truck Queue:', truckQueue);

    // Attempt to assign trucks from queue to available docks randomly
    if (truckQueue.length > 0) {
      const availableDocks = await getAllAvailableDocks();
      console.log('Available Docks:', availableDocks);

      if (availableDocks.length > 0) {
        // Randomly select one truck from the queue
        const randomTruckIndex = Math.floor(Math.random() * truckQueue.length);
        const truckInLine = truckQueue[randomTruckIndex];
        console.log('Selected Truck:', truckInLine);

        // Randomly select one available dock
        const randomDockIndex = Math.floor(Math.random() * availableDocks.length);
        const availableDock = availableDocks[randomDockIndex];
        console.log('Selected Dock:', availableDock);

        const appointment = await getAppointmentById(truckInLine.appointmentId);
        console.log('Appointment for selected truck:', appointment);

        if (appointment && (appointment.status === 'arrived' || appointment.status === 'booked')) {
          console.log('Appointment status is arrived, proceeding with assignment.');
          try {
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
            } else {
              console.log(`Failed to assign Truck ${truckInLine.truckId} to Dock ${availableDock.id}.`);
            }
          } catch (error) {
            console.error('Error during truck assignment:', error);
          }
        } else {
          console.log('Appointment status is NOT arrived or booked, or appointment not found. Status:', appointment ? appointment.status : 'Not Found');
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