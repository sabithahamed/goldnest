// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config(); // Ensure env vars are loaded

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'goldnest_profile_pics', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
    // Transformation to apply upon upload (e.g., resize, crop)
    transformation: [{ width: 200, height: 200, crop: 'limit' }], // Limit size
    public_id: (req, file) => `user_${req.user._id}_${Date.now()}`, // Unique public ID
  },
});

// Configure Multer upload middleware
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size (e.g., 5MB)
    fileFilter: (req, file, cb) => {
        // Basic mimetype check
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

module.exports = { cloudinary, upload }; // Export upload middleware