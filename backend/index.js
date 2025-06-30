const admin = require('firebase-admin');

require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const dispatcherRoutes = require('./routes/dispatcherRoutes');
const driverRoutes = require('./routes/driverRoutes');

// Import services
const serviceAccount = require('./serviceAccountKey.json');
const { initializeDatabase } = require('./data/database');
const { autoAssignAndReleaseDocks } = require('./services/dispatcherService');

const app = express();
app.use(cors());
app.use(express.json());

// Use routes
app.use('/', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dispatcher', dispatcherRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api', appointmentRoutes); // For /api/trucks/arrive and /api/assignments/update-status

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1); // Exit if Firebase initialization fails
}

async function startServer() {
  await initializeDatabase();

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1); // Exit if server fails to start
  });
}

startServer();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // Exit on unhandled promise rejections
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1); // Exit on uncaught exceptions
});

// Run the auto-assignment and release logic every second
setInterval(autoAssignAndReleaseDocks, 1000); // Every 1 second