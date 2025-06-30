const { getPool } = require('../data/database');
const { updateAppointmentStatus, getAppointmentById } = require('./appointmentService');

const handleTruckArrival = async (truckId, appointmentId) => {
  const pool = getPool();
  const arrivalTime = new Date();
  try {
    await pool.execute(
      'INSERT INTO truck_queue (truckId, arrivalTime, appointmentId) VALUES (?, ?, ?)',
      [truckId, arrivalTime, appointmentId]
    );
    await updateAppointmentStatus(appointmentId, 'arrived');
  } catch (error) {
    console.error('Error handling truck arrival:', error);
    throw error;
  }
};

const handleTruckDeparture = async (truckId, appointmentId) => {
  const pool = getPool();
  try {
    await updateAppointmentStatus(appointmentId, 'departed');
    // Update departureTime in recent_assignments table
    const appointment = await getAppointmentById(appointmentId);
    if (appointment && appointment.dockId) {
      await pool.execute(
        'UPDATE recent_assignments SET departureTime = ? WHERE truckId = ? AND dockId = ? AND appointmentId = ?',
        [new Date(), truckId, appointment.dockId, appointmentId]
      );
    }
  } catch (error) {
    console.error('Error handling truck departure:', error);
    throw error;
  }
};

module.exports = {
  handleTruckArrival,
  handleTruckDeparture
};