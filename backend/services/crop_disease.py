import base64
import os
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
import httpx
import logging
from PIL import Image
import io

# --- Gemini 2.5 Flash Model Setup ---
GOOGLE_API_KEY = "AIzaSyC-OmyX48OcwbNLR7GcplTKKiAEPSZXHzc"
model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GOOGLE_API_KEY)

# --- Pydantic Model for Output ---
class BoundingBox(BaseModel):
    x: float = Field(description="X position (percent, 0-100)")
    y: float = Field(description="Y position (percent, 0-100)")
    width: float = Field(description="Width (percent, 0-100)")
    height: float = Field(description="Height (percent, 0-100)")

class DiseaseDetection(BaseModel):
    diseaseName: str = Field(description="Name of the detected disease")
    confidence: float = Field(description="Confidence score (0-100)")
    boundingBoxes: List[BoundingBox] = Field(description="List of bounding boxes for all detected diseased regions, each as an object with x, y, width, height (all floats, percent)")
    boundingBoxExplanation: str = Field(description="Short explanation of how the bounding boxes were determined")
    description: str = Field(description="Detailed description of the disease and any ambiguity if present")
    symptoms: list = Field(description="List of symptoms")
    solutions: list = Field(description="List of actionable solutions, each as a dict with title and details")

parser = PydanticOutputParser(pydantic_object=DiseaseDetection)

# --- Enhanced Prompt Template with Few-Shot Example ---
FIXED_WIDTH = 512
FIXED_HEIGHT = 512
FEW_SHOT_EXAMPLES = '''
Example 1 (multiple regions):
{{
  "diseaseName": "Leaf Spot",
  "confidence": 91.2,
  "boundingBoxes": [
    {{"x": 12.5, "y": 20.0, "width": 15.0, "height": 18.0}},
    {{"x": 60.0, "y": 40.0, "width": 10.0, "height": 12.0}}
  ],
  "boundingBoxExplanation": "Two distinct necrotic regions detected.",
  "description": "Multiple brown spots typical of leaf spot disease.",
  "symptoms": ["Brown lesions", "Yellow halos"],
  "solutions": [
    {{"title": "Remove affected leaves", "details": "Prune and destroy affected leaves."}},
    {{"title": "Apply fungicide", "details": "Use a broad-spectrum fungicide."}}
  ]
}}

Example 2 (healthy):
{{
  "diseaseName": "Healthy",
  "confidence": 100.0,
  "boundingBoxes": [
    {{"x": 0.0, "y": 0.0, "width": 100.0, "height": 100.0}}
  ],
  "boundingBoxExplanation": "No diseased regions detected, box covers whole image.",
  "description": "No visible symptoms of disease.",
  "symptoms": [],
  "solutions": []
}}
'''
prompt = ChatPromptTemplate.from_messages([
    ("system", (
        f"You are an expert crop disease detection assistant. Given a crop image that has been resized to exactly {FIXED_WIDTH}x{FIXED_HEIGHT} pixels, return a JSON object with these fields: "
        "diseaseName (precise, most likely disease), "
        "confidence (as percent, float), "
        "boundingBoxes (always a list of objects, each with x, y, width, height as floats, all in percent, 0-100, relative to the fixed image size, covering only the affected/visible diseased area. You must cover every visible diseased region, even small or ambiguous spots, with a bounding box. If only one region, return a single box in a list. If healthy, return a single box covering the whole image [{{{{x:0, y:0, width:100, height:100}}}}]. Never return empty or null.), "
        "boundingBoxExplanation (short, how you determined the boxes), "
        "description (detailed, include ambiguity if multiple diseases possible, and provide a thorough explanation of the visual symptoms, affected areas, and reasoning for each bounding box. Be as detailed as possible.), "
        "symptoms (list), "
        "solutions (list of dicts: title, details, actionable). "
        "If ambiguous, mention this in description and pick the most likely. "
        "Be as accurate and exhaustive as possible. Always follow this output format. "
        "You must return a bounding box for every visible diseased region, even the smallest or faintest spots. Err on the side of over-detection, and do not miss any possible diseased area, even if it is ambiguous or very small."
        "\n\n"
        + FEW_SHOT_EXAMPLES +
        "\n\n{format_instructions}"
    )),
    ("human", [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,{image_data}"}},
    ]),
])

chain = prompt | model | parser

def analyze_crop_image(image_bytes: bytes) -> dict:
    try:
        # Resize image to fixed size
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((FIXED_WIDTH, FIXED_HEIGHT))
        buf = io.BytesIO()
        image.save(buf, format="JPEG")
        resized_bytes = buf.getvalue()
        image_data = base64.b64encode(resized_bytes).decode("utf-8")
        result = chain.invoke({
            "format_instructions": parser.get_format_instructions(),
            "image_data": image_data,
            "x": 0  # Provide a default value for 'x' to satisfy the prompt template
        })
        logging.info(f"Gemini parsed response: {result}")
        return result.dict()
    except Exception as e:
        logging.exception("Error in analyze_crop_image")
        raise 