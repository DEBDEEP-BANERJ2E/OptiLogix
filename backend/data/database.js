const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, // REMOVE DEFAULT IN PRODUCTION
  database: process.env.DB_DATABASE || 'optilogix_db'
};

let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('MySQL connection pool created.');

    // Test connection
    await pool.getConnection();
    console.log('Successfully connected to MySQL database.');

    // Create recent_assignments table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS recent_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        truckId VARCHAR(255) NOT NULL,
        dockId INT NOT NULL,
        assignedTime DATETIME NOT NULL,
        departureTime DATETIME,
        appointmentId INT NOT NULL
      )
    `);
    console.log('`recent_assignments` table checked/created successfully.');

    // Create truck_queue table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS truck_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        truckId VARCHAR(255) NOT NULL,
        arrivalTime DATETIME NOT NULL,
        appointmentId INT NOT NULL
      )
    `);
    console.log('`truck_queue` table checked/created successfully.');

    // Create appointments table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        truckId VARCHAR(255) NOT NULL,
        supplier VARCHAR(255) NOT NULL,
        dockId INT,
        scheduledTime DATETIME NOT NULL,
        status VARCHAR(50) NOT NULL,
        actualArrivalTime DATETIME,
        loadingStartTime DATETIME,
        loadingEndTime DATETIME,
        departureTime DATETIME,
        type VARCHAR(50) NOT NULL
      )
    `);
    console.log('`appointments` table checked/created successfully.');

    // Create docks table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS docks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        status VARCHAR(50) NOT NULL,
        currentTruck VARCHAR(255),
        assignedTime DATETIME,
        type VARCHAR(50) NOT NULL
      )
    `);
    console.log('`docks` table checked/created successfully.');

    // Insert initial dock data if table is empty

    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM docks');
    if (rows[0].count < 5) {
      console.log('Docks table has less than 4 docks. Inserting missing docks.');
      // Insert initial dock data if table has less than 4 docks
      // This assumes we always want at least 4 docks, two loading and two unloading
      const existingDocks = await pool.execute('SELECT type FROM docks');
      const existingLoadingDocks = existingDocks[0].filter(dock => dock.type === 'loading').length;
      const existingUnloadingDocks = existingDocks[0].filter(dock => dock.type === 'unloading').length;
      const existingPriorityDocks = existingDocks[0].filter(dock => dock.type === 'priority').length;

      if (existingLoadingDocks < 2) {
        for (let i = 0; i < (2 - existingLoadingDocks); i++) {
          await pool.execute(
            'INSERT INTO docks (status, currentTruck, assignedTime, type) VALUES (?, ?, ?, ?)',
            ['available', null, null, 'loading']
          );
        }
      }
      if (existingUnloadingDocks < 2) {
        for (let i = 0; i < (2 - existingUnloadingDocks); i++) {
          await pool.execute(
            'INSERT INTO docks (status, currentTruck, assignedTime, type) VALUES (?, ?, ?, ?)',
            ['available', null, null, 'unloading']
          );
        }
      }
      if (existingPriorityDocks < 1) {
        await pool.execute(
          'INSERT INTO docks (status, currentTruck, assignedTime, type) VALUES (?, ?, ?, ?)',
          ['available', null, null, 'priority']
        );
      }
      console.log('Initial dock data inserted.');
    }


  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase first.');
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool
};