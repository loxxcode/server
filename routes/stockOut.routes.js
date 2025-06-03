const express = require('express');
const {
  createStockOut,
  getStockOuts,
  getStockOut,
  updateStockOut,
  deleteStockOut,
  getTodaySales
} = require('../controllers/stockOut.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getStockOuts)
  .post(createStockOut);

router.route('/today')
  .get(getTodaySales);

router.route('/:id')
  .get(getStockOut)
  .put(updateStockOut)
  .delete(deleteStockOut);

module.exports = router;
