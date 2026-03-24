"""
Comprehensive Indian Government Schemes Database for Farmers.
Deep-researched data covering Central + State schemes with:
- Full eligibility criteria
- Benefits & subsidies
- Required documents
- Application process
- Downloadable form URLs
- Official website links
"""

from datetime import datetime

# ──────────────────────────────────────────────────────────────────
# CENTRAL GOVERNMENT SCHEMES
# ──────────────────────────────────────────────────────────────────

CENTRAL_SCHEMES = [
    {
        "name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "short_name": "PM-KISAN",
        "description": "Direct income support of ₹6,000 per year to all land-holding farmer families across India, paid in 3 equal installments of ₹2,000 every 4 months directly to bank accounts.",
        "category": "income_support",
        "state": "All",
        "eligibility": [
            "All land-holding farmer families with cultivable land",
            "Small and marginal farmers (land up to 2 hectares)",
            "Institutional land-holders are excluded",
            "Farmer families holding constitutional posts are excluded",
            "Former/present Ministers, MPs, MLAs are excluded",
            "Income tax payers in last assessment year are excluded",
            "Professionals like doctors, engineers, lawyers, CAs earning above ₹10,000/month are excluded"
        ],
        "benefits": [
            "₹6,000 per year in 3 installments of ₹2,000",
            "Direct Bank Transfer (DBT)",
            "April-July: ₹2,000",
            "August-November: ₹2,000",
            "December-March: ₹2,000"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land ownership documents / Land records (Khatauni/Khasra)",
            "Bank account details (passbook copy)",
            "Mobile number linked with Aadhaar",
            "State/UT domicile certificate",
            "Self-declaration form"
        ],
        "application_process": [
            "Visit pmkisan.gov.in",
            "Click on 'New Farmer Registration'",
            "Enter Aadhaar number and captcha",
            "Fill in personal and land details",
            "Upload required documents",
            "Verify through OTP on registered mobile",
            "Or visit nearest CSC (Common Service Centre)"
        ],
        "application_url": "https://pmkisan.gov.in",
        "form_download_urls": [
            {"name": "PM-KISAN Registration Form", "url": "https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines.pdf"},
            {"name": "Self Declaration Form", "url": "https://pmkisan.gov.in/Documents/SelfDeclaration.pdf"}
        ],
        "helpline": "155261 / 011-24300606",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2019,
        "is_active": True,
        "amount_range": "₹6,000/year",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "father_name", "label": "Father's Name", "type": "text", "required": True, "hindi_label": "पिता का नाम"},
            {"field": "gender", "label": "Gender", "type": "select", "options": ["Male", "Female", "Other"], "required": True, "hindi_label": "लिंग"},
            {"field": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True, "hindi_label": "जन्म तिथि"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "bank_account_number", "label": "Bank Account Number", "type": "text", "required": True, "hindi_label": "बैंक खाता नंबर"},
            {"field": "ifsc_code", "label": "IFSC Code", "type": "text", "required": True, "hindi_label": "IFSC कोड"},
            {"field": "bank_name", "label": "Bank Name", "type": "text", "required": True, "hindi_label": "बैंक का नाम"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "sub_district", "label": "Sub-District/Taluka", "type": "text", "required": True, "hindi_label": "तहसील"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "land_area_hectares", "label": "Land Area (Hectares)", "type": "number", "required": True, "hindi_label": "भूमि क्षेत्र (हेक्टेयर)"},
            {"field": "khasra_number", "label": "Khasra/Survey Number", "type": "text", "required": True, "hindi_label": "खसरा/सर्वे नंबर"},
            {"field": "khatauni_number", "label": "Khatauni Number", "type": "text", "required": False, "hindi_label": "खतौनी नंबर"},
            {"field": "category", "label": "Category (SC/ST/OBC/General)", "type": "select", "options": ["General", "SC", "ST", "OBC"], "required": True, "hindi_label": "वर्ग"},
        ],
    },
    {
        "name": "PM Fasal Bima Yojana (PMFBY)",
        "short_name": "PMFBY",
        "description": "Comprehensive crop insurance scheme providing financial support to farmers suffering crop loss/damage due to unforeseen events like natural calamities, pests, and diseases.",
        "category": "insurance",
        "state": "All",
        "eligibility": [
            "All farmers growing notified crops in notified areas",
            "Loanee farmers (mandatory until 2020, now voluntary)",
            "Non-loanee farmers (voluntary)",
            "Sharecroppers and tenant farmers with land agreement",
            "Both individual and group of farmers"
        ],
        "benefits": [
            "Kharif crops: Premium 2% of sum insured",
            "Rabi crops: Premium 1.5% of sum insured",
            "Commercial/Horticultural crops: Premium 5% of sum insured",
            "Balance premium paid by Government (Centre:State = 50:50)",
            "No cap on government subsidy",
            "Full sum insured paid for prevented sowing/planting",
            "Localized calamity assessment",
            "Post-harvest losses covered for up to 14 days",
            "Use of technology (satellite imagery, drones) for quick assessment"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Bank account details (passbook copy)",
            "Land records (Khatauni/RoR/Land lease agreement)",
            "Sowing certificate from village officer (Patwari/Lekhpal)",
            "Crop details declaration",
            "Photo identity proof",
            "Latest premium receipt (if renewal)",
            "FIR/Panchanama (in case of claim)"
        ],
        "application_process": [
            "Visit pmfby.gov.in",
            "Register as a farmer",
            "Select crop, season, and area",
            "Pay premium (2% Kharif, 1.5% Rabi, 5% commercial)",
            "Upload documents",
            "Or apply through nearest bank branch",
            "Or through CSC centres",
            "Report crop loss within 72 hours"
        ],
        "application_url": "https://pmfby.gov.in",
        "form_download_urls": [
            {"name": "PMFBY Application Form", "url": "https://pmfby.gov.in/ext/enrolment-form"},
            {"name": "PMFBY Guidelines", "url": "https://pmfby.gov.in/pdf/Revised_Operational_Guidelines.pdf"},
            {"name": "Claim Form", "url": "https://pmfby.gov.in/ext/claim-form"}
        ],
        "helpline": "1800-180-1551 (Toll Free)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2016,
        "is_active": True,
        "amount_range": "Varies by crop and area",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "bank_account_number", "label": "Bank Account Number", "type": "text", "required": True, "hindi_label": "बैंक खाता नंबर"},
            {"field": "ifsc_code", "label": "IFSC Code", "type": "text", "required": True, "hindi_label": "IFSC कोड"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "crop_name", "label": "Crop Name", "type": "text", "required": True, "hindi_label": "फसल का नाम"},
            {"field": "crop_season", "label": "Season (Kharif/Rabi/Zaid)", "type": "select", "options": ["Kharif", "Rabi", "Zaid"], "required": True, "hindi_label": "सीजन"},
            {"field": "land_area_hectares", "label": "Area (Hectares)", "type": "number", "required": True, "hindi_label": "क्षेत्रफल (हेक्टेयर)"},
            {"field": "khasra_number", "label": "Khasra/Survey Number", "type": "text", "required": True, "hindi_label": "खसरा नंबर"},
            {"field": "sowing_date", "label": "Date of Sowing", "type": "date", "required": True, "hindi_label": "बुवाई की तारीख"},
            {"field": "farmer_type", "label": "Farmer Type", "type": "select", "options": ["Owner", "Tenant", "Sharecropper"], "required": True, "hindi_label": "किसान प्रकार"},
            {"field": "sum_insured", "label": "Sum Insured (₹)", "type": "number", "required": True, "hindi_label": "बीमा राशि"},
        ],
    },
    {
        "name": "Kisan Credit Card (KCC)",
        "short_name": "KCC",
        "description": "Credit facility for farmers to meet their agricultural and financial requirements including crop production, post-harvest expenses, farm maintenance, and consumption needs of farmer households at concessional interest rates.",
        "category": "credit",
        "state": "All",
        "eligibility": [
            "All farmers - individual or joint borrowers who are owner cultivators",
            "Tenant farmers, oral lessees, and sharecroppers",
            "Self-Help Groups (SHGs) or Joint Liability Groups (JLGs)",
            "Fishermen (for inland/marine fisheries)",
            "Animal husbandry farmers (dairy, poultry)",
            "PM-KISAN beneficiaries get priority"
        ],
        "benefits": [
            "Credit limit up to ₹3 lakh at 4% interest (with prompt repayment)",
            "Original interest rate 7%, with 3% interest subvention for ₹3 lakh limit",
            "Additional 3% promptness incentive (effective rate 4%)",
            "Coverage for crop production, post-harvest, farm maintenance",
            "Personal accident insurance cover of ₹50,000 (death) and ₹25,000 (disability)",
            "No collateral required up to ₹1.6 lakh",
            "One-time documentation, card valid for 5 years",
            "Flexible withdrawal from any bank branch/ATM"
        ],
        "required_documents": [
            "Application form (available at bank)",
            "Aadhaar Card",
            "PAN Card (for loans above ₹50,000)",
            "Land ownership documents (Khatauni, 7/12 extract, RoR)",
            "Passport-size photographs (2)",
            "Bank account details",
            "Affidavit for non-willful defaulter declaration",
            "Proof of crop cultivation (from Patwari/Revenue officer)",
            "For tenant: Lease agreement or certification from village officer"
        ],
        "application_process": [
            "Visit nearest bank branch (any commercial/cooperative/RRB bank)",
            "Collect KCC application form",
            "Fill form with land and crop details",
            "Submit documents for verification",
            "Bank processes and sanctions within 14 days",
            "Card and cheque book issued",
            "OR Apply online on bank website (SBI, PNB, etc.)",
            "OR Apply through PM-KISAN portal directly"
        ],
        "application_url": "https://pmkisan.gov.in/KCCForm.aspx",
        "form_download_urls": [
            {"name": "KCC Application Form (SBI)", "url": "https://www.sbi.co.in/documents/KCC_Application_Form.pdf"},
            {"name": "KCC Application Form (PNB)", "url": "https://www.pnbindia.in/KCC-Scheme.html"},
            {"name": "KCC Guidelines (RBI)", "url": "https://rbi.org.in/commonperson/English/Scripts/Notification.aspx?Id=208"},
            {"name": "PM-KISAN KCC Form", "url": "https://pmkisan.gov.in/KCCForm.aspx"}
        ],
        "helpline": "1800-425-3800 (NABARD), Bank customer care",
        "ministry": "Ministry of Finance / RBI / NABARD",
        "launched_year": 1998,
        "is_active": True,
        "amount_range": "Up to ₹3 lakh at 4% p.a.",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "father_name", "label": "Father's/Husband's Name", "type": "text", "required": True, "hindi_label": "पिता/पति का नाम"},
            {"field": "date_of_birth", "label": "Date of Birth", "type": "date", "required": True, "hindi_label": "जन्म तिथि"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "pan_number", "label": "PAN Number", "type": "text", "required": False, "hindi_label": "पैन नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "address", "label": "Residential Address", "type": "textarea", "required": True, "hindi_label": "पता"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "land_area_acres", "label": "Total Land Area (Acres)", "type": "number", "required": True, "hindi_label": "कुल भूमि (एकड़)"},
            {"field": "land_type", "label": "Land Type", "type": "select", "options": ["Irrigated", "Unirrigated", "Mixed"], "required": True, "hindi_label": "सिंचाई प्रकार"},
            {"field": "crops_grown", "label": "Crops Grown (comma-separated)", "type": "text", "required": True, "hindi_label": "उगाई जाने वाली फसलें"},
            {"field": "loan_amount_required", "label": "Loan Amount Required (₹)", "type": "number", "required": True, "hindi_label": "आवश्यक ऋण राशि"},
            {"field": "existing_loan", "label": "Any Existing Agricultural Loan", "type": "select", "options": ["Yes", "No"], "required": True, "hindi_label": "मौजूदा ऋण"},
            {"field": "bank_name", "label": "Preferred Bank", "type": "text", "required": True, "hindi_label": "बैंक का नाम"},
            {"field": "bank_account_number", "label": "Existing Account Number", "type": "text", "required": False, "hindi_label": "खाता नंबर"},
        ],
    },
    {
        "name": "PM-KUSUM (Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan)",
        "short_name": "PM-KUSUM",
        "description": "Solarization of agriculture with three components: A (Solar plants on barren land), B (Standalone solar pumps), C (Solarize existing grid-connected pumps). Aims to provide energy security and additional income to farmers.",
        "category": "subsidy",
        "state": "All",
        "eligibility": [
            "Component A: Individual farmers, FPOs, cooperatives, panchayats with barren/fallow land",
            "Component B: Individual farmers with borewell, open well, canal takeoff point",
            "Component C: Individual farmers with grid-connected pump sets",
            "Both small and large farmers eligible",
            "Land ownership proof required"
        ],
        "benefits": [
            "Component A: 25-500 KW solar plants, farmer sells power to DISCOM",
            "Component B: Standalone solar pumps 2-10 HP, 60% subsidy (30% Central + 30% State)",
            "Component C: Solarize grid pumps, sell surplus power, 60% subsidy",
            "Farmer's contribution: 40% (of which 30% can be bank loan)",
            "Saves electricity cost for irrigation",
            "Additional income from selling surplus power to grid"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land ownership documents",
            "Bank account details",
            "Passport-size photograph",
            "Current electricity connection details (for Component C)",
            "Borewell/well details (for Component B)",
            "NOC from Agriculture Department (where applicable)"
        ],
        "application_process": [
            "Visit pmkusum.mnre.gov.in",
            "Register and create account",
            "Select component (A/B/C)",
            "Fill in application details",
            "Upload documents",
            "Pay farmer's share",
            "Installation by empanelled vendor",
            "OR Apply through State Nodal Agency"
        ],
        "application_url": "https://pmkusum.mnre.gov.in",
        "form_download_urls": [
            {"name": "PM-KUSUM Application Form", "url": "https://pmkusum.mnre.gov.in/landing-page/downloads"},
            {"name": "Component B Guidelines", "url": "https://mnre.gov.in/solar/schemes"},
        ],
        "helpline": "011-2436 0707 (MNRE)",
        "ministry": "Ministry of New and Renewable Energy (MNRE)",
        "launched_year": 2019,
        "is_active": True,
        "amount_range": "60% subsidy on solar pumps",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "component", "label": "Component (A/B/C)", "type": "select", "options": ["A", "B", "C"], "required": True, "hindi_label": "घटक"},
            {"field": "pump_capacity_hp", "label": "Required Pump Capacity (HP)", "type": "select", "options": ["2", "3", "5", "7.5", "10"], "required": True, "hindi_label": "पंप क्षमता (HP)"},
            {"field": "water_source", "label": "Water Source", "type": "select", "options": ["Borewell", "Open Well", "Canal", "River", "Pond"], "required": True, "hindi_label": "पानी का स्रोत"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि क्षेत्र (एकड़)"},
            {"field": "existing_electricity_connection", "label": "Existing Electricity Connection", "type": "select", "options": ["Yes", "No"], "required": True, "hindi_label": "मौजूदा बिजली कनेक्शन"},
        ],
    },
    {
        "name": "Soil Health Card Scheme",
        "short_name": "SHC",
        "description": "Free soil testing and soil health card to every farmer every 2 years with crop-wise fertilizer recommendations based on soil nutrient status across 12 parameters.",
        "category": "soil_health",
        "state": "All",
        "eligibility": [
            "All farmers across India",
            "No land size restrictions",
            "No income criteria"
        ],
        "benefits": [
            "Free soil testing (12 parameters: pH, EC, OC, N, P, K, S, Zn, Fe, Cu, Mn, B)",
            "Crop-wise fertilizer recommendations",
            "Soil Health Card issued every 2 years",
            "Helps in balanced and judicious use of fertilizers",
            "Reduces input cost and increases productivity"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land details (khasra/survey number)",
            "Mobile number"
        ],
        "application_process": [
            "Visit soilhealth.dac.gov.in",
            "Register as a farmer",
            "Enter land details",
            "Soil sample collected by government officials",
            "Results available online and via card",
            "Or visit nearest Krishi Vigyan Kendra (KVK)",
            "Or contact Block Agriculture Officer"
        ],
        "application_url": "https://soilhealth.dac.gov.in",
        "form_download_urls": [
            {"name": "Soil Health Card Sample", "url": "https://soilhealth.dac.gov.in/Content/SoilHealthCardFormat.pdf"}
        ],
        "helpline": "1800-180-1551",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2015,
        "is_active": True,
        "amount_range": "Free service",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "khasra_number", "label": "Khasra/Survey Number", "type": "text", "required": True, "hindi_label": "खसरा नंबर"},
            {"field": "land_area_hectares", "label": "Land Area (Hectares)", "type": "number", "required": True, "hindi_label": "भूमि (हेक्टेयर)"},
            {"field": "soil_type", "label": "Known Soil Type (if any)", "type": "text", "required": False, "hindi_label": "मिट्टी का प्रकार"},
            {"field": "irrigation_source", "label": "Irrigation Source", "type": "select", "options": ["Canal", "Tube Well", "Well", "Rain-fed", "Drip", "Sprinkler"], "required": True, "hindi_label": "सिंचाई स्रोत"},
            {"field": "previous_crop", "label": "Previous Crop Grown", "type": "text", "required": False, "hindi_label": "पिछली फसल"},
        ],
    },
    {
        "name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "short_name": "PKVY",
        "description": "Promotes organic farming in clusters of 20 hectares (50 acres). Farmers get ₹50,000 per hectare over 3 years for organic inputs, vermicompost, botanical extracts, certification.",
        "category": "organic_farming",
        "state": "All",
        "eligibility": [
            "Group of farmers forming a cluster of minimum 20 hectares",
            "50 or more farmers per cluster",
            "Each farmer's contiguous land in cluster",
            "No chemical fertilizers/pesticides usage on organic land",
            "Commitment to organic farming for minimum 3 years"
        ],
        "benefits": [
            "₹50,000 per hectare over 3 years",
            "₹31,000 for organic inputs procurement",
            "₹8,800 for value addition and marketing",
            "₹5,000 for PGS certification",
            "Free organic farming training",
            "Market linkage support",
            "Packaging and branding support"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land ownership documents",
            "Farmer group/cluster registration",
            "Bank account details",
            "Commitment letter for 3-year organic farming",
            "Previous crop history"
        ],
        "application_process": [
            "Contact District Agriculture Officer",
            "Form a cluster of 50+ farmers with 20+ hectares",
            "Register cluster with Regional Council",
            "Submit organic farming plan",
            "Get inspection and PGS certification",
            "Receive training from certified trainers",
            "Or visit pgsindia-ncof.gov.in to register"
        ],
        "application_url": "https://pgsindia-ncof.gov.in",
        "form_download_urls": [
            {"name": "PKVY Cluster Registration Form", "url": "https://pgsindia-ncof.gov.in/PGS_manual.html"},
            {"name": "PGS India Guidelines", "url": "https://pgsindia-ncof.gov.in/PDF/PGS-India-Manual.pdf"},
        ],
        "helpline": "011-23382651 (NCOF)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2015,
        "is_active": True,
        "amount_range": "₹50,000/hectare over 3 years",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "cluster_name", "label": "Cluster Name", "type": "text", "required": True, "hindi_label": "क्लस्टर का नाम"},
            {"field": "cluster_size_farmers", "label": "Number of Farmers in Cluster", "type": "number", "required": True, "hindi_label": "क्लस्टर में किसानों की संख्या"},
            {"field": "total_area_hectares", "label": "Total Cluster Area (Hectares)", "type": "number", "required": True, "hindi_label": "कुल क्षेत्रफल (हेक्टेयर)"},
            {"field": "current_farming_type", "label": "Current Farming Type", "type": "select", "options": ["Chemical", "Mixed", "Traditional", "Already Organic"], "required": True, "hindi_label": "वर्तमान खेती प्रकार"},
        ],
    },
    {
        "name": "eNAM (National Agriculture Market)",
        "short_name": "eNAM",
        "description": "Pan-India electronic trading portal linking 1,361+ mandis across 23 States/UTs for unified national market for agricultural commodities. Farmers get transparent pricing and direct national/international buyer access.",
        "category": "marketing",
        "state": "All",
        "eligibility": [
            "All farmers, traders, buyers, FPOs, commission agents",
            "Must register on eNAM portal",
            "Valid ID and bank account required",
            "Both individual farmers and groups (FPOs) eligible"
        ],
        "benefits": [
            "Transparent price discovery",
            "Access to multiple mandis across India",
            "Competitive bidding by traders",
            "Online payment directly to bank account",
            "Quality assaying before sale",
            "Reduced mandi fees and commissions",
            "Price information in real-time",
            "Warehouse-based trading without physical presence"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Bank account details",
            "Land ownership documents",
            "Mandi registration (from nearest APMC/regulated mandi)",
            "Mobile number",
            "Passport-size photograph",
            "Commodity details"
        ],
        "application_process": [
            "Visit enam.gov.in",
            "Click on 'Farmer Registration'",
            "Select state and APMC mandi",
            "Fill in personal and bank details",
            "Upload Aadhaar and land documents",
            "Get registered and start trading",
            "OR visit nearest eNAM-linked mandi physically"
        ],
        "application_url": "https://enam.gov.in",
        "form_download_urls": [
            {"name": "eNAM Farmer Registration", "url": "https://enam.gov.in/web/stakeholder-registration/farmer"},
            {"name": "eNAM User Manual", "url": "https://enam.gov.in/web/resources/user-manual"},
        ],
        "helpline": "1800-270-0224 (Toll Free)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2016,
        "is_active": True,
        "amount_range": "Market-based pricing",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "bank_account_number", "label": "Bank Account Number", "type": "text", "required": True, "hindi_label": "बैंक खाता नंबर"},
            {"field": "ifsc_code", "label": "IFSC Code", "type": "text", "required": True, "hindi_label": "IFSC कोड"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "nearest_mandi", "label": "Nearest eNAM Mandi", "type": "text", "required": True, "hindi_label": "निकटतम eNAM मंडी"},
            {"field": "primary_commodity", "label": "Primary Commodity to Sell", "type": "text", "required": True, "hindi_label": "प्राथमिक वस्तु"},
        ],
    },
    {
        "name": "Pradhan Mantri Krishi Sinchai Yojana (PMKSY) - Per Drop More Crop",
        "short_name": "PMKSY",
        "description": "Micro-irrigation scheme providing 55% subsidy to small/marginal farmers and 45% to other farmers for drip and sprinkler irrigation systems to improve water use efficiency.",
        "category": "irrigation",
        "state": "All",
        "eligibility": [
            "All farmers (small, marginal, and other categories)",
            "Land ownership or lease documents required",
            "Both Kharif and Rabi crop growers",
            "Priority to drought-prone and water-scarce areas"
        ],
        "benefits": [
            "Small/marginal farmers: 55% subsidy on micro-irrigation systems",
            "Other farmers: 45% subsidy",
            "Drip irrigation system fully covered",
            "Sprinkler irrigation system covered",
            "Water use efficiency improvement of 40-50%",
            "Crop productivity increase of 20-30%",
            "Fertigation support included"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land ownership documents",
            "Bank account details",
            "Caste certificate (for SC/ST subsidy enhancement)",
            "Quotation from empanelled micro-irrigation firm",
            "Passport-size photos (2)",
            "Farmer ID / Kisan ID"
        ],
        "application_process": [
            "Visit pmksy.gov.in",
            "Contact District Agriculture/Horticulture Office",
            "Submit application with land and crop details",
            "Get technical survey of land by officials",
            "Select empanelled micro-irrigation company",
            "Get installation done",
            "Subsidy credited to bank account after verification"
        ],
        "application_url": "https://pmksy.gov.in",
        "form_download_urls": [
            {"name": "PMKSY Application Form", "url": "https://pmksy.gov.in/microirrigation/Archive/GuidelinesforMicroIrrigationFund.pdf"},
        ],
        "helpline": "1800-180-1551",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2015,
        "is_active": True,
        "amount_range": "45-55% subsidy",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि (एकड़)"},
            {"field": "irrigation_type_needed", "label": "Irrigation Type Needed", "type": "select", "options": ["Drip", "Sprinkler", "Both"], "required": True, "hindi_label": "सिंचाई प्रकार"},
            {"field": "crop_grown", "label": "Crops to be Irrigated", "type": "text", "required": True, "hindi_label": "सिंचित फसलें"},
            {"field": "farmer_category", "label": "Farmer Category", "type": "select", "options": ["Small/Marginal (< 2 hectares)", "Other"], "required": True, "hindi_label": "किसान श्रेणी"},
            {"field": "current_irrigation", "label": "Current Irrigation Method", "type": "select", "options": ["Rain-fed", "Flood/Surface", "Tube Well", "Canal"], "required": True, "hindi_label": "वर्तमान सिंचाई"},
            {"field": "water_source", "label": "Water Source", "type": "select", "options": ["Borewell", "Open Well", "Canal", "Pond", "River"], "required": True, "hindi_label": "पानी का स्रोत"},
        ],
    },
    {
        "name": "National Mission on Agricultural Mechanization (Sub-Mission on Agricultural Mechanization - SMAM)",
        "short_name": "SMAM",
        "description": "Subsidies on purchase of agricultural machinery and equipment including tractors, rotavators, combine harvesters, sprayers etc. for all farmers with higher subsidy for SC/ST/Women/NE farmers.",
        "category": "mechanization",
        "state": "All",
        "eligibility": [
            "All categories of farmers",
            "Higher subsidy rate for SC/ST/Small & Marginal/Women/NE-state farmers",
            "Individual farmers and farmer groups/FPOs",
            "Custom Hiring Centres (CHC) operators"
        ],
        "benefits": [
            "40-50% subsidy on tractors (up to 8 lakh)",
            "50-80% subsidy on farm implements (SC/ST/NE: 80%)",
            "Establishment of Custom Hiring Centres (CHC)",
            "Farm Machinery Banks at village level",
            "Hi-tech hubs for testing and demonstration",
            "Training on modern farm machinery"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land ownership documents",
            "Bank account details",
            "Caste certificate (for SC/ST category)",
            "Quotation from authorized dealer",
            "Self-declaration of not receiving similar benefit before",
            "Passport-size photos",
            "For FPOs: Registration certificate and list of members"
        ],
        "application_process": [
            "Visit agrimachinery.nic.in",
            "Register as a farmer",
            "Browse available subsidized machinery",
            "Apply for subsidy on selected equipment",
            "Upload required documents",
            "Get verification from District Agriculture Officer",
            "Purchase equipment from authorized dealer",
            "Submit invoice for subsidy reimbursement"
        ],
        "application_url": "https://agrimachinery.nic.in",
        "form_download_urls": [
            {"name": "SMAM Online Application", "url": "https://agrimachinery.nic.in/Farmer/DFarmerRegistration"},
            {"name": "SMAM Guidelines", "url": "https://agrimachinery.nic.in/Files/Guidelines/SMAMGuidelines.pdf"},
        ],
        "helpline": "011-23382651",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2014,
        "is_active": True,
        "amount_range": "40-80% subsidy on farm equipment",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "category", "label": "Category", "type": "select", "options": ["General", "SC", "ST", "OBC", "Women"], "required": True, "hindi_label": "वर्ग"},
            {"field": "farmer_type", "label": "Farmer Type", "type": "select", "options": ["Small/Marginal", "Medium", "Large"], "required": True, "hindi_label": "किसान प्रकार"},
            {"field": "equipment_needed", "label": "Equipment/Machinery Required", "type": "text", "required": True, "hindi_label": "आवश्यक उपकरण"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि (एकड़)"},
            {"field": "estimated_cost", "label": "Estimated Cost of Equipment (₹)", "type": "number", "required": True, "hindi_label": "अनुमानित लागत"},
        ],
    },
    {
        "name": "National Mission on Sustainable Agriculture (NMSA) - Rainfed Area Development",
        "short_name": "NMSA-RAD",
        "description": "Integrated farming system approach for rainfed areas with focus on soil health, water conservation, crop diversification, and livestock integration.",
        "category": "sustainable_farming",
        "state": "All",
        "eligibility": [
            "Farmers in rainfed/dryland areas",
            "Both individual and community participation",
            "States with low irrigation coverage prioritized"
        ],
        "benefits": [
            "Farm pond construction subsidy",
            "Vermicompost unit: ₹60,000 subsidy",
            "Water harvesting structure: ₹75,000-1.5 lakh",
            "Integrated farming system models",
            "Agroforestry support",
            "Crop diversification assistance"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Land ownership documents",
            "Bank account details",
            "Village certificate from Sarpanch"
        ],
        "application_process": [
            "Contact District Agriculture Office",
            "Apply through State Agriculture Department",
            "Submit land and crop details",
            "Get area classification verified"
        ],
        "application_url": "https://nmsa.dac.gov.in",
        "form_download_urls": [
            {"name": "NMSA Guidelines", "url": "https://nmsa.dac.gov.in/pdfDoc/NMSA_Guidelines.pdf"},
        ],
        "helpline": "011-23388444",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2014,
        "is_active": True,
        "amount_range": "₹60,000-₹1.5 lakh per component",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "land_area_hectares", "label": "Land Area (Hectares)", "type": "number", "required": True, "hindi_label": "भूमि (हेक्टेयर)"},
            {"field": "rainfed_area", "label": "Is Area Rainfed?", "type": "select", "options": ["Yes", "No", "Partially"], "required": True, "hindi_label": "क्या बारानी क्षेत्र है?"},
            {"field": "component_applied", "label": "Component Applied For", "type": "select", "options": ["Farm Pond", "Vermicompost Unit", "Water Harvesting", "Agroforestry", "Integrated Farming"], "required": True, "hindi_label": "आवेदित घटक"},
        ],
    },
    {
        "name": "Rashtriya Krishi Vikas Yojana (RKVY-RAFTAAR)",
        "short_name": "RKVY",
        "description": "Incentivizing states for agriculture growth with agri-infrastructure, value addition, and allied sector projects. Provides grants for agri-startups, FPOs, and farmer innovation.",
        "category": "development",
        "state": "All",
        "eligibility": [
            "State governments for infrastructure projects",
            "Agri-startups and entrepreneurs",
            "Farmer Producer Organizations (FPOs)",
            "Individual innovative farmers"
        ],
        "benefits": [
            "Agri-startup: Up to ₹25 lakh grant",
            "Innovation grants for farmers",
            "Agri-infrastructure development",
            "2-month free incubation for startups",
            "Mentoring and handholding support"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Project proposal/Detailed Project Report (DPR)",
            "Business plan (for startups)",
            "FPO registration certificate",
            "Bank account details"
        ],
        "application_process": [
            "Visit rkvy.nic.in",
            "Submit project proposal through state agriculture department",
            "For startups: Apply to RKVY-RAFTAAR Innovation & Agri-entrepreneurship",
            "Selection through State-Level Committee"
        ],
        "application_url": "https://rkvy.nic.in",
        "form_download_urls": [
            {"name": "RKVY Guidelines", "url": "https://rkvy.nic.in/static/download/pdf/RKVY-RAFTAAR-Guidelines.pdf"},
        ],
        "helpline": "011-23383370",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2007,
        "is_active": True,
        "amount_range": "Up to ₹25 lakh for startups",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name / Organization Name", "type": "text", "required": True, "hindi_label": "नाम / संगठन"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "project_title", "label": "Project Title", "type": "text", "required": True, "hindi_label": "परियोजना शीर्षक"},
            {"field": "project_cost", "label": "Estimated Project Cost (₹)", "type": "number", "required": True, "hindi_label": "अनुमानित लागत"},
            {"field": "applicant_type", "label": "Applicant Type", "type": "select", "options": ["Individual Farmer", "FPO", "Startup", "Cooperative"], "required": True, "hindi_label": "आवेदक प्रकार"},
        ],
    },
    {
        "name": "National Beekeeping & Honey Mission (NBHM)",
        "short_name": "NBHM",
        "description": "Promotes scientific beekeeping for pollination and honey production. Provides subsidy on bee colonies, honey processing equipment, and training.",
        "category": "allied_sector",
        "state": "All",
        "eligibility": [
            "All farmers, including landless",
            "Self-Help Groups (SHGs)",
            "Farmer Producer Organizations (FPOs)",
            "Beekeeping cooperatives",
            "SC/ST and women get priority"
        ],
        "benefits": [
            "50 bee colonies with equipment: ₹2 lakh subsidy (SC/ST/Women: 80%)",
            "Honey processing unit: Up to ₹10 lakh subsidy",
            "Bee breeding centre support",
            "Free training on scientific beekeeping",
            "Marketing and quality testing support"
        ],
        "required_documents": [
            "Aadhaar Card",
            "Bank account details",
            "Caste certificate (for enhanced subsidy)",
            "SHG/FPO registration (if applicable)",
            "Training certificate from recognized institute"
        ],
        "application_process": [
            "Contact State Horticulture/Agriculture Department",
            "Apply through NBHM portal",
            "Get training from recognized beekeeping centre",
            "Submit project proposal with quotes"
        ],
        "application_url": "https://nbb.gov.in",
        "form_download_urls": [
            {"name": "NBHM Application Form", "url": "https://nbb.gov.in/NBHM.html"},
        ],
        "helpline": "011-26107380 (NBB)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2020,
        "is_active": True,
        "amount_range": "50-80% subsidy on bee colonies",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "applicant_type", "label": "Applicant Type", "type": "select", "options": ["Individual", "SHG", "FPO", "Cooperative"], "required": True, "hindi_label": "आवेदक प्रकार"},
            {"field": "number_of_colonies", "label": "Number of Bee Colonies Required", "type": "number", "required": True, "hindi_label": "मधुमक्खी कालोनियों की संख्या"},
            {"field": "experience_years", "label": "Beekeeping Experience (Years)", "type": "number", "required": False, "hindi_label": "अनुभव (वर्ष)"},
        ],
    },
    {
        "name": "Pradhan Mantri Matsya Sampada Yojana (PMMSY)",
        "short_name": "PMMSY",
        "description": "₹20,050 crore scheme for fisheries development, Blue Revolution. Covers inland fisheries, aquaculture, mariculture with 40-60% subsidy.",
        "category": "fisheries",
        "state": "All",
        "eligibility": [
            "Fishers, fish farmers, fish workers",
            "SHGs, JLGs in fisheries sector",
            "FPOs, cooperatives, companies",
            "SC/ST/Women get enhanced subsidy (60%)",
            "General category: 40% subsidy"
        ],
        "benefits": [
            "40-60% subsidy on fish pond construction",
            "Biofloc/RAS unit support",
            "Fish feed mills support",
            "Cold storage and ice plant subsidy",
            "Insurance coverage for fish farmers",
            "Kisan Credit Card extended to fishers"
        ],
        "required_documents": [
            "Aadhaar Card", "Bank account details", "Land/water body documents",
            "Caste certificate (for SC/ST)", "Project proposal",
            "Fisher ID card (if applicable)"
        ],
        "application_process": [
            "Visit pmmsy.dof.gov.in",
            "Apply online through state fisheries department",
            "Submit project proposal and documents"
        ],
        "application_url": "https://pmmsy.dof.gov.in",
        "form_download_urls": [
            {"name": "PMMSY Application", "url": "https://pmmsy.dof.gov.in/apply"},
        ],
        "helpline": "1800-425-1660",
        "ministry": "Ministry of Fisheries, Animal Husbandry & Dairying",
        "launched_year": 2020,
        "is_active": True,
        "amount_range": "40-60% subsidy",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "fishery_type", "label": "Type of Fishery", "type": "select", "options": ["Pond Culture", "Cage Culture", "Biofloc/RAS", "Ornamental", "Mariculture"], "required": True, "hindi_label": "मत्स्य प्रकार"},
            {"field": "water_body_area", "label": "Water Body Area (Hectares)", "type": "number", "required": True, "hindi_label": "जल क्षेत्र (हेक्टेयर)"},
            {"field": "category", "label": "Category", "type": "select", "options": ["General", "SC", "ST", "Women"], "required": True, "hindi_label": "वर्ग"},
        ],
    },
    {
        "name": "National Livestock Mission (NLM)",
        "short_name": "NLM",
        "description": "Development of livestock sector including poultry, goat, sheep, pig, and rabbit farming. Provides subsidy for breed improvement, feed, health, and infrastructure.",
        "category": "animal_husbandry",
        "state": "All",
        "eligibility": [
            "Individual farmers (below poverty line get priority)",
            "SHGs, JLGs, FPOs",
            "Entrepreneurs in livestock sector",
            "SC/ST/Women get enhanced subsidy"
        ],
        "benefits": [
            "Poultry venture: Up to ₹9 lakh subsidy for BPL/SC/ST",
            "Goat/Sheep unit (40+2): Subsidy up to 50%",
            "Feed processing plant: 50% subsidy",
            "Breed improvement programs",
            "Livestock insurance premium support",
            "Male buffalo rearing: ₹3.6 lakh subsidy"
        ],
        "required_documents": [
            "Aadhaar Card", "Bank account details", "BPL card (if applicable)",
            "Caste certificate (SC/ST)", "Project proposal", "Land documents"
        ],
        "application_process": [
            "Visit nlm.udyamimitra.in",
            "Apply through District Animal Husbandry Officer",
            "Submit project report and documents"
        ],
        "application_url": "https://nlm.udyamimitra.in",
        "form_download_urls": [
            {"name": "NLM Application Form", "url": "https://dahd.nic.in/related-links/national-livestock-mission"},
        ],
        "helpline": "1800-180-1551",
        "ministry": "Ministry of Fisheries, Animal Husbandry & Dairying",
        "launched_year": 2014,
        "is_active": True,
        "amount_range": "25-50% subsidy",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "livestock_type", "label": "Livestock Type", "type": "select", "options": ["Poultry", "Goat", "Sheep", "Pig", "Rabbit", "Buffalo", "Other"], "required": True, "hindi_label": "पशुधन प्रकार"},
            {"field": "number_of_animals", "label": "Number of Animals", "type": "number", "required": True, "hindi_label": "पशुओं की संख्या"},
            {"field": "category", "label": "Category", "type": "select", "options": ["General", "SC", "ST", "BPL", "Women"], "required": True, "hindi_label": "वर्ग"},
            {"field": "existing_experience", "label": "Existing Experience (Years)", "type": "number", "required": False, "hindi_label": "अनुभव (वर्ष)"},
        ],
    },
    {
        "name": "Agriculture Infrastructure Fund (AIF)",
        "short_name": "AIF",
        "description": "₹1 lakh crore financing facility for post-harvest management, community farming assets, and agri-value chain infrastructure with 3% interest subvention and credit guarantee.",
        "category": "infrastructure",
        "state": "All",
        "eligibility": [
            "Primary Agricultural Credit Societies (PACS)",
            "Farmer Producer Organizations (FPOs)",
            "Agri-entrepreneurs",
            "Startups",
            "Central/State agencies"
        ],
        "benefits": [
            "3% interest subvention on loans up to ₹2 crore",
            "Credit guarantee coverage through CGTMSE",
            "Moratorium of 6 months to 2 years",
            "Loan tenure: Up to 10 years",
            "Cold storage, warehouse, grading/sorting facilities",
            "Pack house, ripening chamber support"
        ],
        "required_documents": [
            "Entity registration documents", "Project report/DPR",
            "Bank account details", "Land documents for project site",
            "GST registration (if applicable)", "Audited financials"
        ],
        "application_process": [
            "Visit agriinfra.dac.gov.in",
            "Apply through lending bank",
            "Submit DPR and documents",
            "Bank sanctions loan with 3% interest subvention"
        ],
        "application_url": "https://agriinfra.dac.gov.in",
        "form_download_urls": [
            {"name": "AIF Application", "url": "https://agriinfra.dac.gov.in"},
        ],
        "helpline": "011-23070780",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2020,
        "is_active": True,
        "amount_range": "3% interest subvention on up to ₹2 crore",
        "form_fields": [
            {"field": "applicant_name", "label": "Applicant Name / Organization", "type": "text", "required": True, "hindi_label": "आवेदक / संगठन"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "project_type", "label": "Project Type", "type": "select", "options": ["Cold Storage", "Warehouse", "Pack House", "Grading/Sorting", "Ripening Chamber", "Other"], "required": True, "hindi_label": "परियोजना प्रकार"},
            {"field": "project_cost", "label": "Project Cost (₹)", "type": "number", "required": True, "hindi_label": "परियोजना लागत"},
            {"field": "loan_amount", "label": "Loan Amount Required (₹)", "type": "number", "required": True, "hindi_label": "ऋण राशि"},
        ],
    },
    {
        "name": "Dairy Entrepreneurship Development Scheme (DEDS) / National Programme on Dairy Development (NPDD)",
        "short_name": "DEDS/NPDD",
        "description": "Financial assistance for setting up modern dairy farms, milk processing units, and dairy product manufacturing. 25-33% subsidy on project cost.",
        "category": "dairy",
        "state": "All",
        "eligibility": [
            "Farmers, individual entrepreneurs",
            "SHGs, dairy cooperatives",
            "Companies, FPOs",
            "SC/ST/Women: Enhanced subsidy"
        ],
        "benefits": [
            "Small dairy farm (10 cows/buffaloes): 25% subsidy (33% for SC/ST)",
            "Milk testing equipment: 25-33% subsidy",
            "Bulk milk cooling unit: Up to ₹3.8 lakh subsidy",
            "Dairy parlour: Up to ₹1.8 lakh subsidy",
            "Milking machines: 25-33% subsidy"
        ],
        "required_documents": [
            "Aadhaar Card", "Bank account details", "Caste certificate (if applicable)",
            "Land documents", "Project report", "Experience certificate (if any)"
        ],
        "application_process": [
            "Apply through NABARD website or district office",
            "Submit project report to bank",
            "Get loan sanctioned with subsidy"
        ],
        "application_url": "https://www.nabard.org/content.aspx?id=591",
        "form_download_urls": [
            {"name": "DEDS Guidelines", "url": "https://dahd.nic.in/related-links/dairy-entrepreneurship-development-scheme"},
        ],
        "helpline": "1800-425-3800 (NABARD)",
        "ministry": "Ministry of Fisheries, Animal Husbandry & Dairying",
        "launched_year": 2010,
        "is_active": True,
        "amount_range": "25-33% subsidy",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "dairy_unit_type", "label": "Dairy Unit Type", "type": "select", "options": ["Small Dairy (2-10 animals)", "Dairy Farm (10+ animals)", "Milk Processing", "Dairy Parlour", "Bulk Cooling"], "required": True, "hindi_label": "डेयरी इकाई प्रकार"},
            {"field": "number_of_animals", "label": "Number of Animals", "type": "number", "required": True, "hindi_label": "पशुओं की संख्या"},
            {"field": "breed_type", "label": "Breed Type", "type": "text", "required": True, "hindi_label": "नस्ल"},
            {"field": "project_cost", "label": "Project Cost (₹)", "type": "number", "required": True, "hindi_label": "परियोजना लागत"},
            {"field": "category", "label": "Category", "type": "select", "options": ["General", "SC", "ST", "Women"], "required": True, "hindi_label": "वर्ग"},
        ],
    },
    {
        "name": "Formation & Promotion of 10,000 FPOs",
        "short_name": "FPO Scheme",
        "description": "Central government scheme to form 10,000 new Farmer Producer Organizations by 2027-28. Each FPO gets ₹18 lakh equity grant + ₹15 lakh/FPO credit guarantee.",
        "category": "farmer_organization",
        "state": "All",
        "eligibility": [
            "Minimum 300 farmer members in plains, 100 in NE/hilly",
            "Registered as Company/Cooperative/Society",
            "One commodit/produce focus per FPO",
            "Cluster-based approach"
        ],
        "benefits": [
            "₹18 lakh equity grant per FPO (over 3 years)",
            "₹15 lakh credit guarantee per FPO through SFAC",
            "5-year handholding support from implementing agencies",
            "Training and capacity building",
            "Market linkage support",
            "IT and infrastructure support"
        ],
        "required_documents": [
            "FPO registration certificate",
            "Members list with Aadhaar",
            "Business plan",
            "Bank account details",
            "Audit reports (for existing FPOs)"
        ],
        "application_process": [
            "Contact implementing agency (NABARD/SFAC/State agencies)",
            "Form farmer group with 300+ members",
            "Register FPO as company/cooperative",
            "Submit business plan",
            "Get linked with cluster-specific commodity"
        ],
        "application_url": "https://enam.gov.in/web/FPO",
        "form_download_urls": [
            {"name": "FPO Formation Guidelines", "url": "https://enam.gov.in/web/resources/guidelines"},
        ],
        "helpline": "011-26490419 (SFAC)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2020,
        "is_active": True,
        "amount_range": "₹18 lakh equity + ₹15 lakh credit guarantee per FPO",
        "form_fields": [
            {"field": "fpo_name", "label": "FPO Name", "type": "text", "required": True, "hindi_label": "FPO का नाम"},
            {"field": "contact_person", "label": "Contact Person Name", "type": "text", "required": True, "hindi_label": "संपर्क व्यक्ति"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "number_of_members", "label": "Number of Members", "type": "number", "required": True, "hindi_label": "सदस्य संख्या"},
            {"field": "primary_commodity", "label": "Primary Commodity", "type": "text", "required": True, "hindi_label": "प्राथमिक वस्तु"},
            {"field": "registration_type", "label": "Registration Type", "type": "select", "options": ["Producer Company", "Cooperative Society", "Section 8 Company"], "required": True, "hindi_label": "पंजीकरण प्रकार"},
        ],
    },
    {
        "name": "Namo Drone Didi Scheme",
        "short_name": "Drone Didi",
        "description": "Providing drones to 15,000 women SHGs for agricultural spraying services. 80% subsidy on drone cost. SHGs earn ₹1 lakh/year as service providers.",
        "category": "technology",
        "state": "All",
        "eligibility": [
            "Women Self-Help Groups (SHGs)",
            "NRLM/DAY-NRLM member SHGs",
            "Village Organization (VO) endorsement required",
            "SHG should be active for minimum 1 year"
        ],
        "benefits": [
            "80% Central subsidy on agricultural drone",
            "Free training on drone operation (15-day course)",
            "RPTO (Remote Pilot Training Organization) certification",
            "Estimated income: ₹1 lakh/year from spraying services",
            "Maintenance support for 2 years"
        ],
        "required_documents": [
            "SHG registration certificate", "Member list with Aadhaar",
            "Bank account details of SHG", "VO endorsement letter",
            "NRLM/DAY-NRLM membership proof"
        ],
        "application_process": [
            "Contact Block/District NRLM office",
            "Get VO endorsement",
            "Apply through state rural livelihood mission",
            "Attend drone pilot training",
            "Receive drone after training completion"
        ],
        "application_url": "https://nrlm.gov.in",
        "form_download_urls": [
            {"name": "Drone Didi Guidelines", "url": "https://nrlm.gov.in/outerReportAction.do?methodName=showIndex"},
        ],
        "helpline": "011-23461708 (NRLM)",
        "ministry": "Ministry of Rural Development",
        "launched_year": 2023,
        "is_active": True,
        "amount_range": "80% subsidy on drone (₹8-10 lakh drone)",
        "form_fields": [
            {"field": "shg_name", "label": "SHG Name", "type": "text", "required": True, "hindi_label": "SHG का नाम"},
            {"field": "contact_person", "label": "Contact Person", "type": "text", "required": True, "hindi_label": "संपर्क व्यक्ति"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "block", "label": "Block", "type": "text", "required": True, "hindi_label": "ब्लॉक"},
            {"field": "shg_members_count", "label": "Number of SHG Members", "type": "number", "required": True, "hindi_label": "SHG सदस्य संख्या"},
            {"field": "nrlm_registration", "label": "NRLM Registration Number", "type": "text", "required": True, "hindi_label": "NRLM पंजीकरण नंबर"},
        ],
    },
    {
        "name": "Agri-Clinics and Agri-Business Centres (ACABC)",
        "short_name": "ACABC",
        "description": "Supports agriculture graduates to setup agri-clinics providing expert services to farmers. 44% subsidy (36% for general) on project cost up to ₹20 lakh.",
        "category": "agri_business",
        "state": "All",
        "eligibility": [
            "Agriculture graduates (B.Sc Agriculture, Horticulture, Animal Husbandry, etc.)",
            "Diploma holders in agriculture",
            "Intermediate in Agriculture with experience",
            "Group of graduates can apply jointly"
        ],
        "benefits": [
            "44% subsidy for SC/ST/Women/NE (36% for General) on bank loan",
            "Free 60-day training (residential)",
            "Training stipend: ₹1,000/month",
            "Loan up to ₹20 lakh for individual, ₹1 crore for group",
            "Handholding support for 2 years after setup"
        ],
        "required_documents": [
            "Educational certificates (degree/diploma)",
            "Aadhaar Card", "Bank account details",
            "Project proposal", "Training completion certificate"
        ],
        "application_process": [
            "Visit acabcmis.gov.in",
            "Register and attend 60-day training at MANAGE/SAMETI",
            "Prepare detailed project report",
            "Apply for bank loan with subsidy",
            "Start agri-clinic after loan sanction"
        ],
        "application_url": "https://acabcmis.gov.in",
        "form_download_urls": [
            {"name": "ACABC Application", "url": "https://acabcmis.gov.in/TraineeRegistration.aspx"},
        ],
        "helpline": "040-24015326 (MANAGE)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2002,
        "is_active": True,
        "amount_range": "36-44% subsidy up to ₹20 lakh",
        "form_fields": [
            {"field": "applicant_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "qualification", "label": "Qualification", "type": "text", "required": True, "hindi_label": "शैक्षणिक योग्यता"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "business_type", "label": "Business Type", "type": "select", "options": ["Agri-Clinic", "Agri-Business Centre", "Both"], "required": True, "hindi_label": "व्यवसाय प्रकार"},
            {"field": "project_cost", "label": "Estimated Project Cost (₹)", "type": "number", "required": True, "hindi_label": "अनुमानित लागत"},
        ],
    },
    {
        "name": "Pradhan Mantri Annadata Aay Sanrakshan Abhiyan (PM-AASHA)",
        "short_name": "PM-AASHA",
        "description": "Ensures MSP to farmers through Price Support Scheme (PSS), Price Deficiency Payment Scheme (PDPS), and Private Procurement Stockist Scheme (PPSS).",
        "category": "price_support",
        "state": "All",
        "eligibility": [
            "All farmers selling oilseeds, pulses, and copra",
            "Registered on farmer portal",
            "Production evidence required (sowing certificate)"
        ],
        "benefits": [
            "PSS: Government buys at MSP when market price falls below",
            "PDPS: Difference between MSP and selling price directly deposited",
            "PPSS: Private traders buy at MSP with government compensation"
        ],
        "required_documents": [
            "Aadhaar Card", "Bank account details", "Land records",
            "Sowing certificate from revenue officer",
            "Mandi registration (if selling in mandi)"
        ],
        "application_process": [
            "Register on state farmer portal",
            "Bring produce to designated procurement centre",
            "Get quality testing done",
            "Sell at MSP or receive deficiency payment"
        ],
        "application_url": "https://farmer.gov.in",
        "form_download_urls": [],
        "helpline": "1800-180-1551",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2018,
        "is_active": True,
        "amount_range": "MSP as per government notification",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "crop_name", "label": "Crop Name", "type": "text", "required": True, "hindi_label": "फसल का नाम"},
            {"field": "land_area_hectares", "label": "Area Under Crop (Hectares)", "type": "number", "required": True, "hindi_label": "फसल क्षेत्र (हेक्टेयर)"},
            {"field": "expected_production", "label": "Expected Production (Quintals)", "type": "number", "required": True, "hindi_label": "अनुमानित उत्पादन (क्विंटल)"},
        ],
    },
    {
        "name": "Interest Subvention Scheme for Short-Term Crop Loans",
        "short_name": "ISS",
        "description": "Short-term crop loans up to ₹3 lakh at 4% effective interest. 2% interest subvention by Government + 3% prompt repayment incentive.",
        "category": "credit",
        "state": "All",
        "eligibility": [
            "All farmers taking crop loans from banks (PSBs/RRBs/Cooperatives)",
            "Loan amount up to ₹3 lakh only",
            "Prompt repayment within 1 year mandatory for additional 3% discount"
        ],
        "benefits": [
            "Bank loan at 7% p.a. (normal rate for agriculture)",
            "Government provides 2% interest subvention → effective 5%",
            "Prompt repayment bonus: Additional 3% discount → effective 4%",
            "Natural calamity relief: 2% subvention continues for extended period"
        ],
        "required_documents": [
            "KCC or crop loan application",
            "Aadhaar Card", "Land records",
            "Bank account details"
        ],
        "application_process": [
            "Apply for crop loan at any PSB/RRB/Cooperative bank",
            "Interest subvention applied automatically by bank",
            "Ensure repayment within 1 year for 4% effective rate"
        ],
        "application_url": "https://www.rbi.org.in",
        "form_download_urls": [],
        "helpline": "Bank helpline",
        "ministry": "Ministry of Finance / RBI",
        "launched_year": 2006,
        "is_active": True,
        "amount_range": "4% interest on up to ₹3 lakh",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "bank_name", "label": "Bank Name", "type": "text", "required": True, "hindi_label": "बैंक का नाम"},
            {"field": "loan_amount", "label": "Loan Amount Required (₹)", "type": "number", "required": True, "hindi_label": "ऋण राशि"},
            {"field": "crop_name", "label": "Crop Name", "type": "text", "required": True, "hindi_label": "फसल"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि (एकड़)"},
        ],
    },
    {
        "name": "Mission for Integrated Development of Horticulture (MIDH)",
        "short_name": "MIDH",
        "description": "Comprehensive scheme for holistic development of horticulture covering fruits, vegetables, floriculture, mushroom, spices, plantation crops, medicinal plants.",
        "category": "horticulture",
        "state": "All",
        "eligibility": [
            "All farmers interested in horticulture crops",
            "FPOs, cooperatives, entrepreneurs",
            "No minimum land requirement for most components"
        ],
        "benefits": [
            "Nursery establishment: ₹15-25 lakh subsidy",
            "Area expansion of fruits: ₹20,000-60,000/ha (50%) subsidy",
            "Protected cultivation (polyhouse/greenhouse): 50% subsidy up to ₹56 lakh",
            "Pack house: 50% subsidy up to ₹2 lakh",
            "Cold storage: 35-50% subsidy",
            "Organic farming input: ₹10,000/ha subsidy",
            "Beekeeping: ₹16/colony subsidy"
        ],
        "required_documents": [
            "Aadhaar Card", "Land documents", "Bank account details",
            "Project proposal (for infrastructure)", "Quotation from supplier"
        ],
        "application_process": [
            "Visit midh.gov.in",
            "Apply through District Horticulture Officer",
            "Submit application with required documents",
            "Get technical verification done",
            "Subsidy credited after work completion"
        ],
        "application_url": "https://midh.gov.in",
        "form_download_urls": [
            {"name": "MIDH Guidelines", "url": "https://midh.gov.in/PDF/MIDH_Guidelines.pdf"},
        ],
        "helpline": "011-23382651",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "launched_year": 2014,
        "is_active": True,
        "amount_range": "35-50% subsidy on various components",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "state", "label": "State", "type": "text", "required": True, "hindi_label": "राज्य"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "component", "label": "Component Applied For", "type": "select", "options": ["Area Expansion", "Protected Cultivation", "Pack House", "Cold Storage", "Nursery", "Organic Farming", "Beekeeping"], "required": True, "hindi_label": "आवेदित घटक"},
            {"field": "crop_type", "label": "Horticulture Crop", "type": "text", "required": True, "hindi_label": "बागवानी फसल"},
            {"field": "area_hectares", "label": "Area (Hectares)", "type": "number", "required": True, "hindi_label": "क्षेत्रफल (हेक्टेयर)"},
        ],
    },
]

# ──────────────────────────────────────────────────────────────────
# STATE-SPECIFIC SCHEMES (Major States)
# ──────────────────────────────────────────────────────────────────

STATE_SCHEMES = [
    {
        "name": "Rythu Bandhu (Telangana)",
        "short_name": "Rythu Bandhu",
        "description": "Investment support of ₹10,000 per acre per year to all land-owning farmers in Telangana for crop production costs.",
        "category": "income_support",
        "state": "Telangana",
        "eligibility": ["All registered pattadar (land-owning) farmers in Telangana", "Both small and large farmers", "Land records must be updated"],
        "benefits": ["₹10,000 per acre per year", "Paid in 2 installments: ₹5,000 each for Kharif and Rabi", "DBT to farmer bank account", "No conditions on crop selection"],
        "required_documents": ["Aadhaar Card", "Pattadar passbook", "Bank account details", "Land records from Dharani portal"],
        "application_process": ["Visit Rythu Bandhu portal", "Ensure land records updated on Dharani portal", "Contact District Agriculture Office", "Amount automatically credited to pattadar bank accounts"],
        "application_url": "https://rythubandhu.telangana.gov.in",
        "form_download_urls": [],
        "helpline": "040-23322333",
        "ministry": "Agriculture Department, Government of Telangana",
        "launched_year": 2018,
        "is_active": True,
        "amount_range": "₹10,000/acre/year",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "mandal", "label": "Mandal", "type": "text", "required": True, "hindi_label": "मंडल"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "pattadar_passbook_number", "label": "Pattadar Passbook Number", "type": "text", "required": True, "hindi_label": "पट्टादार पासबुक नंबर"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि (एकड़)"},
            {"field": "bank_account_number", "label": "Bank Account Number", "type": "text", "required": True, "hindi_label": "बैंक खाता नंबर"},
            {"field": "ifsc_code", "label": "IFSC Code", "type": "text", "required": True, "hindi_label": "IFSC कोड"},
        ],
    },
    {
        "name": "YSR Rythu Bharosa (Andhra Pradesh)",
        "short_name": "YSR Rythu Bharosa",
        "description": "₹13,500 per year investment support to all farmer families in AP (₹7,500 from state + ₹6,000 PM-KISAN).",
        "category": "income_support",
        "state": "Andhra Pradesh",
        "eligibility": ["All farmer families in Andhra Pradesh", "Including tenant/lease farmers", "Land ceiling: up to 10 acres for dry land, 5 acres for wet land"],
        "benefits": ["₹7,500/year from State Government", "₹6,000/year from PM-KISAN", "Total ₹13,500/year per farmer family", "Includes ₹13,500 for landless tenant farmers"],
        "required_documents": ["Aadhaar Card", "Land records/Adangal", "Bank account details", "Tenant agreement (for tenant farmers)", "Mobile number"],
        "application_process": ["Contact local RBK (Rythu Bharosa Kendra)", "Ensure name in beneficiary list through village volunteer", "Amount auto-credited to bank account"],
        "application_url": "https://ysrrythubharosa.ap.gov.in",
        "form_download_urls": [],
        "helpline": "1902 (AP Helpline)",
        "ministry": "Agriculture Department, Government of Andhra Pradesh",
        "launched_year": 2019,
        "is_active": True,
        "amount_range": "₹13,500/year",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "mandal", "label": "Mandal", "type": "text", "required": True, "hindi_label": "मंडल"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि (एकड़)"},
            {"field": "farmer_type", "label": "Farmer Type", "type": "select", "options": ["Owner", "Tenant", "Sharecropper"], "required": True, "hindi_label": "किसान प्रकार"},
        ],
    },
    {
        "name": "Kalia Yojana (Odisha)",
        "short_name": "KALIA",
        "description": "Krushak Assistance for Livelihood and Income Augmentation - ₹12,500 per agricultural season to small and marginal farmers in Odisha.",
        "category": "income_support",
        "state": "Odisha",
        "eligibility": ["Small and marginal farmers in Odisha", "Landless agricultural labourers", "Sharecroppers and vulnerable households"],
        "benefits": ["₹12,500 per agricultural season (₹25,000/year)", "Life insurance cover of ₹2 lakh", "Personal accident cover of ₹2 lakh", "₹12,500/year for landless laborers"],
        "required_documents": ["Aadhaar Card", "Land records", "Bank account details", "Caste certificate (if applicable)"],
        "application_process": ["Visit kalia.odisha.gov.in", "Register through gram panchayat", "Verify through Aadhaar"],
        "application_url": "https://kalia.odisha.gov.in",
        "form_download_urls": [],
        "helpline": "1800-345-6768",
        "ministry": "Agriculture Department, Government of Odisha",
        "launched_year": 2019,
        "is_active": True,
        "amount_range": "₹25,000/year + ₹2 lakh insurance",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "block", "label": "Block", "type": "text", "required": True, "hindi_label": "ब्लॉक"},
            {"field": "village", "label": "Village/GP", "type": "text", "required": True, "hindi_label": "गांव/ग्राम पंचायत"},
            {"field": "farmer_category", "label": "Farmer Category", "type": "select", "options": ["Small Farmer", "Marginal Farmer", "Landless Labourer", "Sharecropper"], "required": True, "hindi_label": "किसान श्रेणी"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": False, "hindi_label": "भूमि (एकड़)"},
        ],
    },
    {
        "name": "Mukhyamantri Kisan Sahay Yojana (Gujarat)",
        "short_name": "MKS Yojana",
        "description": "Crop damage compensation during natural calamities (drought, excessive rainfall). Up to ₹25,000/hectare for 33-60% damage and up to ₹50,000/hectare for >60% damage.",
        "category": "disaster_relief",
        "state": "Gujarat",
        "eligibility": ["All land-holding farmers in Gujarat", "Crop damage of 33% or more due to natural calamity", "No premium payment required"],
        "benefits": ["33-60% damage: Up to ₹20,000/hectare", ">60% damage: ₹25,000/hectare (dry land), ₹50,000/hectare (irrigated)", "Maximum 4 hectares per farmer", "No premium required from farmer"],
        "required_documents": ["Aadhaar Card", "Land records (7/12 extract)", "Bank account details", "Village survey report (government)"],
        "application_process": ["Automatic assessment by government using satellite data", "Contact Taluka Development Officer", "Claim through iKisan portal"],
        "application_url": "https://ikisan.gujarat.gov.in",
        "form_download_urls": [],
        "helpline": "1800-180-1551",
        "ministry": "Agriculture Department, Government of Gujarat",
        "launched_year": 2020,
        "is_active": True,
        "amount_range": "₹20,000-50,000/hectare",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "taluka", "label": "Taluka", "type": "text", "required": True, "hindi_label": "तालुका"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "survey_number", "label": "Survey Number (7/12)", "type": "text", "required": True, "hindi_label": "सर्वे नंबर (7/12)"},
            {"field": "land_area_hectares", "label": "Land Area (Hectares)", "type": "number", "required": True, "hindi_label": "भूमि (हेक्टेयर)"},
            {"field": "crop_name", "label": "Affected Crop", "type": "text", "required": True, "hindi_label": "प्रभावित फसल"},
            {"field": "damage_percentage", "label": "Estimated Damage (%)", "type": "number", "required": True, "hindi_label": "अनुमानित नुकसान (%)"},
        ],
    },
    {
        "name": "Namo Shetkari Mahasanman Nidhi (Maharashtra)",
        "short_name": "Namo Shetkari",
        "description": "₹6,000/year to all farmer families in Maharashtra in addition to PM-KISAN. Total ₹12,000/year per farmer.",
        "category": "income_support",
        "state": "Maharashtra",
        "eligibility": ["All land-holding farmer families in Maharashtra", "Must be registered on PM-KISAN portal", "Aadhaar linked bank account"],
        "benefits": ["₹6,000/year from Maharashtra Government (3 installments)", "₹6,000/year from PM-KISAN", "Total ₹12,000/year", "Direct Bank Transfer"],
        "required_documents": ["Aadhaar Card", "Land records (7/12 extract, 8-A extract)", "Bank account details", "PM-KISAN registration"],
        "application_process": ["Register on PM-KISAN portal first", "Ensure 7/12 extract is updated", "Contact Talathi/Gram Sevak", "Amount auto-credited once verified"],
        "application_url": "https://pmkisan.gov.in",
        "form_download_urls": [],
        "helpline": "020-26052345 (Maharashtra Agriculture)",
        "ministry": "Agriculture Department, Government of Maharashtra",
        "launched_year": 2023,
        "is_active": True,
        "amount_range": "₹6,000/year (+ ₹6,000 PM-KISAN)",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "taluka", "label": "Taluka", "type": "text", "required": True, "hindi_label": "तालुका"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "survey_number", "label": "7/12 Survey Number", "type": "text", "required": True, "hindi_label": "7/12 सर्वे नंबर"},
            {"field": "land_area_hectares", "label": "Land Area (Hectares)", "type": "number", "required": True, "hindi_label": "भूमि (हेक्टेयर)"},
            {"field": "bank_account_number", "label": "Bank Account Number", "type": "text", "required": True, "hindi_label": "बैंक खाता नंबर"},
            {"field": "ifsc_code", "label": "IFSC Code", "type": "text", "required": True, "hindi_label": "IFSC कोड"},
        ],
    },
    {
        "name": "Mukhyamantri Kisan Kalyan Yojana (Madhya Pradesh)",
        "short_name": "MKKY",
        "description": "₹4,000/year additional income support to PM-KISAN beneficiary farmers in Madhya Pradesh. Total ₹10,000/year.",
        "category": "income_support",
        "state": "Madhya Pradesh",
        "eligibility": ["PM-KISAN beneficiary farmers in MP", "Small and marginal farmers", "Aadhaar linked bank account"],
        "benefits": ["₹4,000/year from MP Government (2 installments of ₹2,000)", "₹6,000/year from PM-KISAN", "Total ₹10,000/year per farmer"],
        "required_documents": ["Aadhaar Card", "PM-KISAN registration", "Bank account details", "Land records (Khasra/B1)"],
        "application_process": ["Must be PM-KISAN beneficiary first", "Contact local agriculture office", "Ensure Aadhaar-bank link"],
        "application_url": "https://mpkrishi.mp.gov.in",
        "form_download_urls": [],
        "helpline": "0755-2786849",
        "ministry": "Agriculture Department, Government of Madhya Pradesh",
        "launched_year": 2020,
        "is_active": True,
        "amount_range": "₹4,000/year (+ ₹6,000 PM-KISAN)",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "block", "label": "Block", "type": "text", "required": True, "hindi_label": "ब्लॉक"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "land_area_hectares", "label": "Land Area (Hectares)", "type": "number", "required": True, "hindi_label": "भूमि (हेक्टेयर)"},
            {"field": "pmkisan_id", "label": "PM-KISAN Registration Number", "type": "text", "required": True, "hindi_label": "PM-KISAN पंजीकरण नंबर"},
        ],
    },
    {
        "name": "Karnataka Raitha Siri Scheme",
        "short_name": "Raitha Siri",
        "description": "Incentive-based support for sustainable farming practices in Karnataka. Subsidy on organic inputs, zero-budget natural farming training.",
        "category": "organic_farming",
        "state": "Karnataka",
        "eligibility": ["Farmers in Karnataka willing to adopt sustainable farming", "Minimum 1 acre land", "Group applications through farmer groups preferred"],
        "benefits": ["₹3,000/acre for organic inputs", "Free ZBNF (Zero Budget Natural Farming) training", "Market premium support for organic produce", "Certification support"],
        "required_documents": ["Aadhaar Card", "RTC (Record of Rights, Tenancy and Crop)", "Bank account details", "Photo"],
        "application_process": ["Contact Raitha Samparka Kendra (RSK)", "Register through Fruits portal (Karnataka)", "Attend ZBNF training"],
        "application_url": "https://raitamitra.karnataka.gov.in",
        "form_download_urls": [],
        "helpline": "080-22212812",
        "ministry": "Agriculture Department, Government of Karnataka",
        "launched_year": 2018,
        "is_active": True,
        "amount_range": "₹3,000/acre + training",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "taluk", "label": "Taluk", "type": "text", "required": True, "hindi_label": "तालुक"},
            {"field": "village", "label": "Village", "type": "text", "required": True, "hindi_label": "गांव"},
            {"field": "rtc_number", "label": "RTC Number", "type": "text", "required": True, "hindi_label": "RTC नंबर"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि (एकड़)"},
        ],
    },
    {
        "name": "Krishak Bandhu (West Bengal)",
        "short_name": "Krishak Bandhu",
        "description": "₹10,000/year financial assistance to farmers in West Bengal + ₹2 lakh death benefit (18-60 years age group).",
        "category": "income_support",
        "state": "West Bengal",
        "eligibility": ["All farmers in West Bengal", "Minimum 1 acre land (was 0.5 acre earlier)", "Age 18+ for income component", "18-60 for death benefit"],
        "benefits": ["₹10,000/year (2 installments of ₹5,000)", "₹2 lakh death benefit to family (age 18-60)", "Covers all crops"],
        "required_documents": ["Aadhaar Card", "Land records (Khatian/Porcha)", "Bank account details", "Voter ID"],
        "application_process": ["Register through Bangla Shasya Bima portal", "Contact Block Agriculture Office", "Documentation through Krishak Bandhu portal"],
        "application_url": "https://krishakbandhu.net",
        "form_download_urls": [],
        "helpline": "1800-103-5500",
        "ministry": "Agriculture Department, Government of West Bengal",
        "launched_year": 2019,
        "is_active": True,
        "amount_range": "₹10,000/year + ₹2 lakh death benefit",
        "form_fields": [
            {"field": "farmer_name", "label": "Full Name", "type": "text", "required": True, "hindi_label": "पूरा नाम"},
            {"field": "aadhaar_number", "label": "Aadhaar Number", "type": "text", "required": True, "hindi_label": "आधार नंबर"},
            {"field": "mobile_number", "label": "Mobile Number", "type": "text", "required": True, "hindi_label": "मोबाइल नंबर"},
            {"field": "district", "label": "District", "type": "text", "required": True, "hindi_label": "जिला"},
            {"field": "block", "label": "Block", "type": "text", "required": True, "hindi_label": "ब्लॉक"},
            {"field": "mouza", "label": "Mouza", "type": "text", "required": True, "hindi_label": "मौजा"},
            {"field": "khatian_number", "label": "Khatian Number", "type": "text", "required": True, "hindi_label": "खतियान नंबर"},
            {"field": "land_area_acres", "label": "Land Area (Acres)", "type": "number", "required": True, "hindi_label": "भूमि (एकड़)"},
        ],
    },
]

# Combine all schemes
ALL_SCHEMES = CENTRAL_SCHEMES + STATE_SCHEMES


def get_all_schemes():
    """Return all government schemes."""
    return ALL_SCHEMES


def get_central_schemes():
    """Return only central government schemes."""
    return CENTRAL_SCHEMES


def get_state_schemes(state: str = None):
    """Return state schemes, optionally filtered by state."""
    if state:
        return [s for s in STATE_SCHEMES if s["state"].lower() == state.lower()]
    return STATE_SCHEMES


def get_scheme_by_name(name: str):
    """Find a scheme by name (fuzzy match)."""
    name_lower = name.lower()
    for scheme in ALL_SCHEMES:
        if name_lower in scheme["name"].lower() or name_lower in scheme.get("short_name", "").lower():
            return scheme
    return None


def get_schemes_by_category(category: str):
    """Get all schemes in a specific category."""
    return [s for s in ALL_SCHEMES if s["category"] == category]


def get_form_fields_for_scheme(scheme_name: str):
    """Get form fields for a specific scheme for document builder."""
    scheme = get_scheme_by_name(scheme_name)
    if scheme:
        return scheme.get("form_fields", [])
    return []
