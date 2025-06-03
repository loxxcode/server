const express = require('express');
const {
  getSalesReport,
  getStockStatusReport,
  getSupplierDeliveriesReport,
  getProfitReport,
  getOutstandingDebtsReport,
  getProductSalesReport
} = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(authorize('admin'));

router.route('/sales')
  .get(async (req, res, next) => {
    try {
      // Validate query parameters
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: startDate and endDate are required',
          received: { startDate, endDate }
        });
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD format',
          example: '?startDate=2025-05-01&endDate=2025-05-31'
        });
      }
      
      // Ensure start date is before end date
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range: startDate must be before or equal to endDate',
          startDate,
          endDate
        });
      }
      
      // Call the controller
      return await getSalesReport(req, res, next);
    } catch (error) {
      console.error('Error in sales report route:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while processing sales report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

router.route('/stock-status')
  .get(getStockStatusReport);

router.route('/supplier-deliveries')
  .get(getSupplierDeliveriesReport);

router.route('/profit')
  .get(getProfitReport);

router.route('/outstanding-debts')
  .get(getOutstandingDebtsReport);

router.route('/product-sales')
  .get(getProductSalesReport);

module.exports = router;
