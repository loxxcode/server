const express = require('express');
const {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  getSuppliersWithDebt
} = require('../controllers/supplier.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getSuppliers)
  .post(createSupplier);

router.route('/with-debt')
  .get(getSuppliersWithDebt);

router.route('/:id')
  .get(getSupplier)
  .put(updateSupplier)
  .delete(deleteSupplier);

module.exports = router;
