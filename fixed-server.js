const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// IMPORTANT: Apply CORS middleware before any other middleware or routes
const applyCorsMw = require('./middleware/cors');
applyCorsMw(app);

// Middleware configuration
app.use(express.json());
app.use(morgan('dev'));

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const supplierRoutes = require('./routes/supplier.routes');
const stockInRoutes = require('./routes/stockIn.routes');
const stockOutRoutes = require('./routes/stockOut.routes');
const reportRoutes = require('./routes/report.routes');

// Routes middleware - API routes come before static file handling
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stock-in', stockInRoutes);
app.use('/api/stock-out', stockOutRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbStatus,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    // Check for MongoDB URI in different environment variable names
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI || process.env.DATABASE_URL;
    
    if (!mongoUri) {
      console.error('⚠️ WARNING: MongoDB Atlas connection string is not defined in environment variables');
      console.error('The server will continue running but database functionality will not work');
      return false;
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log('✅ MongoDB Atlas connected successfully');
    console.log(`📊 Using database: ${mongoose.connection.db.databaseName}`);
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\nPlease make sure:');
    console.log('1. Your internet connection is stable');
    console.log('2. Your IP is whitelisted in MongoDB Atlas');
    console.log('3. Your MongoDB Atlas credentials in environment variables are correct');
    console.log('4. The database name in the connection string is correct');
    console.error('Full error details:', error);
    return false;
  }
};

// Execute the database connection, but don't block server startup
(async () => {
  try {
    const success = await connectDB();
    if (!success) {
      console.warn('⚠️ Server started without database connection. Some functionality will be limited.');
    }
  } catch (err) {
    console.error('Failed to connect to database, but server will continue running:', err.message);
  }
})();

// Static file serving - AFTER API routes to avoid conflicts
// For production, serve from build folder
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Client-side routing support - this comes AFTER all API routes
  app.get('/*', (req, res) => {
    // Important: Use '/*' instead of '*' to be explicit about the pattern
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
} else {
  // For development, serve static files from client/public
  app.use('/assets', express.static(path.join(__dirname, '../client/public/assets')));
}

// Port configuration
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check for MongoDB URI variables
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI || process.env.DATABASE_URL;
  console.log(`MongoDB URI: ${mongoUri ? '****' + mongoUri.slice(-10) : 'NOT SET'}`);
});

// Error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});
