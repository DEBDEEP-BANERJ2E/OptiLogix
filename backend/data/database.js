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

    // Create products table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        barcode VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        productIdentifier VARCHAR(255),
        batchNumber VARCHAR(255),
        serialNumber VARCHAR(255),
        dateCodes VARCHAR(255),
        productType VARCHAR(255),
        locationCode VARCHAR(255),
        stock INT NOT NULL,
        location_x INT NOT NULL,
        location_y INT NOT NULL
      )
    `);
    console.log('`products` table checked/created successfully.');

    // Clear existing product data and insert initial data
    await pool.execute('DELETE FROM products');
    console.log('Existing product data cleared.');

    // Insert initial product data
    // No longer checking if table is empty, as we just cleared it.
      const initialProducts = [
        { barcode: 'ABC-123', name: 'Widget A', stock: 50, location_x: 6, location_y: 2, description: 'A versatile widget for general use.', productIdentifier: 'WIDGET-A-001', batchNumber: 'WA-B-2023-01', serialNumber: 'WA-SN-0001', dateCodes: '2023-01-15', productType: 'Electronics', locationCode: 'A4S-B3' },
        { barcode: 'DEF-456', name: 'Gadget B', stock: 30, location_x: 1, location_y: 5, description: 'A compact and portable gadget.', productIdentifier: 'GADGET-B-002', batchNumber: 'GB-B-2023-02', serialNumber: 'GB-SN-0002', dateCodes: '2023-02-20', productType: 'Tools', locationCode: 'B2R-C1' },
        { barcode: 'GHI-789', name: 'Thing C', stock: 75, location_x: 4, location_y: 7, description: 'An essential item for daily tasks.', productIdentifier: 'THING-C-003', batchNumber: 'TC-B-2023-03', serialNumber: 'TC-SN-0003', dateCodes: '2023-03-10', productType: 'Household', locationCode: 'C1L-D5' },
        { barcode: 'SKU12345', name: 'Example Product SKU', stock: 100, location_x: 3, location_y: 3, description: 'A sample product with SKU for testing.', productIdentifier: '8901234567890', batchNumber: 'BATCH2025A', serialNumber: 'SN2025070003', dateCodes: '2025-07-01', productType: 'ELC-TV-LG-42IN', locationCode: 'A4S-B3' },
        { barcode: '8901234567890', name: 'Example Product GTIN', stock: 200, location_x: 5, location_y: 1, description: 'Another sample product with GTIN for testing.', productIdentifier: '8901234567890', batchNumber: 'BATCH2025B', serialNumber: 'SN2025070004', dateCodes: '2025-07-02', productType: 'FOD-SNK-CHIP-POT', locationCode: 'B2R-C1' },
      ];

      for (const product of initialProducts) {
        await pool.execute(
          'INSERT INTO products (barcode, name, description, productIdentifier, batchNumber, serialNumber, dateCodes, productType, locationCode, stock, location_x, location_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            product.barcode,
            product.name,
            product.description,
            product.productIdentifier,
            product.batchNumber,
            product.serialNumber,
            product.dateCodes,
            product.productType,
            product.locationCode,
            product.stock,
            product.location_x,
            product.location_y,
          ]
        );
      }
      console.log('Initial product data inserted.');

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