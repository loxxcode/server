const Supplier = require('../models/Supplier');
const StockIn = require('../models/StockIn');

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Private/Admin
exports.createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address } = req.body;
    
    // Check if name is provided
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a supplier name'
      });
    }

    // Check if supplier with same name exists
    const existingSupplier = await Supplier.findOne({ name });
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'A supplier with this name already exists'
      });
    }

    const supplier = await Supplier.create({
      name,
      contactPerson,
      phone,
      email,
      address
    });

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private/Admin
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find();

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private/Admin
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).populate('deliveries');

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: `No supplier found with id ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
exports.updateSupplier = async (req, res) => {
  try {
    let supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: `No supplier found with id ${req.params.id}`
      });
    }

    supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: `No supplier found with id ${req.params.id}`
      });
    }

    // Check if supplier has associated stock in records
    const stockInCount = await StockIn.countDocuments({ supplier: req.params.id });
    
    if (stockInCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier with associated delivery records. Please delete those records first or update them.`
      });
    }

    // Use findByIdAndDelete instead of the deprecated remove() method
    await Supplier.findByIdAndDelete(req.params.id);

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

// @desc    Get suppliers with debt
// @route   GET /api/suppliers/with-debt
// @access  Private/Admin
exports.getSuppliersWithDebt = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ totalDebt: { $gt: 0 } });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
