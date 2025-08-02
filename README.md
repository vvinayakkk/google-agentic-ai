# 🌾 Kisan Sahayak - AI-Powered Agricultural Assistant

> *Empowering farmers with intelligent solutions through cutting-edge AI technology*

[![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com/)

---

## 🚀 Quick Start Overview

Kisan Sahayak is a revolutionary agricultural assistant that combines AI agents, speech processing, and real-time data to help farmers make informed decisions. Our architecture consists of:

- **📱 Mobile App** - React Native frontend
- **🔧 Individual APIs Backend** - Core functionalities (Port 8000)
- **🤖 GCP Agents Backend** - AI-powered services (Port 8001)

---

## 📁 Project Structure

```
📦 google-agentic-ai/
├── 📱 MyApp/                    # React Native Mobile Application
├── 🔧 backend/                  # Individual APIs & Core Services
├── 🤖 gcp_agents_off_backend/   # GCP AI Agents & Intelligence Layer
└── 👤 vinayak/                  # Configuration & Credentials
```

---

## 🛠️ Prerequisites

Before diving in, ensure you have:

- **Node.js** (v16 or higher) 📦
- **Python** (v3.8 or higher) 🐍
- **Expo CLI** 📱
- **Google Cloud Platform Account** ☁️
- **Firebase Project** 🔥
- **Twilio Account** 📞
- **Bland AI Account** 🤖

---

## 🎯 Step-by-Step Setup Guide

### 📱 **STEP 1: Mobile App Setup**

Navigate to the mobile app directory and install dependencies:

```bash
cd MyApp
npm install
```

**Start the application:**
```bash
# For development with cache clearing
npx expo start --clear

# Alternative start command
npm start
```

---

### 🔧 **STEP 2: Individual APIs Backend (Port 8000)**

This backend handles core functionalities like speech processing, communications, and individual API services.

#### **Environment Setup:**

```bash
cd backend
```

**Create Virtual Environment:**
```bash
python -m venv myenv
myenv\Scripts\activate  # Windows
# source myenv/bin/activate  # macOS/Linux
```

**Install Dependencies:**
```bash
pip install -r requirements.txt
```

#### **Environment Variables (.env):**

Create a `.env` file in the `backend/` directory:

```env
# Bland AI Configuration
BLAND_API_KEY=your_bland_api_key_here
BLAND_PATHWAY_ID=your_bland_pathway_id
BLAND_PHONE_NUMBER=your_bland_phone_number
BLAND_API_URL=https://api.bland.ai

# Google Services
GOOGLE_API_KEY=your_google_api_key_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_API_KEY=your_twilio_api_key
TWILIO_API_SECRET=your_twilio_api_secret
```

#### **GCP Credentials:**

Place your `creds_gcp.json` file in the `backend/` directory with the following APIs enabled:
- ✅ Speech-to-Text API
- ✅ Text-to-Speech API
- ✅ Cloud Translation API (if needed)

#### **Start the Backend:**

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 🤖 **STEP 3: GCP Agents Backend (Port 8001)**

This backend powers the AI intelligence layer with Google Cloud Platform agents.

#### **Setup Directory Structure:**

```bash
cd gcp_agents_off_backend
mkdir creds
```

#### **Credentials Setup:**

Place the following files in `gcp_agents_off_backend/creds/`:
- `creds_gcp.json` - Google Cloud Platform service account
- `serviceAccountKey.json` - Firebase service account

#### **Environment Variables (.env):**

Create a `.env` file in the `gcp_agents_off_backend/` directory:

```env
# Weather Services
OPEN_WEATHER_API_KEY=your_openweather_api_key
OPEN_WEATHER_API_URL=https://api.openweathermap.org/data/2.5

# Google AI Configuration
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VETEXAI=true

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/kisan_sahayak
```

#### **Start the AI Backend:**

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

### 👤 **STEP 4: Root Configuration**

In the root `vinayak/` folder, place:
- `creds_gcp.json` - Google Cloud Platform credentials
- `serviceAccountKey.json` - Firebase service account key

---

## 🔥 **Full System Startup**

### **Terminal 1 - Mobile App:**
```bash
cd MyApp
npx expo start --clear
```

### **Terminal 2 - Individual APIs Backend:**
```bash
cd backend
myenv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### **Terminal 3 - GCP Agents Backend:**
```bash
cd gcp_agents_off_backend
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 🌐 **API Endpoints**

### **Individual APIs Backend (Port 8000):**
- `http://localhost:8000/docs` - Swagger Documentation
- Core speech processing and communication APIs

### **GCP Agents Backend (Port 8001):**
- `http://localhost:8001/docs` - AI Agents Documentation
- Weather data, crop recommendations, and intelligent farming insights

---

## 🔑 **Required API Keys & Services**

| Service | Purpose | Required For |
|---------|---------|--------------|
| 🤖 **Bland AI** | Voice AI capabilities | Phone-based interactions |
| 📞 **Twilio** | SMS/Voice communications | Farmer notifications |
| ☁️ **Google Cloud** | Speech, Translation, AI | Core AI functionalities |
| 🔥 **Firebase** | Database & Authentication | User management |
| 🌤️ **OpenWeather** | Weather data | Crop planning insights |

---

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **🚫 Port Already in Use:**
```bash
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Kill process on port 8001
netstat -ano | findstr :8001
taskkill /PID <process_id> /F
```

#### **🐍 Python Virtual Environment Issues:**
```bash
# Recreate virtual environment
rm -rf myenv
python -m venv myenv
myenv\Scripts\activate
pip install -r requirements.txt
```

#### **📦 Node Modules Issues:**
```bash
cd MyApp
rm -rf node_modules package-lock.json
npm install
```

---

## 👥 **Contributing**

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.

---

## 📞 **Support**

For technical support or questions:
- 📧 Email: kisankiawazzz@gmail.com
- 💬 Join our developer community
- 📖 Check the documentation

---

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">

**🌾 Made with ❤️ for Indian Farmers 🇮🇳**

*Empowering agriculture through technology*

[![Star us on GitHub](https://img.shields.io/badge/Star-Repository-181717?style=for-the-badge&logo=github)](https://github.com/vvinayakkk/google-agentic-ai.git)

</div>