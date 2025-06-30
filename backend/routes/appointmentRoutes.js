const express = require('express');
const router = express.Router();
const { bookAppointment, updateAppointmentStatus, getAppointmentById } = require('../services/appointmentService');
const { handleTruckArrival, handleTruckDeparture } = require('../services/truckService');
const { assignTruckToDock } = require('../services/dockService');
const { getPool } = require('../data/database');

// 1. Pre-arrival Scheduling: Supplier books a time slot
router.post('/book', async (req, res) => {
  const { truckId, supplier, requestedTime, type } = req.body;
  try {
    const newAppointment = await bookAppointment(truckId, supplier, requestedTime, type);
    res.status(200).json({ message: 'Appointment booked successfully.', appointment: newAppointment });
  } catch (error) {
    res.status(500).json({ message: 'Error booking appointment.', error: error.message });
  }
});

// 2. Arrival at Facility: Truck arrives and is verified
router.post('/trucks/arrive', async (req, res) => {
  const { truckId, appointmentId } = req.body; // Assuming appointmentId is sent from frontend
  try {
    await handleTruckArrival(truckId, appointmentId);
    const appointment = await getAppointmentById(appointmentId);
    res.status(200).json({ message: 'Truck arrived and added to queue.', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error handling truck arrival.', error: error.message });
  }
});

// 3. Dock Assignment and Queue Management: Dispatcher assigns or truck is called from queue
router.post('/dispatcher/assign', async (req, res) => {
  const { truckId, dockId, appointmentId } = req.body;
  try {
    const appointment = await getAppointmentById(appointmentId);
    if (!appointment || appointment.status !== 'arrived') {
      return res.status(404).json({ message: 'Appointment not found or truck not in arrived status.' });
    }

    const pool = getPool();
    const [docks] = await pool.execute('SELECT * FROM docks WHERE id = ?', [dockId]);
    const dock = docks[0];

    if (dock && dock.status === 'available') {
      const assigned = await assignTruckToDock(truckId, dockId, appointment.id);
      if (assigned) {
        // Remove from queue if it was there
        await pool.execute('DELETE FROM truck_queue WHERE truckId = ? AND appointmentId = ?', [truckId, appointment.id]);
        res.status(200).json({ message: `Truck ${truckId} assigned to Dock ${dockId}`, appointment });
      } else {
        res.status(500).json({ message: 'Failed to assign truck to dock.' });
      }
    } else if (dock && dock.status === 'occupied') {
      res.status(400).json({ message: `Dock ${dockId} is currently occupied.` });
    } else {
      res.status(404).json({ message: 'Dock not found.' });
    }
  } catch (error) {
    console.error('Error assigning truck:', error);
    res.status(500).json({ message: 'Error assigning truck.', error: error.message });
  }
});

// 4. Loading/Unloading: Update status
router.post('/update-status', async (req, res) => {
  const { appointmentId, status } = req.body;
  try {
    const appointment = await updateAppointmentStatus(appointmentId, status);
    if (appointment) {
      res.status(200).json({ message: `Appointment ${appointmentId} status updated to ${status}`, appointment });
    } else {
      res.status(404).json({ message: 'Appointment not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating appointment status.', error: error.message });
  }
});

// 5. Departure: Truck departs
router.post('/trucks/depart', async (req, res) => {
  const { truckId, appointmentId } = req.body;
  try {
    const appointment = await getAppointmentById(appointmentId);
    if (!appointment || appointment.status !== 'completed') {
      return res.status(404).json({ message: 'Truck not found or not in completed status.' });
    }
    await handleTruckDeparture(truckId, appointmentId);
    res.status(200).json({ message: `Truck ${truckId} departed.`, appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error handling truck departure.', error: error.message });
  }
});

module.exports = router;