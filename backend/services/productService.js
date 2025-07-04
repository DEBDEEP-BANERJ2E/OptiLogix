const { getPool } = require('../data/database');

async function getProductByBarcode(barcode) {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM products WHERE barcode = ?', [barcode]);
  if (rows.length > 0) {
    const product = rows[0];
    return {
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      productIdentifier: product.productIdentifier,
      batchNumber: product.batchNumber,
      serialNumber: product.serialNumber,
      dateCodes: product.dateCodes,
      productType: product.productType,
      locationCode: product.locationCode,
      stock: product.stock,
      location: { x: product.location_x, y: product.location_y },
    };
  }
  return null;
}

async function getAllProducts() {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM products');
  return rows.map(product => ({
    barcode: product.barcode,
    name: product.name,
    description: product.description,
    productIdentifier: product.productIdentifier,
    batchNumber: product.batchNumber,
    serialNumber: product.serialNumber,
    dateCodes: product.dateCodes,
    productType: product.productType,
    locationCode: product.locationCode,
    stock: product.stock,
    location: { x: product.location_x, y: product.location_y },
  }));
}

module.exports = {
  getProductByBarcode,
  getAllProducts,
};