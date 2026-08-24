import express from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import upload, { uploadToCloudinary } from '../middleware/upload.js';
import adminAuth from '../middleware/auth.js';

const router = express.Router();

// Create task
router.post('/create', adminAuth, upload.single('photo'), uploadToCloudinary, async (req, res, next) => {
  try {
    // Check if Cloudinary upload failed
    if (req.cloudinaryError) {
      console.error('❌ Cloudinary upload error detected in route handler:', req.cloudinaryError.message);
      return res.status(500).json({ 
        message: 'Failed to upload image to cloud', 
        error: req.cloudinaryError.message 
      });
    }

    const { title, description, priority, category, sector, dueDate, referencePhone, referenceNumber, assignedToContactId, assignedToContact } = req.body;

    console.log('Creating task with:', { title, description, priority, category, sector, dueDate, referencePhone, referenceNumber, assignedToContactId, assignedToContact });
    console.log('File uploaded:', req.file ? req.file.cloudinaryUrl : 'No file');

    let photoUrl = null;
    if (req.file) {
      // Store the Cloudinary URL directly
      photoUrl = req.file.cloudinaryUrl;
      console.log('✅ Photo URL stored from Cloudinary:', photoUrl);
    }

    const task = new Task({
      title,
      description,
      priority,
      category,
      sector,
      dueDate,
      originalDueDate: dueDate, // Set original deadline when creating task
      referencePhone,
      referenceNumber,
      assignedToContactId,
      assignedToContact,
      photo: photoUrl, // Store the Cloudinary URL
      createdBy: 'admin',
    });

    await task.save();
    console.log('Task created with ID:', task._id);
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.log('Error creating task:', error.message);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// Get all tasks
router.get('/all', adminAuth, async (req, res) => {
  try {
    console.log('Fetching all tasks...');
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('Database not connected, returning empty tasks');
      return res.json([]);
    }
    
    const tasks = await Task.find().sort({ createdAt: -1 });
    console.log('Tasks found:', tasks.length);
    res.json(tasks);
  } catch (error) {
    console.log('Error fetching tasks:', error.message);
    // Return empty array instead of error
    res.json([]);
  }
});

// Get tasks by sector
router.get('/sector/:sector', adminAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ sector: req.params.sector }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Get task statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    console.log('Fetching task statistics...');
    
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('Database not connected, returning default stats');
      return res.json({ 
        total: 0, 
        pending: 0, 
        inProgress: 0, 
        completed: 0,
        warning: 'Database connection unavailable - showing default values'
      });
    }
    
    const total = await Task.countDocuments();
    const pending = await Task.countDocuments({ status: 'Pending' });
    const inProgress = await Task.countDocuments({ status: 'In Progress' });
    const completed = await Task.countDocuments({ status: 'Completed' });

    console.log('Stats calculated:', { total, pending, inProgress, completed });
    res.json({ total, pending, inProgress, completed });
  } catch (error) {
    console.log('Error fetching stats:', error.message);
    // Return default stats instead of error
    res.json({ 
      total: 0, 
      pending: 0, 
      inProgress: 0, 
      completed: 0,
      error: error.message 
    });
  }
});

// Update task status
router.put('/update/:id', adminAuth, upload.single('photo'), uploadToCloudinary, async (req, res) => {
  try {
    // Check if Cloudinary upload failed
    if (req.cloudinaryError) {
      console.error('❌ Cloudinary upload error detected in route handler:', req.cloudinaryError.message);
      return res.status(500).json({ 
        message: 'Failed to upload image to cloud', 
        error: req.cloudinaryError.message 
      });
    }

    const { status, startTime, endTime, title, description, priority, category, sector, dueDate, referencePhone, referenceNumber, assignedToContactId, assignedToContact, photo } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update basic fields if provided
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;
    if (sector !== undefined) task.sector = sector;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (referencePhone !== undefined) task.referencePhone = referencePhone;
    if (referenceNumber !== undefined) task.referenceNumber = referenceNumber;
    if (assignedToContactId !== undefined) task.assignedToContactId = assignedToContactId;
    if (assignedToContact !== undefined) task.assignedToContact = assignedToContact;
    
    // Handle photo: if new file was uploaded, use Cloudinary URL; otherwise use provided value
    if (req.file) {
      task.photo = req.file.cloudinaryUrl;
    } else if (photo !== undefined) {
      task.photo = photo;
    }

    // Handle status changes with timing logic
    if (status) {
      if (status === 'In Progress' && !task.startTime) {
        task.startTime = new Date();
        task.status = status;
      } else if (status === 'Completed' && task.startTime) {
        task.endTime = new Date();
        const durationMs = task.endTime - task.startTime;
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        task.duration = `${hours}h ${minutes}m ${seconds}s`;
        task.status = status;
      } else {
        task.status = status;
      }
    }

    task.updatedAt = new Date();
    await task.save();

    res.json({ message: 'Task updated successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// Assign task
router.put('/assign/:id', adminAuth, async (req, res) => {
  try {
    const { assignedTo, assignedToPhone } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.assignedTo = assignedTo;
    task.assignedToPhone = assignedToPhone;
    task.status = 'In Progress';
    task.startTime = new Date();
    task.updatedAt = new Date();

    await task.save();

    res.json({ message: 'Task assigned successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning task', error: error.message });
  }
});

// Delete task
router.delete('/delete/:id', adminAuth, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});

// ============ ACKNOWLEDGEMENT ROUTES (Must come BEFORE generic /:id route) ============

// Generate acknowledgement link for task
router.post('/:taskId/acknowledge-link', adminAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Generate unique token - NO EXPIRY (links never expire)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    task.acknowledgementToken = token;
    task.acknowledgementTokenExpiry = null; // No expiry - links valid forever
    await task.save();

    // Generate full URL (prefer env variable, fallback to request origin)
    let baseUrl = process.env.FRONTEND_URL || 'https://160.187.169.41/Dr.Meghana';
    
    if (!process.env.FRONTEND_URL) {
      const protocol = req.protocol || 'https';
      const host = req.get('host');
      
      if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
        baseUrl = 'http://localhost:3000/Dr.Meghana';
      }
    }
    
    // Ensure baseUrl doesn't have trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    const acknowledgementUrl = `${baseUrl}/acknowledge/${req.params.taskId}/${token}`;

    console.log('✅ Acknowledgement link generated:', acknowledgementUrl);

    res.json({ 
      message: 'Acknowledgement link generated successfully',
      acknowledgementUrl,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating acknowledgement link', error: error.message });
  }
});

// Get task details for acknowledgement (public endpoint - no auth needed)
router.get('/acknowledge/:token', async (req, res) => {
  try {
    const token = req.params.token;
    console.log('📥 [ACKNOWLEDGE] Received request for token:', token.substring(0, 20) + '...');
    
    const task = await Task.findOne({ 
      acknowledgementToken: token
    });

    if (!task) {
      console.log('❌ [ACKNOWLEDGE] Task not found for token:', token.substring(0, 20) + '...');
      return res.status(404).json({ message: 'Invalid acknowledgement link. Task not found in database.' });
    }

    console.log('✅ [ACKNOWLEDGE] Task found:', task._id, '- Title:', task.title);
    
    // Return task details (minimal info for public view) - INCLUDING CATEGORY
    res.json({
      _id: task._id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      sector: task.sector,
      dueDate: task.dueDate,
      assignedToContact: task.assignedToContact,
      status: task.status,
      photo: task.photo,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
  } catch (error) {
    console.error('❌ [ACKNOWLEDGE] Error retrieving task:', error.message);
    res.status(500).json({ message: 'Error retrieving task', error: error.message });
  }
});

// Mark task as complete via acknowledgement link (public endpoint - no auth needed)
router.post('/acknowledge/:token/complete', async (req, res) => {
  try {
    const task = await Task.findOne({ 
      acknowledgementToken: req.params.token
      // Token has no expiry, so we don't check expiry date
    });

    if (!task) {
      return res.status(404).json({ message: 'Invalid or expired acknowledgement link' });
    }

    if (task.status === 'Completed') {
      return res.json({ message: 'Task is already marked as complete', task });
    }

    // Update task status
    task.status = 'Completed';
    task.acknowledgedAt = new Date();
    
    // Calculate duration if startTime exists
    if (task.startTime) {
      const durationMs = new Date() - task.startTime;
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      task.duration = `${hours}h ${minutes}m ${seconds}s`;
    }

    task.updatedAt = new Date();
    await task.save();

    res.json({ 
      message: 'Task marked as complete successfully', 
      task: {
        _id: task._id,
        title: task.title,
        status: task.status,
        acknowledgedAt: task.acknowledgedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error completing task', error: error.message });
  }
});

// Update task progress via acknowledgement link (public endpoint - no auth needed)
router.post('/acknowledge/:token/progress', async (req, res) => {
  try {
    const { progress } = req.body; // 'in-progress', '50-percent', 'completed'
    const task = await Task.findOne({ 
      acknowledgementToken: req.params.token
    });

    if (!task) {
      return res.status(404).json({ message: 'Invalid acknowledgement link' });
    }

    // Store progress update
    if (!task.progressUpdates) {
      task.progressUpdates = [];
    }

    task.progressUpdates.push({
      status: progress,
      updatedAt: new Date(),
    });

    // If progress is 'completed', mark task as complete
    if (progress === 'completed') {
      task.status = 'Completed';
      task.acknowledgedAt = new Date();
      
      if (task.startTime) {
        const durationMs = new Date() - task.startTime;
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        task.duration = `${hours}h ${minutes}m ${seconds}s`;
      }
    }

    task.updatedAt = new Date();
    await task.save();

    res.json({ 
      message: 'Progress updated successfully', 
      progress: task.progressUpdates[task.progressUpdates.length - 1],
      task: {
        _id: task._id,
        title: task.title,
        status: task.status,
      }
    });
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ message: 'Error updating task progress', error: error.message });
  }
});

// ============ END ACKNOWLEDGEMENT ROUTES ============

// ===== EXTENSION REQUEST ADMIN ENDPOINTS (MUST BE BEFORE /:taskId/... ROUTES) =====

// Get all extension requests (admin only) - MUST be BEFORE /:taskId/extension-request/:token
router.get('/extension-requests/all', adminAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ 'extensionRequests.0': { $exists: true } })
      .sort({ 'extensionRequests.requestedAt': -1 });

    // Flatten extension requests with task info
    const allRequests = [];
    tasks.forEach((task) => {
      if (task.extensionRequests && task.extensionRequests.length > 0) {
        task.extensionRequests.forEach((request, index) => {
          if (request.status === 'pending') {
            allRequests.push({
              taskId: task._id,  // Keep task ID separate - IMPORTANT!
              _id: task._id,  // Also keep as _id for compatibility
              requestIndex: index,  // Index of this request in extensionRequests array
              taskTitle: task.title,
              taskDescription: task.description,
              assignedToContact: task.assignedToContact,
              assignedToPhone: task.assignedToPhone,
              currentDueDate: task.dueDate,
              priority: task.priority,
              category: task.category,
              sector: task.sector,
              message: request.message,
              requestedBy: request.requestedBy,
              requestedPhone: request.requestedPhone,
              requestedDeadlineExtension: request.requestedDeadlineExtension,
              status: request.status,
              requestedAt: request.requestedAt,
            });
          }
        });
      }
    });

    res.json(allRequests);
  } catch (error) {
    console.error('Error fetching extension requests:', error);
    res.status(500).json({ message: 'Error fetching extension requests', error: error.message });
  }
});

// Approve extension request (admin only) - MUST be BEFORE /:taskId/extension-request/:token
router.post('/extension-requests/:taskId/approve', adminAuth, async (req, res) => {
  try {
    console.log('🔵 APPROVE ROUTE HIT - taskId:', req.params.taskId, 'requestIndex:', req.body.requestIndex);
    
    const { requestIndex, newDeadline, approvalNote } = req.body;
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      console.log('❌ Task not found:', req.params.taskId);
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.extensionRequests[requestIndex]) {
      console.log('❌ Extension request not found at index:', requestIndex);
      return res.status(404).json({ message: 'Extension request not found' });
    }

    task.extensionRequests[requestIndex].status = 'approved';
    task.extensionRequests[requestIndex].approvedAt = new Date();
    task.extensionRequests[requestIndex].approvalNote = approvalNote || null;
    task.extensionRequests[requestIndex].previousDeadline = task.dueDate; // store what deadline was before this approval
    
    // Initialize originalDueDate if it doesn't exist (first extension for old tasks)
    if (!task.originalDueDate) {
      task.originalDueDate = task.dueDate;
    }
    
    // Update current deadline - don't touch originalDueDate!
    if (newDeadline) {
      task.dueDate = new Date(newDeadline);
      task.extensionRequests[requestIndex].approvedDeadline = new Date(newDeadline);
    } else if (task.extensionRequests[requestIndex].requestedDeadlineExtension) {
      task.dueDate = task.extensionRequests[requestIndex].requestedDeadlineExtension;
      task.extensionRequests[requestIndex].approvedDeadline = task.extensionRequests[requestIndex].requestedDeadlineExtension;
    }
    
    await task.save();

    console.log('✅ Extension approved for task:', req.params.taskId);
    res.json({ message: 'Extension approved', task });
  } catch (error) {
    console.error('Error approving extension:', error);
    res.status(500).json({ message: 'Error approving extension', error: error.message });
  }
});

// Reject extension request (admin only) - MUST be BEFORE /:taskId/extension-request/:token
router.post('/extension-requests/:taskId/reject', adminAuth, async (req, res) => {
  try {
    const { requestIndex, rejectionReason } = req.body;
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.extensionRequests[requestIndex]) {
      return res.status(404).json({ message: 'Extension request not found' });
    }

    task.extensionRequests[requestIndex].status = 'rejected';
    task.extensionRequests[requestIndex].rejectionReason = rejectionReason || 'Request not approved';
    task.extensionRequests[requestIndex].rejectedAt = new Date();
    await task.save();

    console.log('✅ Extension rejected for task:', req.params.taskId);
    res.json({ message: 'Extension rejected', task });
  } catch (error) {
    console.error('Error rejecting extension:', error);
    res.status(500).json({ message: 'Error rejecting extension', error: error.message });
  }
});

// ===== EXTENSION REQUEST PUBLIC ENDPOINTS (MUST BE AFTER /extension-requests/... admin routes) =====

// Submit extension request (from acknowledgement page) - PUBLIC endpoint
router.post('/:taskId/extension-request/:token', async (req, res) => {
  try {
    const { message, requestedDeadline } = req.body;
    const { taskId, token } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify token is valid
    if (task.acknowledgementToken !== token) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Add extension request
    const extensionRequest = {
      message,
      requestedBy: task.assignedToContact,
      requestedPhone: task.assignedToPhone,
      requestedDeadlineExtension: requestedDeadline || task.dueDate,
      status: 'pending',
      requestedAt: new Date(),
    };

    task.extensionRequests.push(extensionRequest);
    await task.save();

    console.log('✅ Extension request submitted for task:', taskId);
    res.json({
      message: 'Extension request submitted successfully',
      extensionRequest,
    });
  } catch (error) {
    console.error('Error submitting extension request:', error);
    res.status(500).json({ message: 'Error submitting extension request', error: error.message });
  }
});

// Get extension status for a task (PUBLIC - for acknowledgement page) - MUST BE BEFORE /:taskId routes
router.get('/:taskId/extension-status/:token', async (req, res) => {
  try {
    const { taskId, token } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify token is valid (more forgiving - allow if no token stored yet or token matches)
    if (task.acknowledgementToken && task.acknowledgementToken !== token) {
      // Token mismatch - invalid token for this task
      return res.status(204).end(); // Return no content instead of 401
    }

    // Get the most recent extension request for this task
    const lastExtensionRequest = task.extensionRequests && task.extensionRequests.length > 0
      ? task.extensionRequests[task.extensionRequests.length - 1]
      : null;

    if (!lastExtensionRequest) {
      return res.status(204).end(); // No content - no extension requests yet
    }

    // Return the extension status
    res.json({
      status: lastExtensionRequest.status,
      message: lastExtensionRequest.message,
      requestedBy: lastExtensionRequest.requestedBy,
      requestedDeadline: lastExtensionRequest.requestedDeadlineExtension,
      requestedAt: lastExtensionRequest.requestedAt,
      approvedDeadline: lastExtensionRequest.approvedDeadline || task.dueDate,
      approvedAt: lastExtensionRequest.approvedAt || null,
      approvalNote: lastExtensionRequest.approvalNote || null,
      rejectedAt: lastExtensionRequest.rejectedAt || null,
      rejectionReason: lastExtensionRequest.rejectionReason || null,
    });
  } catch (error) {
    console.error('Error fetching extension status:', error);
    res.status(204).end(); // Return no content on error (graceful handling)
  }
});

// ============ GENERIC ROUTES (MUST BE LAST) ============

// Get single task (MUST be AFTER all specific routes)
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task', error: error.message });
  }
});

router.use((err, req, res, next) => {
  if (err) {
    console.error('Route error:', err.message);
    
    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files' });
    }
    if (err.message && err.message.includes('MIME')) {
      return res.status(400).json({ message: 'Only image files are allowed' });
    }
    
    // Generic error
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
  next();
});

export default router;
