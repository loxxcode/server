const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Basic CORS setup
app.use(cors());

// Middleware configuration
app.use(express.json());
app.use(morgan('dev'));

// Import only one route file at a time for debugging
// Uncomment only ONE of these at a time to test which file causes the error
// const authRoutes = require('./routes/auth.routes');
// const productRoutes = require('./routes/product.routes');
// const supplierRoutes = require('./routes/supplier.routes');
// const stockInRoutes = require('./routes/stockIn.routes');
// const stockOutRoutes = require('./routes/stockOut.routes');
// const reportRoutes = require('./routes/report.routes');

// Register only one route file at a time
// app.use('/api/auth', authRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/suppliers', supplierRoutes);
// app.use('/api/stock-in', stockInRoutes);
// app.use('/api/stock-out', stockOutRoutes);
// app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});
