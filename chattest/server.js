const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(UploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname) || '.jpg';
    cb(null, `${file.fieldname}_${timestamp}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'audio/m4a', 'audio/mp4'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files
  }
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'audio', maxCount: 1 }
]);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.post('/api/chat', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    
    console.log('\n=== NEW CHAT MESSAGE RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', req.headers);
    console.log('Message Type:', req.body.type);
    
    if (req.body.text) {
      console.log('Text Content:', req.body.text);
    }
    
    const imageFiles = req.files['images'] || [];
    if (imageFiles.length > 0) {
      console.log('Images Received:');
      imageFiles.forEach((file, index) => {
        console.log(`  - Image ${index + 1}:`, {
          originalName: file.originalname,
          savedAs: file.filename,
          size: `${(file.size / 1024).toFixed(2)} KB`,
          mimetype: file.mimetype,
          path: `/uploads/${file.filename}`
        });
      });
    }
    
    const audioFiles = req.files['audio'] || [];
    if (audioFiles.length > 0) {
      console.log('Audio Received:');
      audioFiles.forEach((file, index) => {
        console.log(`  - Audio ${index + 1}:`, {
          originalName: file.originalname,
          savedAs: file.filename,
          size: `${(file.size / 1024).toFixed(2)} KB`,
          mimetype: file.mimetype,
          path: `/uploads/${file.filename}`
        });
      });
    }
    
    console.log('All Form Fields:', req.body);
    
    if (req.files && Object.keys(req.files).length > 0) {
      console.log('All Files:', Object.values(req.files).flat().map(f => ({
        fieldname: f.fieldname,
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype
      })));
    }
    
    console.log('=== END MESSAGE ===\n');
    
    const response = {
      success: true,
      messageId: Date.now().toString(),
      type: req.body.type,
      receivedAt: new Date().toISOString(),
      processed: {
        text: !!req.body.text,
        images: imageFiles.length,
        audio: audioFiles.length
      },
      message: getDummyResponse(req.body.type),
      files: imageFiles.map(file => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename
      }))
    };
    
    res.json(response);
  });
});

function getDummyResponse(type) {
  const responses = {
    'text': [
      "I received your text message! This is a dummy response.",
      "Got your message! The server is working correctly.",
      "Text message processed successfully!",
      "Thanks for your message! This is just a test response."
    ],
    'text_with_images': [
      "I received your text message with images! Both text and images were processed.",
      "Got your message and images! Everything looks good.",
      "Text and images received successfully!"
    ],
    'images_only': [
      "Images received! I can see you sent some photos.",
      "Got your images! They were uploaded successfully.",
      "Images processed! Thanks for sharing."
    ],
    'audio': [
      "Audio recording received! The voice message was uploaded successfully.",
      "Got your voice message! Audio file processed.",
      "Voice recording received and saved!"
    ]
  };
  
  const typeResponses = responses[type] || responses['text'];
  return typeResponses[Math.floor(Math.random() * typeResponses.length)];
}

app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit from:', req.ip);
  res.json({ 
    message: 'Server is reachable!', 
    timestamp: new Date().toISOString(),
    clientIP: req.ip
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync('./uploads').map(filename => ({
      filename,
      path: `/uploads/${filename}`,
      stats: fs.statSync(path.join('./uploads', filename))
    }));
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Could not read uploads directory' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dummy Chat Server running on port ${PORT}`);
  console.log(`📱 Update your app to use: http://YOUR_IP_ADDRESS:${PORT}/api/chat`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Files endpoint: http://localhost:${PORT}/api/files`);
  console.log(`\n📝 This server will log all incoming chat messages and save uploaded files.`);
  console.log(`💾 Files are saved in the './uploads' directory`);
  console.log(`\nWaiting for chat messages...\n`);
});

process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down gracefully...');
  process.exit(0);
});