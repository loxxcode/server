// Simple entry point to help debug Railway deployment issues
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// MongoDB Connection function
const connectDB = async () => {
  try {
    // Check for MongoDB URI in different environment variable names
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI || process.env.DATABASE_URL;
    
    if (!mongoUri) {
      console.error('⚠️ WARNING: MongoDB Atlas connection string is not defined in environment variables');
      return false;
    }
    
    // Attempt to connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });
    
    console.log('✅ MongoDB Atlas connected successfully');
    console.log(`📊 Using database: ${mongoose.connection.db.databaseName}`);
    return true;
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Full error details:', error);
    return false;
  }
};

// Attempt database connection on startup
let dbConnected = false;
(async () => {
  dbConnected = await connectDB();
})();

// Basic health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  let dbStatusText;
  
  switch(dbStatus) {
    case 0: dbStatusText = 'disconnected'; break;
    case 1: dbStatusText = 'connected'; break;
    case 2: dbStatusText = 'connecting'; break;
    case 3: dbStatusText = 'disconnecting'; break;
    default: dbStatusText = 'unknown';
  }
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatusText,
      readyState: dbStatus,
      connected: dbStatus === 1
    },
    variables: {
      // Mask sensitive values but show if they exist
      MONGO_URI: process.env.MONGO_URI ? '****[EXISTS]****' : 'NOT SET',
      MONGODB_URI: process.env.MONGODB_URI ? '****[EXISTS]****' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? '****[EXISTS]****' : 'NOT SET',
      PORT: process.env.PORT || '8080 (default)'
    }
  });
});

// Basic API endpoint with CORS headers
app.get('/api/test', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.status(200).json({ 
    message: 'API is working!',
    cors: 'Enabled with wildcard origin (*)'
  });
});

// Specific database test endpoint
app.get('/api/db-test', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  
  try {
    // Check MongoDB connection status
    const dbStatus = mongoose.connection.readyState;
    let dbStatusText;
    
    switch(dbStatus) {
      case 0: dbStatusText = 'disconnected'; break;
      case 1: dbStatusText = 'connected'; break;
      case 2: dbStatusText = 'connecting'; break;
      case 3: dbStatusText = 'disconnecting'; break;
      default: dbStatusText = 'unknown';
    }
    
    // If not connected, try to connect now
    let connectionTest = null;
    if (dbStatus !== 1) {
      connectionTest = await connectDB();
    }
    
    // Check connection string
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI || process.env.DATABASE_URL;
    
    // Get list of available collections if connected
    let collections = [];
    if (dbStatus === 1) {
      try {
        collections = await mongoose.connection.db.listCollections().toArray();
        collections = collections.map(col => col.name);
      } catch (err) {
        console.error('Error listing collections:', err);
      }
    }
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatusText,
        readyState: dbStatus,
        connected: dbStatus === 1,
        connectionString: mongoUri ? `${mongoUri.substring(0, 20)}...` : 'NOT SET',
        connectionTest: connectionTest !== null ? (connectionTest ? 'success' : 'failed') : 'not attempted',
        collections: collections
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
    });
  }
});

// Return 200 for OPTIONS preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.status(200).send();
});

// Port configuration
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Simple diagnostic server running on port ${PORT}`);
  console.log('Environment variables status:');
  console.log(`- MONGO_URI: ${process.env.MONGO_URI ? 'SET' : 'NOT SET'}`);
  console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
  console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`- PORT: ${process.env.PORT || '5000 (default)'}`);
});
