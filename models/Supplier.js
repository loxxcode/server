const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a supplier name'],
    unique: true,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  address: {
    type: String,
    trim: true
  },
  totalDebt: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Reverse populate with StockIn records
SupplierSchema.virtual('deliveries', {
  ref: 'StockIn',
  localField: '_id',
  foreignField: 'supplier',
  justOne: false
});

module.exports = mongoose.model('Supplier', SupplierSchema);
