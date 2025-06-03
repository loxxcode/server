const express = require('express');
const {
  createStockIn,
  getStockIns,
  getStockIn,
  updateStockIn,
  deleteStockIn
} = require('../controllers/stockIn.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getStockIns)
  .post(createStockIn);

router.route('/:id')
  .get(getStockIn)
  .put(updateStockIn)
  .delete(deleteStockIn);

module.exports = router;
