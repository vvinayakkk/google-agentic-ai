from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# --- Modular Routers ---
from routers import farmer
from routers import weather

app = FastAPI()

# Allow CORS for local development (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(farmer.router)
app.include_router(weather.router)

@app.get("/")
def root():
    return {"message": "FastAPI backend for Farmer App is running!"} 