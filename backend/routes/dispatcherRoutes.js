const express = require('express');
const router = express.Router();
const { getDockStatus, getTruckQueue, getAppointments, getRecentAssignments } = require('../services/dispatcherService');
const { assignTruckToDock } = require('../services/dockService');

router.get('/dock-status', async (req, res) => {
  try {
    const status = await getDockStatus();
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dock status.', error: error.message });
  }
});

router.get('/truck-queue', async (req, res) => {
  try {
    const queue = await getTruckQueue();
    res.status(200).json(queue);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching truck queue.', error: error.message });
  }
});

router.get('/appointments', async (req, res) => {
  const { truckId } = req.query;
  try {
    const allAppointments = await getAppointments(truckId);
    res.status(200).json(allAppointments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments.', error: error.message });
  }
});

router.get('/recent-assignments', async (req, res) => {
  try {
    const assignments = await getRecentAssignments();
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent assignments.', error: error.message });
  }
});

router.post('/assign', async (req, res) => {
  const { truckId, dockId, appointmentId } = req.body;
  try {
    const success = await assignTruckToDock(truckId, dockId, appointmentId);
    if (success) {
      res.status(200).json({ message: 'Truck assigned to dock successfully.' });
    } else {
      res.status(400).json({ message: 'Failed to assign truck to dock.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error assigning truck to dock.', error: error.message });
  }
});

module.exports = router;