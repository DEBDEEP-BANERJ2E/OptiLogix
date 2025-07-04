const express = require('express');
const router = express.Router();
const productService = require('../services/productService');

router.get('/', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await productService.getProductByBarcode(barcode);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;