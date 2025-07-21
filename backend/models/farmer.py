from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Livestock(BaseModel):
    id: str
    type: str
    name: str
    age: str
    breed: str
    milkCapacity: Optional[str] = None
    eggCapacity: Optional[str] = None
    health: str
    lastCheckup: str
    icon: str
    color: str

class CropStage(BaseModel):
    id: int
    title: str
    durationWeeks: int
    icon: str
    color: str
    tasks: List[str]
    needs: str
    threats: str

class Crop(BaseModel):
    cropId: str
    name: str
    icon: str
    plantingDate: str
    totalDuration: str
    stages: List[CropStage]

class CalendarEvent(BaseModel):
    date: str
    time: str
    task: str
    type: str
    priority: str
    details: str
    completed: bool

class MarketListing(BaseModel):
    id: str
    name: str
    quantity: str
    myPrice: float
    marketPrice: float
    status: str
    views: int
    inquiries: int
    emoji: str
    createdAt: str

class ChatMessage(BaseModel):
    sender: str
    type: str
    content: str
    timestamp: str

class ChatHistory(BaseModel):
    id: str
    title: str
    date: str
    messages: List[ChatMessage]

class Document(BaseModel):
    id: str
    title: str
    time: str
    type: str
    status: str
    fields: Dict[str, Any]

class Vectors(BaseModel):
    profile: List[float]
    livestock: List[float]
    crops: List[float]
    calendarEvents: List[float]
    marketListings: List[float]
    chatHistory: List[float]
    documents: List[float]

class FarmerProfile(BaseModel):
    name: str
    profileImage: str
    village: str
    phoneNumber: str
    language: str
    farmLocation: Dict[str, float]
    farmSize: str
    preferredInteractionMode: str
    onboardingStatus: str

class Farmer(BaseModel):
    farmerId: str
    profile: FarmerProfile
    livestock: List[Livestock]
    crops: List[Crop]
    calendarEvents: List[CalendarEvent]
    marketListings: List[MarketListing]
    chatHistory: List[ChatHistory]
    documents: List[Document]
    vectors: Optional[Vectors] 