"""
Script to upload rich, Indian-specific mock data for 5 farmers to Firebase Firestore.

Instructions:
1. Go to Firebase Console > Project Settings > Service Accounts.
2. Generate a new private key and download the JSON file.
3. Place the JSON file as 'serviceAccountKey.json' in this folder.
4. Install dependencies: pip install firebase-admin
5. Run this script: python data.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
import datetime

# Initialize Firebase
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# --- MOCK DATA ---

farmers = [
    {
        'farmerId': 'f001',
        'name': 'Vinayak Bhatia',
        'profileImage': 'https://randomuser.me/api/portraits/men/31.jpg',
        'village': 'Shirur, Maharashtra',
        'phoneNumber': '+91 98765 43210',
        'language': 'Marathi',
        'farmLocation': {'lat': 18.8237, 'lng': 74.3732},
        'farmSize': '5 acres',
        'preferredInteractionMode': 'voice',
        'onboardingStatus': 'complete',
        'livestock': [
            {'id': 'c1', 'type': 'cow', 'name': 'Gauri', 'age': '4 years', 'breed': 'Gir', 'milkCapacity': '18L/day', 'health': 'Excellent', 'lastCheckup': '2024-06-10', 'icon': '🐄', 'color': '#4ADE80'},
            {'id': 'c2', 'type': 'goat', 'name': 'Moti', 'age': '2 years', 'breed': 'Jamunapari', 'milkCapacity': '2L/day', 'health': 'Good', 'lastCheckup': '2024-06-12', 'icon': '🐐', 'color': '#8B5CF6'},
        ],
        'crops': [
            {
                'cropId': 'cr1',
                'name': 'Sugarcane',
                'icon': 'barley',
                'plantingDate': '2023-10-15',
                'totalDuration': '12-18 Months',
                'stages': [
                    {'id': 1, 'title': 'Land Preparation', 'durationWeeks': 4, 'icon': 'shovel', 'color': '#a1662f', 'tasks': ['Deep ploughing', 'Apply FYM', 'Create furrows'], 'needs': 'Well-drained, loamy soil.', 'threats': 'Soil-borne pathogens.'},
                    {'id': 2, 'title': 'Planting', 'durationWeeks': 2, 'icon': 'seed-outline', 'color': '#8f9a62', 'tasks': ['Select healthy setts', 'Treat with fungicide', 'Plant in furrows'], 'needs': 'Optimal moisture.', 'threats': 'Poor sett quality.'},
                ]
            }
        ],
        'calendarEvents': [
            {'date': '2024-07-22', 'time': '06:00', 'task': 'Irrigation - Field A', 'type': 'irrigation', 'priority': 'high', 'details': 'Irrigate Field A for 2 hours. Use drip system. Check pump pressure.', 'completed': False},
            {'date': '2024-07-23', 'time': '09:00', 'task': 'Soil Testing - Plot 3', 'type': 'analysis', 'priority': 'medium', 'details': 'Collect soil samples from Plot 3. Send to lab for NPK analysis.', 'completed': False},
        ],
        'marketListings': [
            {'id': 'm1', 'name': 'Organic Wheat', 'quantity': '50 quintals', 'myPrice': 2600, 'marketPrice': 2450, 'status': 'active', 'views': 24, 'inquiries': 3, 'emoji': '🌾', 'createdAt': '2024-06-01'},
        ],
        'chatHistory': [
            {'id': 'ch1', 'title': 'Sugarcane Disease', 'date': '2024-06-10', 'messages': [
                {'sender': 'user', 'type': 'text', 'content': 'My sugarcane leaves are yellowing.', 'timestamp': '2024-06-10T10:00:00'},
                {'sender': 'ai', 'type': 'text', 'content': 'It could be nitrogen deficiency. Try urea application.', 'timestamp': '2024-06-10T10:01:00'},
            ]}
        ],
        'documents': [
            {'id': 'd1', 'title': 'Land Ownership Affidavit', 'time': '2024-06-10T10:24:00', 'type': 'affidavit', 'status': 'completed', 'fields': {'owner': 'Vinayak Patil', 'village': 'Shirur'}},
        ],
        'upiContacts': [
            {'id': 'u1', 'name': 'Shubham Pawar', 'phone': '+91 99876 54321', 'upiId': 'shubham@ybl', 'color': '#a21caf', 'initial': 'S'},
        ],
        'upiTransactions': [
            {'id': 't1', 'recipientName': 'Shubham Pawar', 'recipientUpi': 'shubham@ybl', 'amount': 1500, 'remark': 'Fertilizer payment', 'date': '2024-06-11', 'status': 'success', 'type': 'pay anyone'},
        ],
    },
    {
        'farmerId': 'f002',
        'name': 'Aarti Yadav',
        'profileImage': 'https://randomuser.me/api/portraits/women/44.jpg',
        'village': 'Barabanki, Uttar Pradesh',
        'phoneNumber': '+91 91234 56789',
        'language': 'Hindi',
        'farmLocation': {'lat': 26.9385, 'lng': 81.1891},
        'farmSize': '3 acres',
        'preferredInteractionMode': 'manual',
        'onboardingStatus': 'complete',
        'livestock': [
            {'id': 'c1', 'type': 'cow', 'name': 'Kamdhenu', 'age': '5 years', 'breed': 'Sahiwal', 'milkCapacity': '20L/day', 'health': 'Good', 'lastCheckup': '2024-06-09', 'icon': '🐄', 'color': '#60A5FA'},
        ],
        'crops': [
            {
                'cropId': 'cr1',
                'name': 'Paddy',
                'icon': 'rice',
                'plantingDate': '2024-06-01',
                'totalDuration': '4 Months',
                'stages': [
                    {'id': 1, 'title': 'Nursery Preparation', 'durationWeeks': 2, 'icon': 'seed-outline', 'color': '#99bb6d', 'tasks': ['Prepare nursery bed', 'Sow seeds'], 'needs': 'Fine soil.', 'threats': 'Seedling blight.'},
                    {'id': 2, 'title': 'Transplanting', 'durationWeeks': 1, 'icon': 'plant-outline', 'color': '#6a994e', 'tasks': ['Transplant seedlings'], 'needs': 'Flooded field.', 'threats': 'Root rot.'},
                ]
            }
        ],
        'calendarEvents': [
            {'date': '2024-07-22', 'time': '07:00', 'task': 'Paddy Transplanting', 'type': 'planting', 'priority': 'high', 'details': 'Transplant paddy seedlings to main field.', 'completed': False},
        ],
        'marketListings': [
            {'id': 'm1', 'name': 'Fresh Paddy', 'quantity': '30 quintals', 'myPrice': 2100, 'marketPrice': 2000, 'status': 'active', 'views': 12, 'inquiries': 2, 'emoji': '🍚', 'createdAt': '2024-06-05'},
        ],
        'chatHistory': [
            {'id': 'ch1', 'title': 'Paddy Watering', 'date': '2024-06-12', 'messages': [
                {'sender': 'user', 'type': 'text', 'content': 'How often should I water paddy?', 'timestamp': '2024-06-12T09:00:00'},
                {'sender': 'ai', 'type': 'text', 'content': 'Keep the field flooded for the first 3 weeks.', 'timestamp': '2024-06-12T09:01:00'},
            ]}
        ],
        'documents': [
            {'id': 'd1', 'title': 'Crop Insurance', 'time': '2024-06-12T11:00:00', 'type': 'insurance', 'status': 'completed', 'fields': {'insured': 'Aarti Yadav', 'crop': 'Paddy'}},
        ],
        'upiContacts': [
            {'id': 'u1', 'name': 'Ramesh Singh', 'phone': '+91 98712 34567', 'upiId': 'ramesh@oksbi', 'color': '#6366f1', 'initial': 'R'},
        ],
        'upiTransactions': [
            {'id': 't1', 'recipientName': 'Ramesh Singh', 'recipientUpi': 'ramesh@oksbi', 'amount': 900, 'remark': 'Labour payment', 'date': '2024-06-13', 'status': 'success', 'type': 'pay anyone'},
        ],
    },
    {
        'farmerId': 'f003',
        'name': 'Suresh Kumar',
        'profileImage': 'https://randomuser.me/api/portraits/men/55.jpg',
        'village': 'Karnal, Haryana',
        'phoneNumber': '+91 99887 66554',
        'language': 'Haryanvi',
        'farmLocation': {'lat': 29.6857, 'lng': 76.9905},
        'farmSize': '7 acres',
        'preferredInteractionMode': 'voice',
        'onboardingStatus': 'complete',
        'livestock': [
            {'id': 'c1', 'type': 'buffalo', 'name': 'Kali', 'age': '6 years', 'breed': 'Murrah', 'milkCapacity': '25L/day', 'health': 'Excellent', 'lastCheckup': '2024-06-08', 'icon': '🐃', 'color': '#F59E0B'},
        ],
        'crops': [
            {
                'cropId': 'cr1',
                'name': 'Wheat',
                'icon': 'wheat',
                'plantingDate': '2023-11-10',
                'totalDuration': '5 Months',
                'stages': [
                    {'id': 1, 'title': 'Sowing', 'durationWeeks': 2, 'icon': 'seed-outline', 'color': '#a1662f', 'tasks': ['Sow seeds', 'Irrigate'], 'needs': 'Moist soil.', 'threats': 'Birds.'},
                    {'id': 2, 'title': 'Tillering', 'durationWeeks': 4, 'icon': 'sprout-outline', 'color': '#8f9a62', 'tasks': ['Weeding', 'Fertilizer application'], 'needs': 'Nutrients.', 'threats': 'Weeds.'},
                ]
            }
        ],
        'calendarEvents': [
            {'date': '2024-07-23', 'time': '05:30', 'task': 'Wheat Irrigation', 'type': 'irrigation', 'priority': 'high', 'details': 'Irrigate wheat field for 3 hours.', 'completed': False},
        ],
        'marketListings': [
            {'id': 'm1', 'name': 'Wheat', 'quantity': '100 quintals', 'myPrice': 2500, 'marketPrice': 2450, 'status': 'active', 'views': 30, 'inquiries': 5, 'emoji': '🌾', 'createdAt': '2024-06-07'},
        ],
        'chatHistory': [
            {'id': 'ch1', 'title': 'Buffalo Health', 'date': '2024-06-08', 'messages': [
                {'sender': 'user', 'type': 'text', 'content': 'My buffalo is not eating well.', 'timestamp': '2024-06-08T08:00:00'},
                {'sender': 'ai', 'type': 'text', 'content': 'Check for fever and consult a vet.', 'timestamp': '2024-06-08T08:01:00'},
            ]}
        ],
        'documents': [
            {'id': 'd1', 'title': 'Veterinary Bill', 'time': '2024-06-08T09:00:00', 'type': 'bill', 'status': 'completed', 'fields': {'animal': 'Kali', 'amount': 500}},
        ],
        'upiContacts': [
            {'id': 'u1', 'name': 'Sunita Devi', 'phone': '+91 98765 12345', 'upiId': 'sunita@okicici', 'color': '#EC4899', 'initial': 'S'},
        ],
        'upiTransactions': [
            {'id': 't1', 'recipientName': 'Sunita Devi', 'recipientUpi': 'sunita@okicici', 'amount': 500, 'remark': 'Veterinary bill', 'date': '2024-06-08', 'status': 'success', 'type': 'pay anyone'},
        ],
    },
    {
        'farmerId': 'f004',
        'name': 'Lakshmi Nair',
        'profileImage': 'https://randomuser.me/api/portraits/women/68.jpg',
        'village': 'Palakkad, Kerala',
        'phoneNumber': '+91 98765 99887',
        'language': 'Malayalam',
        'farmLocation': {'lat': 10.7867, 'lng': 76.6548},
        'farmSize': '2.5 acres',
        'preferredInteractionMode': 'manual',
        'onboardingStatus': 'complete',
        'livestock': [
            {'id': 'c1', 'type': 'hen', 'name': 'Kuttan', 'age': '1 year', 'breed': 'Aseel', 'eggCapacity': '5 eggs/week', 'health': 'Good', 'lastCheckup': '2024-06-10', 'icon': '🐔', 'color': '#EF4444'},
        ],
        'crops': [
            {
                'cropId': 'cr1',
                'name': 'Banana',
                'icon': 'banana',
                'plantingDate': '2024-02-15',
                'totalDuration': '10 Months',
                'stages': [
                    {'id': 1, 'title': 'Planting', 'durationWeeks': 2, 'icon': 'seed-outline', 'color': '#fca311', 'tasks': ['Plant suckers', 'Irrigate'], 'needs': 'Moist soil.', 'threats': 'Nematodes.'},
                    {'id': 2, 'title': 'Growth', 'durationWeeks': 20, 'icon': 'sprout-outline', 'color': '#386641', 'tasks': ['Fertilizer application', 'Weeding'], 'needs': 'Nutrients.', 'threats': 'Weeds.'},
                ]
            }
        ],
        'calendarEvents': [
            {'date': '2024-07-24', 'time': '07:00', 'task': 'Banana Fertilizer', 'type': 'treatment', 'priority': 'medium', 'details': 'Apply potash fertilizer to banana plants.', 'completed': False},
        ],
        'marketListings': [
            {'id': 'm1', 'name': 'Banana', 'quantity': '200 bunches', 'myPrice': 350, 'marketPrice': 340, 'status': 'active', 'views': 15, 'inquiries': 2, 'emoji': '🍌', 'createdAt': '2024-06-10'},
        ],
        'chatHistory': [
            {'id': 'ch1', 'title': 'Banana Growth', 'date': '2024-06-10', 'messages': [
                {'sender': 'user', 'type': 'text', 'content': 'How to improve banana yield?', 'timestamp': '2024-06-10T10:00:00'},
                {'sender': 'ai', 'type': 'text', 'content': 'Use tissue culture plants and regular irrigation.', 'timestamp': '2024-06-10T10:01:00'},
            ]}
        ],
        'documents': [
            {'id': 'd1', 'title': 'Soil Test Report', 'time': '2024-06-10T11:00:00', 'type': 'report', 'status': 'completed', 'fields': {'crop': 'Banana', 'ph': 6.5}},
        ],
        'upiContacts': [
            {'id': 'u1', 'name': 'Manoj Kumar', 'phone': '+91 98765 11223', 'upiId': 'manoj@ybl', 'color': '#059669', 'initial': 'M'},
        ],
        'upiTransactions': [
            {'id': 't1', 'recipientName': 'Manoj Kumar', 'recipientUpi': 'manoj@ybl', 'amount': 700, 'remark': 'Fertilizer', 'date': '2024-06-11', 'status': 'success', 'type': 'pay anyone'},
        ],
    },
    {
        'farmerId': 'f005',
        'name': 'Ravi Reddy',
        'profileImage': 'https://randomuser.me/api/portraits/men/77.jpg',
        'village': 'Nalgonda, Telangana',
        'phoneNumber': '+91 90000 12345',
        'language': 'Telugu',
        'farmLocation': {'lat': 17.0574, 'lng': 79.2686},
        'farmSize': '6 acres',
        'preferredInteractionMode': 'voice',
        'onboardingStatus': 'complete',
        'livestock': [
            {'id': 'c1', 'type': 'sheep', 'name': 'Chintu', 'age': '3 years', 'breed': 'Nellore', 'health': 'Good', 'lastCheckup': '2024-06-09', 'icon': '🐑', 'color': '#10b981'},
        ],
        'crops': [
            {
                'cropId': 'cr1',
                'name': 'Cotton',
                'icon': 'cotton',
                'plantingDate': '2024-06-01',
                'totalDuration': '6 Months',
                'stages': [
                    {'id': 1, 'title': 'Sowing', 'durationWeeks': 2, 'icon': 'seed-outline', 'color': '#a1662f', 'tasks': ['Sow seeds', 'Irrigate'], 'needs': 'Moist soil.', 'threats': 'Bollworm.'},
                    {'id': 2, 'title': 'Flowering', 'durationWeeks': 8, 'icon': 'flower-outline', 'color': '#fca311', 'tasks': ['Pest control', 'Fertilizer application'], 'needs': 'Warm weather.', 'threats': 'Aphids.'},
                ]
            }
        ],
        'calendarEvents': [
            {'date': '2024-07-25', 'time': '06:30', 'task': 'Cotton Pest Control', 'type': 'monitoring', 'priority': 'high', 'details': 'Spray pesticide for bollworm.', 'completed': False},
        ],
        'marketListings': [
            {'id': 'm1', 'name': 'Cotton', 'quantity': '80 quintals', 'myPrice': 6000, 'marketPrice': 5900, 'status': 'active', 'views': 20, 'inquiries': 4, 'emoji': '🧺', 'createdAt': '2024-06-12'},
        ],
        'chatHistory': [
            {'id': 'ch1', 'title': 'Sheep Health', 'date': '2024-06-09', 'messages': [
                {'sender': 'user', 'type': 'text', 'content': 'My sheep is limping.', 'timestamp': '2024-06-09T08:00:00'},
                {'sender': 'ai', 'type': 'text', 'content': 'Check for hoof infection and apply ointment.', 'timestamp': '2024-06-09T08:01:00'},
            ]}
        ],
        'documents': [
            {'id': 'd1', 'title': 'Sheep Vaccination', 'time': '2024-06-09T09:00:00', 'type': 'vaccination', 'status': 'completed', 'fields': {'animal': 'Chintu', 'vaccine': 'FMD'}},
        ],
        'upiContacts': [
            {'id': 'u1', 'name': 'Srinivas Rao', 'phone': '+91 98765 99887', 'upiId': 'srinivas@ybl', 'color': '#EA580C', 'initial': 'S'},
        ],
        'upiTransactions': [
            {'id': 't1', 'recipientName': 'Srinivas Rao', 'recipientUpi': 'srinivas@ybl', 'amount': 1200, 'remark': 'Veterinary medicine', 'date': '2024-06-10', 'status': 'success', 'type': 'pay anyone'},
        ],
    },
]

# --- UPLOAD TO FIRESTORE ---
for farmer in farmers:
    doc_ref = db.collection('farmers').document(farmer['farmerId'])
    doc_ref.set({k: v for k, v in farmer.items() if k != 'farmerId'})
    print(f"Uploaded data for farmer: {farmer['name']} ({farmer['village']})")

print("All mock data uploaded successfully!")
