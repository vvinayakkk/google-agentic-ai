const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
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

// Gemini 2.5 Flash API setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_DEFAULT_API_KEY'; // Set in .env
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt, images = []) {
  const requestBody = {
    contents: [
      { parts: [{ text: prompt }] },
    ],
  };
  if (images.length > 0) {
    // For image input, Gemini expects base64-encoded images in a specific format
    requestBody.contents[0].parts.push(...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })));
  }
  const response = await axios.post(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    requestBody
  );
  return response.data;
}

// --- Crop Doctor ---
app.post('/api/crop-doctor', upload, async (req, res) => {
  try {
    const imageFiles = req.files['images'] || [];
    if (imageFiles.length === 0) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    // Convert image to base64
    const img = imageFiles[0];
    const imgBuffer = fs.readFileSync(img.path);
    const base64 = imgBuffer.toString('base64');
    // Compose prompt for Gemini
    const prompt = 'You are a crop doctor. Diagnose the disease or pest in this plant image and provide a step-by-step treatment plan in Kannada. Include organic, chemical, and preventative advice.';
    const geminiResponse = await callGemini(prompt, [{ mimeType: img.mimetype, base64 }]);
    res.json({ diagnosis: geminiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Weather & Work Advisor ---
app.post('/api/weather-advisor', async (req, res) => {
  try {
    const { location, crop } = req.body;
    // Fetch real weather data from OpenWeatherMap
    const apiKey = '0a2d0746df030311d5eeed1aea9faa05';
    // Try to get coordinates for the location (city name)
    const geoResp = await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`);
    if (!geoResp.data || geoResp.data.length === 0) {
      return res.status(400).json({ error: 'Location not found' });
    }
    const { lat, lon } = geoResp.data[0];
    // Get 7-day weather forecast
    const weatherResp = await axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`);
    const daily = weatherResp.data.daily.slice(0, 7);
    // Format forecast for Gemini
    const forecast = daily.map((d, i) => ({
      day: i === 0 ? 'Today' : new Date(d.dt * 1000).toLocaleDateString('en-IN', { weekday: 'long' }),
      weather: d.weather[0].main,
      temp: Math.round(d.temp.day),
      rain: d.rain || 0,
      wind: Math.round(d.wind_speed)
    }));
    const weatherData = { forecast };
    const prompt = `You are a farm advisor. Given this 7-day weather forecast for a ${crop} farmer in ${location}, provide daily actionable advice in Kannada.`;
    const geminiResponse = await callGemini(prompt + '\n' + JSON.stringify(weatherData));
    res.json({ advice: geminiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sell or Hold ---
app.post('/api/sell-or-hold', async (req, res) => {
  try {
    const { crop, location } = req.body;
    // TODO: Integrate mandi price API
    // For now, use dummy price data
    const priceData = {
      mandi: 'Hubli',
      prices: [22, 24, 25, 28, 31, 29, 32], // last 7 days
      today: 32
    };
    const prompt = `You are a market analyst. Given these mandi prices for ${crop} in ${location}, should the farmer sell or hold? Give a clear recommendation.`;
    const geminiResponse = await callGemini(prompt + '\n' + JSON.stringify(priceData));
    res.json({ recommendation: geminiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- My Subsidy Finder ---
app.post('/api/subsidy-finder', async (req, res) => {
  try {
    const { location, crop, landSize } = req.body;
    // TODO: Integrate government scheme data
    // For now, use dummy scheme data
    const schemes = [
      { name: 'Drip Irrigation Subsidy', eligibility: 'Karnataka, any crop, >1 acre', benefit: '50% subsidy', docs: ['Aadhaar', 'Land record'], link: 'https://demo.gov.in/apply' }
    ];
    const prompt = `You are a subsidy advisor. Given this farmer profile (location: ${location}, crop: ${crop}, land size: ${landSize}), list only the most relevant government schemes in Kannada. For each, include eligibility, benefit, required documents, and application link.`;
    const geminiResponse = await callGemini(prompt + '\n' + JSON.stringify(schemes));
    res.json({ schemes: geminiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  console.log(`🔍 Health check: http://10.123.4.245:${PORT}/health`);
  console.log(`📁 Files endpoint: http://10.123.4.245:${PORT}/api/files`);
  console.log(`\n📝 This server will log all incoming chat messages and save uploaded files.`);
  console.log(`💾 Files are saved in the './uploads' directory`);
  console.log(`\nWaiting for chat messages...\n`);
});

process.on('SIGINT', () => {
  console.log('\n👋 Server shutting down gracefully...');
  process.exit(0);
});