// CORS middleware to ensure proper cross-origin requests
const cors = require('cors');

// List of allowed origins
const allowedOrigins = [
  'https://client-one-pearl.vercel.app',
  'http://localhost:3000',
  // Add any other origins as needed
];

// CORS options for the main middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      // Origin allowed
      callback(null, true);
    } else {
      // In production, reject requests from unknown origins
      if (process.env.NODE_ENV === 'production') {
        console.warn(`Origin ${origin} not allowed by CORS`);
        callback(new Error('Not allowed by CORS'));
      } else {
        // In development, allow all origins
        callback(null, true);
      }
    }
  },
  credentials: true, // Allow cookies and authentication
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-HTTP-Method-Override'],
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
      res.header('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV !== 'production') {
      // In development, allow all origins
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-HTTP-Method-Override');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  // Special handling for auth routes
  app.options('/api/auth/login', cors(corsOptions));
  app.options('/api/auth/register', cors(corsOptions));
  
  // Log middleware application
  console.log('✅ CORS middleware applied');
};

module.exports = applyCorsMw;
