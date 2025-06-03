// CORS middleware to ensure proper cross-origin requests
const cors = require('cors');

// List of allowed origins
const allowedOrigins = [
  'https://icyizere-v2.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  // Add any other origins as needed
];

// CORS options for the main middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      // Origin allowed
      callback(null, true);
    } else {
      // For development and debugging, allow all origins
      // In production, you might want to restrict this
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(null, true); // Allow anyway for now
    }
  },
  credentials: true, // Allow cookies and authentication
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-HTTP-Method-Override'],
  maxAge: 86400, // Cache preflight response for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
const applyCorsMw = (app) => {
  // Global CORS middleware
  app.use(cors(corsOptions));
  
  // Ensure OPTIONS requests are handled properly
  app.options('*', cors(corsOptions));
  
  // Additional middleware to ensure CORS headers on all responses
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || !origin) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    } else {
      // For development, allow all origins
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  // Special handling for auth routes
  app.options('/api/auth/login', (req, res) => {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.status(200).end();
  });
  
  app.options('/api/auth/register', (req, res) => {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.status(200).end();
  });
  
  // Log middleware application
  console.log('✅ CORS middleware applied');
};

module.exports = applyCorsMw;
