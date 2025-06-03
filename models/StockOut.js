const mongoose = require('mongoose');

const StockOutSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Please select a product']
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  salePrice: {
    type: Number,
    required: [true, 'Please add a sale price']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please add total amount']
  },
  customer: {
    type: String,
    trim: true
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Update product stock when stock is sold
StockOutSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Product = this.model('Product');
    await Product.findByIdAndUpdate(this.product, {
      $inc: { currentStock: -this.quantity }
    });
  }
  next();
});

module.exports = mongoose.model('StockOut', StockOutSchema);
