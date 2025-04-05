// Import necessary packages
const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes'); 
const connectDB = require('./config/db');
const cors = require('cors');
const investmentRoutes = require('./routes/investmentRoutes'); // Import investment routes


// Connect to Database
connectDB();

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust later for security)
app.use(express.json()); // Allow the server to accept JSON data in request bodies

// --- API Routes ---
app.use('/api/auth', authRoutes); // Mount the authentication routes
app.use('/api/investments', investmentRoutes); // Mount investment routes

// Basic test route
app.get('/', (req, res) => {
  res.send('GoldNest Backend API is running!');
});

// Define the port the server will run on
const PORT = process.env.PORT || 5001; // Use port from .env or default to 5001

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
