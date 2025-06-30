const express = require('express');
const router = express.Router();
const { getDriverAssignment } = require('../services/driverService');

router.get('/:truckId/assignment', async (req, res) => {
  const { truckId } = req.params;
  try {
    const assignment = await getDriverAssignment(truckId);
    if (assignment) {
      res.status(200).json(assignment);
    } else {
      res.status(404).json({ message: 'No assignment found for this truck.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver assignment.', error: error.message });
  }
});

module.exports = router;