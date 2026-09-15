// Product catalog API routes

const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService');

// GET /api/products - List products with optional search, category, and price filters
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, inStock } = req.query;
    const items = await inventoryService.getProducts({
      search,
      category,
      minPrice,
      maxPrice,
      inStock
    });
    res.json({
      success: true,
      count: items.length,
      products: items
    });
  } catch (err) {
    console.error('[Products] Error fetching products:', err.message);
    res.status(500).json({ success: false, error: 'Could not load products.' });
  }
});

// GET /api/products/:id - Single product details
router.get('/:id', async (req, res) => {
  try {
    const product = await inventoryService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error('[Products] Error fetching product details:', err.message);
    res.status(500).json({ success: false, error: 'Could not load product details.' });
  }
});

module.exports = router;
