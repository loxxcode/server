const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true
  },
  unitPrice: {
    type: Number,
    required: [true, 'Please add a unit price']
  },
  currentStock: {
    type: Number,
    default: 0
  },
  minStockLevel: {
    type: Number,
    default: 10
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function() {
  if (this.currentStock <= 0) {
    return 'Out of Stock';
  } else if (this.currentStock < this.minStockLevel) {
    return 'Low Stock';
  } else {
    return 'In Stock';
  }
});

module.exports = mongoose.model('Product', ProductSchema);
