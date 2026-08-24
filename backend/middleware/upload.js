import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Disk Storage for local server uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedBase}${ext}`);
  },
});

// Multer Memory Storage for Cloudinary
const memoryStorage = multer.memoryStorage();

// Check upload target configuration (default to local server storage)
const useCloudinary = process.env.USE_CLOUDINARY === 'true';
const storage = useCloudinary ? memoryStorage : diskStorage;

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Create multer instance with limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// Middleware to process file after multer
export const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) {
    console.log('No file in request, skipping upload processing');
    return next();
  }

  // Handle local disk storage
  if (!useCloudinary) {
    const relativeUrl = `/megha/uploads/${req.file.filename}`;
    req.file.cloudinaryUrl = relativeUrl;
    req.file.path = relativeUrl;
    console.log('📸 Local file saved successfully:', relativeUrl);
    return next();
  }

  // Handle Cloudinary upload if explicitly enabled
  try {
    console.log('🚀 Starting Cloudinary upload for:', req.file.originalname);
    
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        {
          folder: 'task-tracker',
          resource_type: 'auto',
          public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`,
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful:', result.secure_url);
            resolve(result);
          }
        }
      );
      stream.end(req.file.buffer);
    });

    req.file.cloudinaryUrl = result.secure_url;
    req.file.path = result.secure_url;
    
    console.log('📸 File stored as:', req.file.cloudinaryUrl);
    next();
  } catch (error) {
    console.error('❌ Cloudinary middleware error:', error.message);
    req.cloudinaryError = error;
    req.file.cloudinaryUrl = null;
    next();
  }
};

export default upload;
