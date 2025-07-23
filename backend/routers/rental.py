from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from services.firebase import db
from sentence_transformers import SentenceTransformer
import numpy as np
from uuid import uuid4

router = APIRouter()

embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
def vectorize(text):
    return embedding_model.encode(text).tolist()

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

class RentalQuery(BaseModel):
    query: str
    farmerId: str

@router.post("/rental")
def rental_search(body: RentalQuery):
    try:
        # 1. Get all available listings
        listings_ref = db.collection('rental_listings')
        listings = [doc.to_dict() for doc in listings_ref.stream() if doc.to_dict().get('available', True)]
        # 2. Get my products (bought/sold)
        my_products_ref = db.collection('my_products')
        my_products = [doc.to_dict() for doc in my_products_ref.stream() if doc.to_dict().get('owner', {}).get('farmerId') == body.farmerId or doc.to_dict().get('sold_to') == body.farmerId]
        # 3. Get my active listings
        my_listings_ref = db.collection('my_listings')
        my_listings = [doc.to_dict() for doc in my_listings_ref.stream() if doc.to_dict().get('owner', {}).get('farmerId') == body.farmerId]
        # 4. Semantic search on listings
        query_vec = vectorize(body.query)
        scored = []
        for l in listings:
            emb = l.get('embedding')
            if emb:
                sim = cosine_similarity(query_vec, emb)
                scored.append((sim, l))
        scored.sort(reverse=True, key=lambda x: x[0])
        matches = [l for sim, l in scored[:10] if sim > 0.5]  # Top 10, sim threshold
        return {
            'matches': matches,
            'myProducts': my_products,
            'myListings': my_listings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/rental/activity")
def get_rental_activity(farmerId: str = Query(...)):
    """
    Returns the farmer's own bought/sold products and active listings.
    """
    try:
        my_products_ref = db.collection('my_products')
        my_products = [doc.to_dict() for doc in my_products_ref.stream() if doc.to_dict().get('owner', {}).get('farmerId') == farmerId or doc.to_dict().get('sold_to') == farmerId]
        my_listings_ref = db.collection('my_listings')
        my_listings = [doc.to_dict() for doc in my_listings_ref.stream() if doc.to_dict().get('owner', {}).get('farmerId') == farmerId]
        print(f"[DEBUG] /rental/activity for farmerId={farmerId}")
        print(f"  my_products count: {len(my_products)}; names: {[p.get('name') for p in my_products]}")
        print(f"  my_listings count: {len(my_listings)}; names: {[l.get('name') for l in my_listings]}")
        return {
            "myProducts": my_products,
            "myListings": my_listings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/rental/featured")
def get_rental_featured(farmerId: str = Query(...)):
    """
    Returns all available rental listings except the farmer's own.
    """
    try:
        listings_ref = db.collection('rental_listings')
        listings = [
            doc.to_dict()
            for doc in listings_ref.stream()
            if doc.to_dict().get('available', True) and doc.to_dict().get('owner', {}).get('farmerId') != farmerId
        ]
        print(f"[DEBUG] /rental/featured for farmerId={farmerId}")
        print(f"  featured count: {len(listings)}; names: {[l.get('name') for l in listings]}")
        return {"featured": listings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/rental/list")
def list_equipment(equipment: dict = Body(...)):
    """
    Add a new equipment listing to 'rental_listings'.
    """
    try:
        from datetime import datetime
        import random
        # Add embedding if not present
        if 'embedding' not in equipment:
            from sentence_transformers import SentenceTransformer
            embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            def vectorize(text):
                return embedding_model.encode(text).tolist()
            def build_embedding_text(listing):
                fields = [listing.get('name', ''), listing.get('description', ''), listing.get('owner', {}).get('name', ''), listing.get('location', {}).get('village', ''), str(listing.get('price', listing.get('price_per_day', ''))), listing.get('type', '')]
                return ' '.join([str(f) for f in fields if f])
            equipment['embedding'] = vectorize(build_embedding_text(equipment))
        equipment['createdAt'] = datetime.now().isoformat()
        doc_id = f"{equipment.get('owner', {}).get('farmerId', 'unknown')}_{random.randint(1000,9999)}"
        db.collection('rental_listings').document(doc_id).set(equipment)
        return {"message": "Equipment listed successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/rental/bookings")
def get_rental_bookings(farmerId: str = Query(...)):
    """
    Returns bookings for the given farmer.
    """
    try:
        bookings_ref = db.collection('rental_bookings')
        bookings = [doc.to_dict() for doc in bookings_ref.stream() if doc.to_dict().get('farmerId') == farmerId]
        return {"bookings": bookings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/rental/earnings")
def get_rental_earnings(farmerId: str = Query(...)):
    """
    Returns earnings summary for the given farmer.
    """
    try:
        earnings_ref = db.collection('rental_earnings')
        earnings = [doc.to_dict() for doc in earnings_ref.stream() if doc.to_dict().get('farmerId') == farmerId]
        return {"earnings": earnings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/rental/book")
def book_equipment(body: dict = Body(...)):
    """
    Book a rental equipment. Expects: equipmentId, farmerId, startDate, endDate, notes (optional)
    """
    try:
        equipment_id = body.get('equipmentId')
        farmer_id = body.get('farmerId')
        start_date = body.get('startDate')
        end_date = body.get('endDate')
        notes = body.get('notes', '')
        if not all([equipment_id, farmer_id, start_date, end_date]):
            raise HTTPException(status_code=400, detail="Missing required fields.")
        # Check equipment exists and is available
        equip_ref = db.collection('rental_listings').document(equipment_id)
        equip_doc = equip_ref.get()
        if not equip_doc.exists:
            raise HTTPException(status_code=404, detail="Equipment not found.")
        equip = equip_doc.to_dict()
        if not equip.get('available', True):
            raise HTTPException(status_code=400, detail="Equipment not available.")
        # Create booking
        booking_id = str(uuid4())
        booking = {
            'id': booking_id,
            'equipmentId': equipment_id,
            'equipmentName': equip.get('name'),
            'farmerId': farmer_id,
            'startDate': start_date,
            'endDate': end_date,
            'notes': notes,
            'status': 'confirmed',
            'price': equip.get('price_per_day'),
            'createdAt': __import__('datetime').datetime.now().isoformat()
        }
        db.collection('rental_bookings').document(booking_id).set(booking)
        # Optionally, mark equipment as unavailable (for exclusive bookings)
        # equip_ref.update({'available': False})
        return { 'message': 'Booking successful!', 'bookingId': booking_id }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}") 