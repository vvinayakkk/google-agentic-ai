"""
Equipment Rental Rate Database for Indian Agriculture.
Real-world rental rates across Indian states for farm equipment, machinery, and tools.
Sourced from CHC (Custom Hiring Centres), FMTTIs, ICAR publications, and state agriculture departments.
"""

import json
import logging
import os
import uuid
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


DATAGOV_MECHANIZATION_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

FALLBACK_MECHANIZATION_DATA: Dict[str, Dict[str, float]] = {
    "punjab": {"mechanization_percentage": 98.0, "tractors_per_1000ha": 145.0},
    "haryana": {"mechanization_percentage": 94.0, "tractors_per_1000ha": 132.0},
    "gujarat": {"mechanization_percentage": 68.0, "tractors_per_1000ha": 82.0},
    "tamil nadu": {"mechanization_percentage": 62.0, "tractors_per_1000ha": 76.0},
    "uttar pradesh": {"mechanization_percentage": 72.0, "tractors_per_1000ha": 88.0},
    "maharashtra": {"mechanization_percentage": 58.0, "tractors_per_1000ha": 71.0},
    "karnataka": {"mechanization_percentage": 55.0, "tractors_per_1000ha": 66.0},
    "madhya pradesh": {"mechanization_percentage": 48.0, "tractors_per_1000ha": 59.0},
    "rajasthan": {"mechanization_percentage": 52.0, "tractors_per_1000ha": 63.0},
    "bihar": {"mechanization_percentage": 41.0, "tractors_per_1000ha": 49.0},
    "west bengal": {"mechanization_percentage": 45.0, "tractors_per_1000ha": 53.0},
    "andhra pradesh": {"mechanization_percentage": 61.0, "tractors_per_1000ha": 74.0},
}

STATE_ALIASES = {
    "up": "uttar pradesh",
    "u.p.": "uttar pradesh",
    "mp": "madhya pradesh",
    "m.p.": "madhya pradesh",
    "wb": "west bengal",
    "w.b.": "west bengal",
    "tn": "tamil nadu",
    "t.n.": "tamil nadu",
    "ap": "andhra pradesh",
    "a.p.": "andhra pradesh",
}


# ── Equipment Categories ─────────────────────────────────────────

EQUIPMENT_CATEGORIES = {
    "land_preparation": "Land Preparation",
    "sowing_planting": "Sowing & Planting",
    "irrigation": "Irrigation",
    "crop_protection": "Crop Protection",
    "harvesting": "Harvesting & Threshing",
    "post_harvest": "Post Harvest",
    "transport": "Transport",
    "dairy_livestock": "Dairy & Livestock",
    "horticulture": "Horticulture",
    "drone_technology": "Drone Technology",
}


# ── Comprehensive Equipment Rental Data ──────────────────────────

EQUIPMENT_RENTAL_DATA: List[Dict[str, Any]] = [
    # ── Land Preparation ─────────────────────────────────
    {
        "name": "Tractor (35-45 HP)",
        "hindi_name": "ट्रैक्टर (35-45 HP)",
        "category": "land_preparation",
        "description": "Medium-duty tractor for ploughing, tilling, and hauling",
        "rental_rates": {
            "hourly": {"min": 500, "max": 800, "avg": 650},
            "daily": {"min": 3000, "max": 5000, "avg": 4000},
            "per_acre": {"min": 800, "max": 1500, "avg": 1100},
        },
        "state_variations": {
            "Punjab": {"per_acre": 900, "daily": 3500},
            "Haryana": {"per_acre": 950, "daily": 3800},
            "Uttar Pradesh": {"per_acre": 800, "daily": 3000},
            "Madhya Pradesh": {"per_acre": 850, "daily": 3200},
            "Maharashtra": {"per_acre": 1100, "daily": 4200},
            "Karnataka": {"per_acre": 1000, "daily": 4000},
            "Tamil Nadu": {"per_acre": 1200, "daily": 4500},
            "Rajasthan": {"per_acre": 900, "daily": 3500},
            "Gujarat": {"per_acre": 1000, "daily": 3800},
            "Andhra Pradesh": {"per_acre": 950, "daily": 3600},
            "Telangana": {"per_acre": 1000, "daily": 3800},
            "West Bengal": {"per_acre": 850, "daily": 3200},
            "Bihar": {"per_acre": 750, "daily": 2800},
        },
        "fuel_cost_extra": True,
        "operator_included": True,
        "popular_brands": ["Mahindra", "Swaraj", "John Deere", "Sonalika", "TAFE"],
        "availability": "High",
        "booking_advance_days": 1,
        "source": "CHC/FMTTI",
    },
    {
        "name": "Tractor (50+ HP)",
        "hindi_name": "ट्रैक्टर (50+ HP)",
        "category": "land_preparation",
        "description": "Heavy-duty tractor for deep ploughing and large farms",
        "rental_rates": {
            "hourly": {"min": 800, "max": 1200, "avg": 1000},
            "daily": {"min": 5000, "max": 8000, "avg": 6500},
            "per_acre": {"min": 1200, "max": 2000, "avg": 1600},
        },
        "state_variations": {
            "Punjab": {"per_acre": 1300, "daily": 5500},
            "Maharashtra": {"per_acre": 1600, "daily": 6500},
            "Karnataka": {"per_acre": 1500, "daily": 6000},
        },
        "fuel_cost_extra": True,
        "operator_included": True,
        "popular_brands": ["John Deere", "New Holland", "Kubota", "Massey Ferguson"],
        "availability": "Medium",
        "booking_advance_days": 2,
        "source": "CHC/FMTTI",
    },
    {
        "name": "Rotavator",
        "hindi_name": "रोटावेटर",
        "category": "land_preparation",
        "description": "Rotary tiller for seedbed preparation, 5-7 feet working width",
        "rental_rates": {
            "hourly": {"min": 600, "max": 1000, "avg": 800},
            "per_acre": {"min": 800, "max": 1400, "avg": 1100},
        },
        "state_variations": {
            "Punjab": {"per_acre": 900},
            "Uttar Pradesh": {"per_acre": 800},
            "Maharashtra": {"per_acre": 1200},
            "Madhya Pradesh": {"per_acre": 900},
            "Rajasthan": {"per_acre": 1000},
        },
        "fuel_cost_extra": True,
        "operator_included": True,
        "requires_tractor": True,
        "availability": "High",
        "source": "CHC/FMTTI",
    },
    {
        "name": "Disc Plough",
        "hindi_name": "डिस्क हल",
        "category": "land_preparation",
        "description": "3-disc plough for primary tillage in hard soils",
        "rental_rates": {
            "per_acre": {"min": 600, "max": 1000, "avg": 800},
        },
        "state_variations": {
            "Maharashtra": {"per_acre": 900},
            "Rajasthan": {"per_acre": 700},
            "Gujarat": {"per_acre": 800},
        },
        "requires_tractor": True,
        "availability": "High",
        "source": "CHC",
    },
    {
        "name": "MB Plough (Mould Board)",
        "hindi_name": "एमबी हल",
        "category": "land_preparation",
        "description": "Inverts soil for deep tillage and weed control",
        "rental_rates": {
            "per_acre": {"min": 700, "max": 1200, "avg": 950},
        },
        "requires_tractor": True,
        "availability": "Medium",
        "source": "CHC",
    },
    {
        "name": "Cultivator",
        "hindi_name": "कल्टीवेटर",
        "category": "land_preparation",
        "description": "9-tyne cultivator for secondary tillage",
        "rental_rates": {
            "per_acre": {"min": 500, "max": 800, "avg": 650},
        },
        "requires_tractor": True,
        "availability": "High",
        "source": "CHC",
    },
    {
        "name": "Laser Land Leveller",
        "hindi_name": "लेज़र लैंड लेवलर",
        "category": "land_preparation",
        "description": "Precision laser-guided land levelling for water efficiency",
        "rental_rates": {
            "hourly": {"min": 1200, "max": 2000, "avg": 1600},
            "per_acre": {"min": 1500, "max": 2500, "avg": 2000},
        },
        "state_variations": {
            "Punjab": {"per_acre": 1500},
            "Haryana": {"per_acre": 1600},
            "Uttar Pradesh": {"per_acre": 1800},
            "Rajasthan": {"per_acre": 2000},
        },
        "fuel_cost_extra": True,
        "operator_included": True,
        "availability": "Low",
        "booking_advance_days": 5,
        "source": "CHC/State Agri Dept",
    },
    {
        "name": "Power Tiller (12-15 HP)",
        "hindi_name": "पॉवर टिलर",
        "category": "land_preparation",
        "description": "Walk-behind tiller for small/marginal farms and terraces",
        "rental_rates": {
            "hourly": {"min": 300, "max": 500, "avg": 400},
            "daily": {"min": 1500, "max": 2500, "avg": 2000},
            "per_acre": {"min": 600, "max": 1000, "avg": 800},
        },
        "state_variations": {
            "Kerala": {"per_acre": 800},
            "West Bengal": {"per_acre": 600},
            "Assam": {"per_acre": 700},
            "Odisha": {"per_acre": 650},
            "Jharkhand": {"per_acre": 600},
        },
        "fuel_cost_extra": False,
        "operator_included": True,
        "availability": "Medium",
        "source": "CHC/FMTTI",
    },

    # ── Sowing & Planting ────────────────────────────────
    {
        "name": "Seed Drill (9-row)",
        "hindi_name": "सीड ड्रिल",
        "category": "sowing_planting",
        "description": "Multi-row seed drill for wheat, rice, pulses",
        "rental_rates": {
            "per_acre": {"min": 400, "max": 800, "avg": 600},
        },
        "state_variations": {
            "Punjab": {"per_acre": 450},
            "Haryana": {"per_acre": 500},
            "Madhya Pradesh": {"per_acre": 550},
            "Rajasthan": {"per_acre": 600},
        },
        "requires_tractor": True,
        "availability": "High",
        "source": "CHC",
    },
    {
        "name": "Happy Seeder",
        "hindi_name": "हैपी सीडर",
        "category": "sowing_planting",
        "description": "Direct seeding in standing stubble (anti-stubble burning)",
        "rental_rates": {
            "per_acre": {"min": 1200, "max": 2000, "avg": 1600},
        },
        "state_variations": {
            "Punjab": {"per_acre": 1200},
            "Haryana": {"per_acre": 1400},
            "Uttar Pradesh": {"per_acre": 1500},
        },
        "requires_tractor": True,
        "availability": "Medium",
        "booking_advance_days": 3,
        "source": "CHC/State Agri Dept",
    },
    {
        "name": "Rice Transplanter (Walk-behind)",
        "hindi_name": "धान रोपाई मशीन",
        "category": "sowing_planting",
        "description": "4-row walk-behind paddy transplanter",
        "rental_rates": {
            "per_acre": {"min": 1500, "max": 2500, "avg": 2000},
        },
        "state_variations": {
            "Punjab": {"per_acre": 1800},
            "Tamil Nadu": {"per_acre": 2000},
            "West Bengal": {"per_acre": 1500},
            "Andhra Pradesh": {"per_acre": 1800},
            "Chhattisgarh": {"per_acre": 1500},
        },
        "operator_included": True,
        "availability": "Medium",
        "booking_advance_days": 3,
        "source": "CHC",
    },
    {
        "name": "Rice Transplanter (Riding-type, 8-row)",
        "hindi_name": "राइडिंग धान रोपाई मशीन",
        "category": "sowing_planting",
        "description": "8-row riding paddy transplanter for large areas",
        "rental_rates": {
            "per_acre": {"min": 1200, "max": 1800, "avg": 1500},
        },
        "operator_included": True,
        "availability": "Low",
        "booking_advance_days": 5,
        "source": "CHC",
    },
    {
        "name": "Sugarcane Planter",
        "hindi_name": "गन्ना बोवाई मशीन",
        "category": "sowing_planting",
        "description": "Mechanized sugarcane sett planter",
        "rental_rates": {
            "per_acre": {"min": 2000, "max": 3500, "avg": 2750},
        },
        "state_variations": {
            "Uttar Pradesh": {"per_acre": 2000},
            "Maharashtra": {"per_acre": 2500},
            "Karnataka": {"per_acre": 2800},
        },
        "requires_tractor": True,
        "availability": "Low",
        "source": "Sugar Mills/CHC",
    },
    {
        "name": "Potato Planter",
        "hindi_name": "आलू बोवाई मशीन",
        "category": "sowing_planting",
        "description": "Automatic potato planter with fertilizer attachment",
        "rental_rates": {
            "per_acre": {"min": 1500, "max": 2500, "avg": 2000},
        },
        "state_variations": {
            "Uttar Pradesh": {"per_acre": 1500},
            "Punjab": {"per_acre": 1800},
            "West Bengal": {"per_acre": 1600},
            "Gujarat": {"per_acre": 2000},
        },
        "requires_tractor": True,
        "availability": "Medium",
        "source": "CHC",
    },

    # ── Irrigation ───────────────────────────────────────
    {
        "name": "Diesel Pump Set (5 HP)",
        "hindi_name": "डीज़ल पंप सेट",
        "category": "irrigation",
        "description": "Portable diesel water pump for irrigation",
        "rental_rates": {
            "hourly": {"min": 100, "max": 200, "avg": 150},
            "daily": {"min": 600, "max": 1000, "avg": 800},
        },
        "fuel_cost_extra": True,
        "availability": "High",
        "source": "Local rental",
    },
    {
        "name": "Sprinkler Irrigation System",
        "hindi_name": "स्प्रिंकलर सिंचाई प्रणाली",
        "category": "irrigation",
        "description": "Portable sprinkler set covering 1-2 acres",
        "rental_rates": {
            "daily": {"min": 500, "max": 1000, "avg": 750},
            "per_acre": {"min": 400, "max": 800, "avg": 600},
        },
        "availability": "Medium",
        "source": "CHC/Agri Dept",
    },
    {
        "name": "Drip Irrigation Kit (Portable)",
        "hindi_name": "ड्रिप सिंचाई किट",
        "category": "irrigation",
        "description": "Temporary drip kit for seasonal crops",
        "rental_rates": {
            "seasonal": {"min": 3000, "max": 6000, "avg": 4500},
            "per_acre": {"min": 3000, "max": 5000, "avg": 4000},
        },
        "availability": "Low",
        "source": "Agri Dept",
    },

    # ── Crop Protection ──────────────────────────────────
    {
        "name": "Knapsack Sprayer (Manual, 16L)",
        "hindi_name": "नैपसैक स्प्रेयर",
        "category": "crop_protection",
        "description": "Manual backpack sprayer for pesticides/herbicides",
        "rental_rates": {
            "daily": {"min": 50, "max": 150, "avg": 100},
        },
        "availability": "High",
        "source": "Local shop",
    },
    {
        "name": "Power Sprayer (Petrol, 20L)",
        "hindi_name": "पॉवर स्प्रेयर",
        "category": "crop_protection",
        "description": "Motorized backpack sprayer with engine",
        "rental_rates": {
            "daily": {"min": 200, "max": 400, "avg": 300},
            "per_acre": {"min": 200, "max": 400, "avg": 300},
        },
        "fuel_cost_extra": True,
        "availability": "High",
        "source": "CHC/Local rental",
    },
    {
        "name": "Tractor-Mounted Boom Sprayer",
        "hindi_name": "ट्रैक्टर बूम स्प्रेयर",
        "category": "crop_protection",
        "description": "400L tank boom sprayer for large-area spraying",
        "rental_rates": {
            "per_acre": {"min": 300, "max": 600, "avg": 450},
        },
        "requires_tractor": True,
        "availability": "Medium",
        "source": "CHC",
    },

    # ── Harvesting & Threshing ───────────────────────────
    {
        "name": "Combine Harvester (Wheat/Rice)",
        "hindi_name": "कम्बाइन हार्वेस्टर",
        "category": "harvesting",
        "description": "Self-propelled combine for wheat, rice, soybean, mustard",
        "rental_rates": {
            "per_acre": {"min": 1500, "max": 3000, "avg": 2200},
        },
        "state_variations": {
            "Punjab": {"per_acre": 1500},
            "Haryana": {"per_acre": 1600},
            "Uttar Pradesh": {"per_acre": 1800},
            "Madhya Pradesh": {"per_acre": 2000},
            "Bihar": {"per_acre": 2200},
            "West Bengal": {"per_acre": 2500},
            "Maharashtra": {"per_acre": 2500},
            "Tamil Nadu": {"per_acre": 2800},
        },
        "operator_included": True,
        "fuel_cost_extra": False,
        "availability": "High (seasonal)",
        "booking_advance_days": 3,
        "popular_brands": ["Preet", "Kartar", "Dasmesh", "John Deere", "Claas"],
        "source": "CHC/Private operators",
    },
    {
        "name": "Multi-Crop Thresher",
        "hindi_name": "मल्टी-क्रॉप थ्रेशर",
        "category": "harvesting",
        "description": "Stationary thresher for wheat, paddy, maize, pulses",
        "rental_rates": {
            "hourly": {"min": 400, "max": 700, "avg": 550},
            "per_quintal": {"min": 50, "max": 100, "avg": 75},
        },
        "fuel_cost_extra": True,
        "availability": "High",
        "source": "CHC/Local rental",
    },
    {
        "name": "Reaper / Crop Cutter",
        "hindi_name": "रीपर / फसल कटाई मशीन",
        "category": "harvesting",
        "description": "Self-propelled reaper for cutting standing crop",
        "rental_rates": {
            "per_acre": {"min": 800, "max": 1500, "avg": 1100},
        },
        "state_variations": {
            "Uttar Pradesh": {"per_acre": 800},
            "Bihar": {"per_acre": 900},
            "Madhya Pradesh": {"per_acre": 1000},
        },
        "availability": "Medium",
        "source": "CHC",
    },
    {
        "name": "Sugarcane Harvester",
        "hindi_name": "गन्ना कटाई मशीन",
        "category": "harvesting",
        "description": "Self-propelled sugarcane harvester with chopper",
        "rental_rates": {
            "per_acre": {"min": 5000, "max": 10000, "avg": 7500},
        },
        "state_variations": {
            "Uttar Pradesh": {"per_acre": 5000},
            "Maharashtra": {"per_acre": 6000},
            "Karnataka": {"per_acre": 7000},
        },
        "operator_included": True,
        "availability": "Low",
        "booking_advance_days": 7,
        "source": "Sugar Mills/CHC",
    },
    {
        "name": "Cotton Picker (Hand-held)",
        "hindi_name": "कॉटन पिकर",
        "category": "harvesting",
        "description": "Portable cotton picking machine",
        "rental_rates": {
            "daily": {"min": 500, "max": 800, "avg": 650},
            "per_acre": {"min": 2000, "max": 4000, "avg": 3000},
        },
        "availability": "Low",
        "source": "CHC/State Agri Dept",
    },
    {
        "name": "Potato Digger",
        "hindi_name": "आलू खुदाई मशीन",
        "category": "harvesting",
        "description": "Tractor-mounted potato digger/harvester",
        "rental_rates": {
            "per_acre": {"min": 1500, "max": 2500, "avg": 2000},
        },
        "state_variations": {
            "Uttar Pradesh": {"per_acre": 1500},
            "West Bengal": {"per_acre": 1800},
            "Punjab": {"per_acre": 2000},
        },
        "requires_tractor": True,
        "availability": "Medium",
        "source": "CHC",
    },

    # ── Post Harvest ─────────────────────────────────────
    {
        "name": "Rice Mill (Mini, Portable)",
        "hindi_name": "मिनी चावल मिल",
        "category": "post_harvest",
        "description": "Portable rice milling machine",
        "rental_rates": {
            "per_quintal": {"min": 30, "max": 60, "avg": 45},
        },
        "availability": "Medium",
        "source": "Local/CHC",
    },
    {
        "name": "Grain Dryer",
        "hindi_name": "अनाज सुखाने की मशीन",
        "category": "post_harvest",
        "description": "Mechanical grain dryer for safe storage moisture levels",
        "rental_rates": {
            "per_quintal": {"min": 40, "max": 80, "avg": 60},
        },
        "availability": "Low",
        "source": "FCI/Warehouse",
    },
    {
        "name": "Seed Grading Machine",
        "hindi_name": "बीज ग्रेडिंग मशीन",
        "category": "post_harvest",
        "description": "Seed cleaner and grader for quality seeds",
        "rental_rates": {
            "hourly": {"min": 200, "max": 400, "avg": 300},
            "per_quintal": {"min": 20, "max": 50, "avg": 35},
        },
        "availability": "Low",
        "source": "Seed Corporation/CHC",
    },
    {
        "name": "Chaff Cutter (Motorized)",
        "hindi_name": "मोटर कुट्टी मशीन",
        "category": "post_harvest",
        "description": "Motorized fodder cutter for animal feed preparation",
        "rental_rates": {
            "daily": {"min": 200, "max": 400, "avg": 300},
            "hourly": {"min": 50, "max": 100, "avg": 75},
        },
        "availability": "High",
        "source": "Local rental",
    },
    {
        "name": "Oil Expeller (Mini)",
        "hindi_name": "तेल मशीन",
        "category": "post_harvest",
        "description": "Mini oil extraction machine for mustard, groundnut, etc.",
        "rental_rates": {
            "per_quintal": {"min": 100, "max": 200, "avg": 150},
        },
        "availability": "Medium",
        "source": "FPO/Local",
    },

    # ── Transport ────────────────────────────────────────
    {
        "name": "Tractor Trolley (2-ton)",
        "hindi_name": "ट्रैक्टर ट्रॉली",
        "category": "transport",
        "description": "Hydraulic tipping tractor trolley",
        "rental_rates": {
            "per_trip": {"min": 300, "max": 800, "avg": 500},
            "daily": {"min": 1500, "max": 3000, "avg": 2000},
        },
        "requires_tractor": True,
        "availability": "High",
        "source": "Local rental",
    },
    {
        "name": "Bullock Cart",
        "hindi_name": "बैलगाड़ी",
        "category": "transport",
        "description": "Traditional ox-cart for farm transport in rural areas",
        "rental_rates": {
            "daily": {"min": 300, "max": 600, "avg": 450},
            "per_trip": {"min": 100, "max": 300, "avg": 200},
        },
        "availability": "Medium",
        "source": "Local",
    },

    # ── Drone Technology ─────────────────────────────────
    {
        "name": "Agricultural Drone (Spraying, 10L)",
        "hindi_name": "कृषि ड्रोन (छिड़काव)",
        "category": "drone_technology",
        "description": "10-litre spraying drone for pesticide/fertilizer application",
        "rental_rates": {
            "per_acre": {"min": 400, "max": 800, "avg": 600},
        },
        "state_variations": {
            "Maharashtra": {"per_acre": 500},
            "Karnataka": {"per_acre": 600},
            "Telangana": {"per_acre": 550},
            "Tamil Nadu": {"per_acre": 650},
            "Andhra Pradesh": {"per_acre": 550},
            "Punjab": {"per_acre": 500},
            "Uttar Pradesh": {"per_acre": 600},
            "Madhya Pradesh": {"per_acre": 550},
        },
        "operator_included": True,
        "availability": "Medium",
        "booking_advance_days": 2,
        "popular_brands": ["DJI Agras", "IoTechWorld", "Garuda", "Marut"],
        "source": "Drone Didi/CHC/Private",
    },
    {
        "name": "Drone (Crop Monitoring/Survey)",
        "hindi_name": "ड्रोन (फसल निगरानी)",
        "category": "drone_technology",
        "description": "Multispectral imaging drone for crop health assessment",
        "rental_rates": {
            "per_acre": {"min": 200, "max": 500, "avg": 350},
            "hourly": {"min": 1500, "max": 3000, "avg": 2000},
        },
        "operator_included": True,
        "availability": "Low",
        "booking_advance_days": 5,
        "source": "AgriTech startups/KVK",
    },

    # ── Dairy & Livestock ────────────────────────────────
    {
        "name": "Milking Machine (Portable, 2-cow)",
        "hindi_name": "दूध दोहने की मशीन",
        "category": "dairy_livestock",
        "description": "Portable vacuum milking machine for 2 cows",
        "rental_rates": {
            "monthly": {"min": 2000, "max": 4000, "avg": 3000},
        },
        "availability": "Medium",
        "source": "Dairy cooperative/CHC",
    },
    {
        "name": "Fodder Harvester",
        "hindi_name": "चारा कटाई मशीन",
        "category": "dairy_livestock",
        "description": "Tractor-mounted green fodder harvester",
        "rental_rates": {
            "per_acre": {"min": 800, "max": 1500, "avg": 1100},
        },
        "requires_tractor": True,
        "availability": "Low",
        "source": "CHC/Dairy cooperative",
    },

    # ── Horticulture ─────────────────────────────────────
    {
        "name": "Brush Cutter / Weed Cutter",
        "hindi_name": "ब्रश कटर",
        "category": "horticulture",
        "description": "Petrol-powered brush cutter for orchard/plantation cleaning",
        "rental_rates": {
            "daily": {"min": 200, "max": 400, "avg": 300},
        },
        "fuel_cost_extra": True,
        "availability": "High",
        "source": "Local rental",
    },
    {
        "name": "Tree Pruner (Pole-type)",
        "hindi_name": "पोल प्रूनर",
        "category": "horticulture",
        "description": "Telescopic pole pruner for fruit tree maintenance",
        "rental_rates": {
            "daily": {"min": 150, "max": 300, "avg": 225},
        },
        "availability": "Medium",
        "source": "Local/Horticulture Dept",
    },
    {
        "name": "Fruit Grading & Sorting Machine",
        "hindi_name": "फल ग्रेडिंग मशीन",
        "category": "horticulture",
        "description": "Automated weight-based fruit sorting line",
        "rental_rates": {
            "per_quintal": {"min": 50, "max": 100, "avg": 75},
        },
        "availability": "Low",
        "source": "FPO/Agri Dept/Pack House",
    },
]


# ── CHC (Custom Hiring Centre) Data ─────────────────────────────

CHC_INFO = {
    "description": (
        "Custom Hiring Centres (CHC) are government-backed centres where farmers "
        "can rent modern agricultural equipment at subsidized rates. "
        "Under Sub-Mission on Agricultural Mechanization (SMAM), CHCs get 40-80% subsidy."
    ),
    "how_to_find": [
        "Visit nearest Krishi Vigyan Kendra (KVK)",
        "Contact District Agriculture Officer",
        "Use FARMS app by Govt of India",
        "Visit mygov.in for CHC directory",
        "Ask at nearest PACS (Primary Agricultural Credit Society)",
    ],
    "subsidy_info": {
        "SC/ST/Small/Marginal": "Up to 80% subsidy on CHC establishment",
        "Other farmers": "Up to 40% subsidy on CHC establishment",
        "FPO/Cooperative": "Up to 80% subsidy",
    },
    "rental_discount": "CHC rates are typically 20-30% lower than private operators",
    "helpline": "1800-180-1551 (Kisan Call Centre)",
}


# ── Helper Functions ─────────────────────────────────────────────

def get_all_equipment() -> List[Dict]:
    """Get all equipment rental data."""
    return EQUIPMENT_RENTAL_DATA


def get_equipment_by_category(category: str) -> List[Dict]:
    """Get equipment by category key."""
    return [e for e in EQUIPMENT_RENTAL_DATA if e.get("category") == category]


def get_equipment_by_name(name: str) -> Optional[Dict]:
    """Find equipment by name (case-insensitive partial match)."""
    name_lower = name.lower()
    for e in EQUIPMENT_RENTAL_DATA:
        if name_lower in e["name"].lower() or name_lower in e.get("hindi_name", "").lower():
            return e
    return None


def get_equipment_rate_for_state(equipment_name: str, state: str) -> Optional[Dict]:
    """Get state-specific rental rate for equipment."""
    equip = get_equipment_by_name(equipment_name)
    if not equip:
        return None

    base_rates = equip.get("rental_rates", {})
    state_var = equip.get("state_variations", {}).get(state)

    if state_var:
        return {
            "equipment": equip["name"],
            "state": state,
            "rates": state_var,
            "base_rates": base_rates,
            "note": "State-specific rate available",
        }
    else:
        return {
            "equipment": equip["name"],
            "state": state,
            "rates": base_rates,
            "note": "Using national average (state-specific data not available)",
        }


def get_categories() -> Dict[str, str]:
    """Get all equipment categories."""
    return EQUIPMENT_CATEGORIES


def get_chc_info() -> Dict:
    """Get CHC information."""
    return CHC_INFO


def search_equipment(query: str) -> List[Dict]:
    """Search equipment by keyword in name, description, or category."""
    query_lower = query.lower()
    results = []
    for e in EQUIPMENT_RENTAL_DATA:
        if (
            query_lower in e["name"].lower()
            or query_lower in e.get("hindi_name", "").lower()
            or query_lower in e.get("description", "").lower()
            or query_lower in e.get("category", "").lower()
        ):
            results.append(e)
    return results


def _normalize_state_name(value: Optional[str]) -> str:
    raw = str(value or "").strip().lower()
    if not raw:
        return ""
    compact = " ".join(raw.replace("_", " ").replace("-", " ").split())
    return STATE_ALIASES.get(compact, compact)


def _to_float(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").strip().replace(",", "")
    if not text:
        return None
    cleaned = "".join(ch for ch in text if ch.isdigit() or ch in ".-")
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _fallback_mechanization_payload(state: Optional[str] = None) -> Dict[str, Any]:
    norm_state = _normalize_state_name(state)
    rows = []
    for key, values in FALLBACK_MECHANIZATION_DATA.items():
        if norm_state and key != norm_state:
            continue
        rows.append(
            {
                "state": key.title(),
                "mechanization_percentage": values["mechanization_percentage"],
                "tractors_per_1000ha": values["tractors_per_1000ha"],
            }
        )
    rows.sort(key=lambda item: item["state"])
    return {
        "state": state,
        "has_real_data": False,
        "source": "fallback_2022_23_census",
        "records": rows,
        "note": "Using built-in 2022-23 mechanization reference data because DATAGOV_API_KEY/DATA_GOV_API_KEY is not configured or live fetch failed.",
    }


def fetch_mechanization_stats(state: Optional[str] = None) -> Dict[str, Any]:
    """Fetch state mechanization stats from data.gov.in with deterministic fallback."""
    resource_id = (
        os.getenv("DATAGOV_MECHANIZATION_RESOURCE_ID", "").strip()
        or os.getenv("DATA_GOV_MECHANIZATION_RESOURCE_ID", "").strip()
        or DATAGOV_MECHANIZATION_RESOURCE_ID
    )
    api_key = os.getenv("DATAGOV_API_KEY", "").strip() or os.getenv("DATA_GOV_API_KEY", "").strip()
    if not api_key:
        return _fallback_mechanization_payload(state)

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": "500",
    }
    if state:
        params["filters[state]"] = state

    url = (
        f"https://api.data.gov.in/resource/{resource_id}"
        f"?{urllib.parse.urlencode(params)}"
    )

    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("Failed to fetch mechanization stats from data.gov.in: %s", exc)
        return _fallback_mechanization_payload(state)

    records = payload.get("records") if isinstance(payload, dict) else []
    if not isinstance(records, list) or not records:
        return _fallback_mechanization_payload(state)

    # Guardrail: some resource ids return unrelated datasets (for example market prices).
    sample_row = records[0] if records and isinstance(records[0], dict) else {}
    sample_keys = [str(key).strip().lower() for key in sample_row.keys()]
    has_mechanization_columns = any("mechanization" in key for key in sample_keys)
    has_tractor_density_columns = any("tractor" in key and ("1000" in key or "ha" in key) for key in sample_keys)
    if not (has_mechanization_columns or has_tractor_density_columns):
        logger.warning(
            "Data.gov resource %s does not expose mechanization columns; using fallback dataset.",
            resource_id,
        )
        return _fallback_mechanization_payload(state)

    parsed_by_state: Dict[str, Dict[str, Any]] = {}
    for row in records:
        if not isinstance(row, dict):
            continue

        state_name = (
            row.get("state")
            or row.get("states")
            or row.get("state_name")
            or row.get("name_of_state")
        )
        norm_state = _normalize_state_name(str(state_name or ""))
        if not norm_state:
            continue

        mech = None
        tractors = None
        for key, value in row.items():
            key_l = str(key).strip().lower()
            if mech is None and "mechanization" in key_l:
                mech = _to_float(value)
            if tractors is None and "tractor" in key_l and ("1000" in key_l or "ha" in key_l):
                tractors = _to_float(value)

        if mech is None and tractors is None:
            continue

        parsed_by_state[norm_state] = {
            "state": norm_state.title(),
            "mechanization_percentage": mech,
            "tractors_per_1000ha": tractors,
        }

    if not parsed_by_state:
        return _fallback_mechanization_payload(state)

    requested_state = _normalize_state_name(state)
    rows = []
    for key, value in parsed_by_state.items():
        if requested_state and key != requested_state:
            continue
        rows.append(value)

    if not rows:
        return _fallback_mechanization_payload(state)

    rows.sort(key=lambda item: item["state"])
    return {
        "state": state,
        "has_real_data": True,
        "source": "data_gov_in",
        "records": rows,
        "note": "Live mechanization data from data.gov.in.",
    }


class EquipmentRentalSyncService:
    """Sync equipment rental data to MongoCollections and Qdrant."""

    async def seed_to_mongo(self, db) -> dict:
        """Seed all equipment rental data into MongoCollections."""
        from datetime import datetime, timezone
        import asyncio

        now = datetime.now(timezone.utc).isoformat()
        count = 0
        tasks = []

        for equip in EQUIPMENT_RENTAL_DATA:
            doc_id = equip["name"].lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
            doc_ref = db.collection("equipment").document(doc_id)
            tasks.append(
                doc_ref.set({
                    **equip,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                    "is_seed_data": True,
                }, merge=True)
            )
            count += 1

            if count % 400 == 0:
                await asyncio.gather(*tasks)
                tasks = []

        if tasks:
            await asyncio.gather(*tasks)

        return {"seeded": count, "message": f"Seeded {count} equipment items to MongoCollections"}

    async def embed_to_qdrant(self) -> dict:
        """Embed equipment data into Qdrant for knowledge base."""
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import PointStruct, Distance, VectorParams
            from fastembed import TextEmbedding
            from shared.core.config import get_settings
            from shared.core.constants import EMBEDDING_DIM

            settings = get_settings()
            client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
            model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

            collection_name = "farming_general"
            existing = [c.name for c in client.get_collections().collections]
            if collection_name not in existing:
                client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
                )

            points = []
            for equip in EQUIPMENT_RENTAL_DATA:
                rates = equip.get("rental_rates", {})
                rate_text_parts = []
                for rate_type, vals in rates.items():
                    if isinstance(vals, dict) and "avg" in vals:
                        rate_text_parts.append(f"₹{vals['avg']}/{rate_type.replace('_', ' ')}")

                rate_text = ", ".join(rate_text_parts) if rate_text_parts else "Contact for rates"

                text = (
                    f"{equip['name']} ({equip.get('hindi_name', '')}): {equip.get('description', '')}. "
                    f"Category: {EQUIPMENT_CATEGORIES.get(equip.get('category', ''), equip.get('category', ''))}. "
                    f"Rental rates: {rate_text}. "
                    f"Availability: {equip.get('availability', 'N/A')}."
                )

                if equip.get("state_variations"):
                    states_with_rates = list(equip["state_variations"].keys())
                    text += f" Available in: {', '.join(states_with_rates[:5])}."

                vector = next(model.embed([text])).tolist()
                points.append(PointStruct(
                    id=uuid.uuid4().hex,
                    vector=vector,
                    payload={
                        "text": text,
                        "equipment_name": equip["name"],
                        "hindi_name": equip.get("hindi_name", ""),
                        "category": equip.get("category", ""),
                        "rental_rates": equip.get("rental_rates", {}),
                        "type": "equipment_rental",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                ))

            if points:
                client.upsert(collection_name=collection_name, points=points)

            # Also embed CHC info
            chc_text = (
                f"Custom Hiring Centres (CHC): {CHC_INFO['description']} "
                f"How to find: {', '.join(CHC_INFO['how_to_find'])}. "
                f"Helpline: {CHC_INFO['helpline']}. "
                f"{CHC_INFO['rental_discount']}."
            )
            chc_vector = next(model.embed([chc_text])).tolist()
            client.upsert(
                collection_name=collection_name,
                points=[PointStruct(
                    id=uuid.uuid4().hex,
                    vector=chc_vector,
                    payload={
                        "text": chc_text,
                        "type": "chc_info",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                )],
            )

            return {"embedded": len(points) + 1, "equipment_items": len(points), "chc_info": 1}

        except ImportError as e:
            logger.warning(f"Qdrant/SentenceTransformer not available: {e}")
            return {"embedded": 0, "message": f"Dependencies not available: {e}"}
        except Exception as e:
            logger.error(f"Error embedding equipment: {e}")
            return {"embedded": 0, "error": str(e)}

