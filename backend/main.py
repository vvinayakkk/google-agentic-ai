from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# --- Modular Routers ---
from routers import farmer
from routers import weather
from routers import crop_disease

app = FastAPI()

# Allow CORS for local development (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

app.include_router(farmer.router)
app.include_router(weather.router)
app.include_router(crop_disease.router)

@app.get("/")
def root():
    return {"message": "FastAPI backend for Farmer App is running!"} 