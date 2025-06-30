const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// User Registration
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });
    res.status(201).send({ uid: userRecord.uid, message: 'User registered successfully' });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    res.status(401).send({ message: 'Password verification must be done client-side. User exists.' });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

module.exports = router;