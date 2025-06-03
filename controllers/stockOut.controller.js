const StockOut = require('../models/StockOut');
const Product = require('../models/Product');

// @desc    Create new stock out record (sale)
// @route   POST /api/stock-out
// @access  Private/Admin
exports.createStockOut = async (req, res) => {
  try {
    // Add user to request body
    req.body.createdBy = req.user.id;
    
    // Calculate total amount if not provided
    if (!req.body.totalAmount && req.body.quantity && req.body.salePrice) {
      req.body.totalAmount = req.body.quantity * req.body.salePrice;
    }

    // Check if there's enough stock
    const product = await Product.findById(req.body.product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.currentStock < req.body.quantity) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock. Available: ${product.currentStock}, Requested: ${req.body.quantity}`
      });
    }

    const stockOut = await StockOut.create(req.body);
    
    // Populate related fields
    const populatedStockOut = await StockOut.findById(stockOut._id)
      .populate('product', 'name category unitPrice')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      data: populatedStockOut
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all stock out records (sales)
// @route   GET /api/stock-out
// @access  Private/Admin
exports.getStockOuts = async (req, res) => {
  try {
    let query = StockOut.find()
      .populate('product', 'name category unitPrice')
      .populate('createdBy', 'name')
      .sort({ saleDate: -1 });
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      query = query.where('saleDate').gte(startDate).lte(endDate);
    }
    
    // Filter by product if provided
    if (req.query.product) {
      query = query.where('product').equals(req.query.product);
    }
    
    // Filter by customer if provided
    if (req.query.customer) {
      query = query.where('customer').equals(req.query.customer);
    }
    
    const stockOuts = await query;

    res.status(200).json({
      success: true,
      count: stockOuts.length,
      data: stockOuts
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single stock out record
// @route   GET /api/stock-out/:id
// @access  Private/Admin
exports.getStockOut = async (req, res) => {
  try {
    const stockOut = await StockOut.findById(req.params.id)
      .populate('product', 'name category unitPrice')
      .populate('createdBy', 'name');

    if (!stockOut) {
      return res.status(404).json({
        success: false,
        message: `No sale record found with id ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: stockOut
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update stock out record
// @route   PUT /api/stock-out/:id
// @access  Private/Admin
exports.updateStockOut = async (req, res) => {
  try {
    let stockOut = await StockOut.findById(req.params.id);

    if (!stockOut) {
      return res.status(404).json({
        success: false,
        message: `No sale record found with id ${req.params.id}`
      });
    }

    // Don't allow updating product or quantity directly - it affects inventory
    if (req.body.product || req.body.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update product or quantity directly. Create a new record instead.'
      });
    }

    // Update the record
    stockOut = await StockOut.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('product', 'name category unitPrice')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      data: stockOut
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete stock out record
// @route   DELETE /api/stock-out/:id
// @access  Private/Admin
exports.deleteStockOut = async (req, res) => {
  try {
    const stockOut = await StockOut.findById(req.params.id);

    if (!stockOut) {
      return res.status(404).json({
        success: false,
        message: `No sale record found with id ${req.params.id}`
      });
    }

    // Update product stock (add quantity back)
    await Product.findByIdAndUpdate(stockOut.product, {
      $inc: { currentStock: stockOut.quantity }
    });

    // Use findByIdAndDelete instead of the deprecated remove() method
    await StockOut.findByIdAndDelete(req.params.id);

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

// @desc    Get today's sales
// @route   GET /api/stock-out/today
// @access  Private/Admin
exports.getTodaySales = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await StockOut.find({
      saleDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
      .populate('product', 'name category unitPrice')
      .populate('createdBy', 'name')
      .sort({ saleDate: -1 });

    // Calculate total revenue
    const totalRevenue = sales.reduce(
      (acc, sale) => acc + sale.totalAmount,
      0
    );

    res.status(200).json({
      success: true,
      count: sales.length,
      totalRevenue,
      data: sales
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
