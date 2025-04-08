// backend/server.js


// Load environment variables from .env file
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables

// Import necessary packages
const express = require('express');
const cors = require('cors');

// Import DB connection
const connectDB = require('./config/db');

// Import route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const aiRoutes = require('./routes/aiRoutes');
const marketRoutes = require('./routes/marketRoutes');
const walletRoutes = require('./routes/walletRoutes');     // Import wallet routes
const sellRoutes = require('./routes/sellRoutes');         // Import sell routes
const redeemRoutes = require('./routes/redeemRoutes');     // Import redeem routes
const notificationRoutes = require('./routes/notificationRoutes'); // Import notification routes
const userPreferenceRoutes = require('./routes/userPreferenceRoutes'); // Import user preference routes
const priceAlertRoutes = require('./routes/priceAlertRoutes'); // Import price alert routes

// Connect to Database
connectDB();

// Initialize and start cron jobs (e.g., for price alerts, notifications)
// This line executes the code in scheduler.js, setting up any defined cron jobs
require('./scheduler'); // <-- ADDED LINE

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust later for security)
app.use(express.json()); // Allow the server to accept JSON data in request bodies

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/preferences', userPreferenceRoutes); // Mount user preferences under /users
app.use('/api/users/price-alerts', priceAlertRoutes); // Mount price alerts under /users
app.use('/api/investments', investmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/wallet', walletRoutes);         // Mount wallet routes
app.use('/api/sell', sellRoutes);             // Mount sell routes
app.use('/api/redeem', redeemRoutes);         // Mount redeem routes
app.use('/api/notifications', notificationRoutes); // Mount notification routes

// Basic test route
app.get('/', (req, res) => {
  res.send('GoldNest Backend API is running!');
});

// Define the port the server will run on
const PORT = process.env.PORT || 5001;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});