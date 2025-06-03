const mongoose = require('mongoose');

const StockInSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Please select a product']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Please select a supplier']
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Please add a unit price']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please add total amount']
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Unpaid'],
    default: 'Unpaid'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  remainingDebt: {
    type: Number,
    default: function() {
      return this.totalAmount;
    }
  },
  deliveryDate: {
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

// Update product stock when stock is added
StockInSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Product = this.model('Product');
    await Product.findByIdAndUpdate(this.product, {
      $inc: { currentStock: this.quantity }
    });
  }
  next();
});

module.exports = mongoose.model('StockIn', StockInSchema);
