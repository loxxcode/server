const StockIn = require('../models/StockIn');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

// @desc    Create new stock in record
// @route   POST /api/stock-in
// @access  Private/Admin
exports.createStockIn = async (req, res) => {
  try {
    // Add user to request body
    req.body.createdBy = req.user.id;
    
    // Calculate total amount if not provided
    if (!req.body.totalAmount && req.body.quantity && req.body.unitPrice) {
      req.body.totalAmount = req.body.quantity * req.body.unitPrice;
    }
    
    // Set remaining debt based on payment status
    if (req.body.paymentStatus === 'Paid') {
      req.body.amountPaid = req.body.totalAmount;
      req.body.remainingDebt = 0;
    } else if (req.body.paymentStatus === 'Partial') {
      if (!req.body.amountPaid) {
        return res.status(400).json({
          success: false,
          message: 'Amount paid must be provided for partial payment'
        });
      }
      req.body.remainingDebt = req.body.totalAmount - req.body.amountPaid;
    } else {
      // Unpaid
      req.body.amountPaid = 0;
      req.body.remainingDebt = req.body.totalAmount;
    }

    const stockIn = await StockIn.create(req.body);
    
    // Update supplier's total debt
    await Supplier.findByIdAndUpdate(req.body.supplier, {
      $inc: { totalDebt: req.body.remainingDebt }
    });

    // Populate related fields
    const populatedStockIn = await StockIn.findById(stockIn._id)
      .populate('product', 'name category unitPrice')
      .populate('supplier', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      data: populatedStockIn
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all stock in records
// @route   GET /api/stock-in
// @access  Private/Admin
exports.getStockIns = async (req, res) => {
  try {
    let query = StockIn.find()
      .populate('product', 'name category unitPrice')
      .populate('supplier', 'name')
      .populate('createdBy', 'name')
      .sort({ deliveryDate: -1 });
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      query = query.where('deliveryDate').gte(startDate).lte(endDate);
    }
    
    // Filter by supplier if provided
    if (req.query.supplier) {
      query = query.where('supplier').equals(req.query.supplier);
    }
    
    // Filter by product if provided
    if (req.query.product) {
      query = query.where('product').equals(req.query.product);
    }
    
    // Filter by payment status if provided
    if (req.query.paymentStatus) {
      query = query.where('paymentStatus').equals(req.query.paymentStatus);
    }
    
    const stockIns = await query;

    res.status(200).json({
      success: true,
      count: stockIns.length,
      data: stockIns
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single stock in record
// @route   GET /api/stock-in/:id
// @access  Private/Admin
exports.getStockIn = async (req, res) => {
  try {
    const stockIn = await StockIn.findById(req.params.id)
      .populate('product', 'name category unitPrice')
      .populate('supplier', 'name')
      .populate('createdBy', 'name');

    if (!stockIn) {
      return res.status(404).json({
        success: false,
        message: `No stock in record found with id ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: stockIn
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update stock in record
// @route   PUT /api/stock-in/:id
// @access  Private/Admin
exports.updateStockIn = async (req, res) => {
  try {
    let stockIn = await StockIn.findById(req.params.id);

    if (!stockIn) {
      return res.status(404).json({
        success: false,
        message: `No stock in record found with id ${req.params.id}`
      });
    }

    // Don't allow updating product or quantity directly - it affects inventory
    if (req.body.product || req.body.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update product or quantity directly. Create a new record instead.'
      });
    }

    // Handle payment updates
    if (req.body.paymentStatus || req.body.amountPaid) {
      // Get original debt amount
      const originalDebt = stockIn.remainingDebt;
      
      if (req.body.paymentStatus === 'Paid') {
        req.body.amountPaid = stockIn.totalAmount;
        req.body.remainingDebt = 0;
      } else if (req.body.paymentStatus === 'Partial') {
        if (!req.body.amountPaid) {
          req.body.amountPaid = stockIn.amountPaid; // Keep existing amount
        }
        req.body.remainingDebt = stockIn.totalAmount - req.body.amountPaid;
      }
      
      // Calculate debt change
      const newDebt = req.body.remainingDebt || stockIn.remainingDebt;
      const debtChange = newDebt - originalDebt;
      
      // Update supplier's total debt
      await Supplier.findByIdAndUpdate(stockIn.supplier, {
        $inc: { totalDebt: debtChange }
      });
    }

    // Update the record
    stockIn = await StockIn.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('product', 'name category unitPrice')
      .populate('supplier', 'name')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      data: stockIn
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete stock in record
// @route   DELETE /api/stock-in/:id
// @access  Private/Admin
exports.deleteStockIn = async (req, res) => {
  try {
    const stockIn = await StockIn.findById(req.params.id);

    if (!stockIn) {
      return res.status(404).json({
        success: false,
        message: `No stock in record found with id ${req.params.id}`
      });
    }

    // Update product stock (subtract quantity)
    await Product.findByIdAndUpdate(stockIn.product, {
      $inc: { currentStock: -stockIn.quantity }
    });
    
    // Update supplier debt
    await Supplier.findByIdAndUpdate(stockIn.supplier, {
      $inc: { totalDebt: -stockIn.remainingDebt }
    });

    await stockIn.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
