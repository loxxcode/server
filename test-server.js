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

// Basic CORS setup - simplified version of what's in middleware/cors.js
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Middleware configuration
app.use(express.json());
app.use(morgan('dev'));

// Import routes one by one - uncomment ONLY ONE at a time to test
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const productRoutes = require('./routes/product.routes');
app.use('/api/products', productRoutes);

const supplierRoutes = require('./routes/supplier.routes');
app.use('/api/suppliers', supplierRoutes);

const stockInRoutes = require('./routes/stockIn.routes');
app.use('/api/stock-in', stockInRoutes);

const stockOutRoutes = require('./routes/stockOut.routes');
app.use('/api/stock-out', stockOutRoutes);

const reportRoutes = require('./routes/report.routes');
app.use('/api/reports', reportRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// MongoDB Connection (simplified)
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.warn('MongoDB URI not found in environment variables');
      return false;
    }
    
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    return false;
  }
};

// Try to connect to MongoDB but don't block server startup
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
  }
})();

// Port configuration
const PORT = process.env.PORT || 5050; // Using 5050 to avoid conflict with other servers
const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});
