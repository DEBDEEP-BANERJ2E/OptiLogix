const { getPool } = require('../data/database');

const bookAppointment = async (truckId, supplier, requestedTime, type) => {
  const pool = getPool();
  const newAppointment = {
    truckId,
    supplier,
    dockId: null,
    scheduledTime: new Date(requestedTime),
    status: 'booked',
    actualArrivalTime: null,
    loadingStartTime: null,
    loadingEndTime: null,
    departureTime: null,
    type
  };
  try {
    const [result] = await pool.execute(
      'INSERT INTO appointments (truckId, supplier, dockId, scheduledTime, status, actualArrivalTime, loadingStartTime, loadingEndTime, departureTime, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newAppointment.truckId, newAppointment.supplier, newAppointment.dockId, newAppointment.scheduledTime, newAppointment.status, newAppointment.actualArrivalTime, newAppointment.loadingStartTime, newAppointment.loadingEndTime, newAppointment.departureTime, newAppointment.type]
    );
    newAppointment.id = result.insertId;

    // Add to truck_queue
    await pool.execute(
      'INSERT INTO truck_queue (truckId, arrivalTime, appointmentId) VALUES (?, ?, ?)',
      [newAppointment.truckId, newAppointment.scheduledTime, newAppointment.id]
    );

    return newAppointment;
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw error;
  }
};

const updateAppointmentStatus = async (appointmentId, status) => {
  const pool = getPool();
  try {
    await pool.execute(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [status, appointmentId]
    );
    const [rows] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    return rows[0];
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
};

const getAppointmentByTruckId = async (truckId) => {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM appointments WHERE truckId = ? ORDER BY scheduledTime DESC LIMIT 1', [truckId]);
  return rows[0];
};

const getAppointmentById = async (appointmentId) => {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
  return rows[0];
};

module.exports = {
  bookAppointment,
  updateAppointmentStatus,
  getAppointmentByTruckId,
  getAppointmentById
};