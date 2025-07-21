import base64
import os
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field  # <-- Use pydantic v2 directly
import httpx
import logging

# --- Gemini 2.5 Flash Model Setup ---
GOOGLE_API_KEY = "AIzaSyC-OmyX48OcwbNLR7GcplTKKiAEPSZXHzc"
model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY)

# --- Pydantic Model for Output ---
class DiseaseDetection(BaseModel):
    diseaseName: str = Field(description="Name of the detected disease")
    confidence: float = Field(description="Confidence score (0-100)")
    boundingBox: Dict[str, float] = Field(description="Bounding box coordinates as percent: x, y, width, height")
    description: str = Field(description="Description of the disease")
    symptoms: list = Field(description="List of symptoms")
    solutions: list = Field(description="List of solutions, each as a dict with title and details")

parser = PydanticOutputParser(pydantic_object=DiseaseDetection)

# --- Prompt Template ---
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert crop disease detection assistant. Given a crop image, return a JSON object with the following fields: diseaseName, confidence (as percent), boundingBox (x, y, width, height as percent strings), description, symptoms (list), solutions (list of dicts with title and details). If no disease, set diseaseName to 'Healthy'. {format_instructions}"),
    ("human", [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,{image_data}"}},
    ]),
])

chain = prompt | model | parser

def analyze_crop_image(image_bytes: bytes) -> dict:
    try:
        image_data = base64.b64encode(image_bytes).decode("utf-8")
        result = chain.invoke({
            "format_instructions": parser.get_format_instructions(),
            "image_data": image_data
        })
        return result.dict()
    except Exception as e:
        logging.exception("Error in analyze_crop_image")
        raise 