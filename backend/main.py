from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# --- Modular Routers ---
from routers import farmer
from routers import weather
from routers import crop_disease
from routers import chat_rag
from routers import market
from routers import soil_moisture
from routers import rental
from routers.speech_to_text import router as speech_to_text_router
from routers.document_builder import router as document_builder_router

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
app.include_router(chat_rag.router)
app.include_router(market.router)
app.include_router(soil_moisture.router)
app.include_router(rental.router)
app.include_router(speech_to_text_router)
app.include_router(document_builder_router)


@app.get("/")
def root():
    return {"message": "FastAPI backend for Farmer App is running!"} 