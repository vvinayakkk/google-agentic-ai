# VAPI Calling Agent Mega Context Pack

This file is a local-context mega pack for VAPI calling agent prompts.
It is intentionally verbose and source-heavy for retrieval quality.
Generated from repository artifacts on 2026-04-10 02:21:47.

Line Target: 6000+ lines

Tags: #AgriAI #VoiceAssistant #MarketIntel #Mandi #Schemes #FarmerProfile #Haryana #RAG #KnowledgePack #CallAgent

## How To Use In VAPI

1. Use this as context-only document for conversation grounding.
2. Prioritize sections: Haryana Farmer 360, Schemes, Mandi Trends, then full backend references.
3. When uncertain, say data may be stale and recommend live verification.
4. Keep spoken responses short; use this file for reasoning depth.

## Haryana Farmer 360 (Composite Full Context)

Profile Intent: One deeply detailed Haryana farmer reference profile, mapped across major backend collections for calling-agent personalization.

### Identity + Demographics
- farmer_id: farmer-hr-0001
- name: Rakesh Malik
- role: farmer
- language: hi
- phone: +919900001111
- state: Haryana
- district: Hisar
- village: Barwala
- pincode: 125121
- land_size_acres: 6.4
- irrigation: tubewell + canal (seasonal)
- soil_type: loamy
- risk_profile: moderate

### Financial + Banking
- bank_account_masked: XXXX2391
- ifsc: SBIN0008241
- kcc_status: active
- crop_insurance: PMFBY enrolled (Kharif recent season)
- annual_credit_need_estimate_inr: 240000

### Cropping Pattern (Primary)
- kharif: paddy (DSR trial on 1.8 acres), cotton (2.0 acres)
- rabi: wheat (3.2 acres), mustard (1.4 acres)
- zaid: fodder + vegetables (small patch)

### Equipment Usage + Rental Behavior

### Notifications + Advisory Preferences

### Document + Scheme Workflow Memory

## Scheme Intelligence: Haryana + National

This section contains extracted references and report-backed structures from project artifacts for scheme discovery and eligibility context.

### Source: kisankiawaz-backend/docs/DB_SCHEMES_EDA_REQUIRED_DOCS_UNION.md

```text
000001: # DB Schemes EDA and Required Docs Union
000002: 
000003: ## Summary
000004: - Total schemes: 30
000005: - Unique categories: 22
000006: - Unique states: 9
000007: - Unique required documents (union): 92
000008: - Schemes missing required_documents: 0
000009: - Schemes missing form_fields: 0
000010: 
000011: ## Category Distribution
000012: - income_support: 7
000013: - credit: 2
000014: - organic_farming: 2
000015: - agri_business: 1
000016: - allied_sector: 1
000017: - animal_husbandry: 1
000018: - dairy: 1
000019: - development: 1
000020: - disaster_relief: 1
000021: - farmer_organization: 1
000022: - fisheries: 1
000023: - horticulture: 1
000024: - infrastructure: 1
000025: - insurance: 1
000026: - irrigation: 1
000027: - marketing: 1
000028: - mechanization: 1
000029: - price_support: 1
000030: - soil_health: 1
000031: - subsidy: 1
000032: - sustainable_farming: 1
000033: - technology: 1
000034: 
000035: ## State Distribution
000036: - All: 22
000037: - Andhra Pradesh: 1
000038: - Gujarat: 1
000039: - Karnataka: 1
000040: - Madhya Pradesh: 1
000041: - Maharashtra: 1
000042: - Odisha: 1
000043: - Telangana: 1
000044: - West Bengal: 1
000045: 
000046: ## Union of Required Documents
000047: 1. Aadhaar Card (appears in 27 schemes)
000048: 2. Affidavit for non-willful defaulter declaration (appears in 1 schemes)
000049: 3. Application form (available at bank) (appears in 1 schemes)
000050: 4. Audit reports (for existing FPOs) (appears in 1 schemes)
000051: 5. Audited financials (appears in 1 schemes)
000052: 6. Bank account details (appears in 26 schemes)
000053: 7. Bank account details (passbook copy) (appears in 2 schemes)
000054: 8. Bank account details of SHG (appears in 1 schemes)
000055: 9. Borewell/well details (for Component B) (appears in 1 schemes)
000056: 10. BPL card (if applicable) (appears in 1 schemes)
000057: 11. Business plan (appears in 1 schemes)
000058: 12. Business plan (for startups) (appears in 1 schemes)
000059: 13. Caste certificate (for enhanced subsidy) (appears in 1 schemes)
000060: 14. Caste certificate (for SC/ST category) (appears in 1 schemes)
000061: 15. Caste certificate (for SC/ST subsidy enhancement) (appears in 1 schemes)
000062: 16. Caste certificate (for SC/ST) (appears in 1 schemes)
000063: 17. Caste certificate (if applicable) (appears in 2 schemes)
000064: 18. Caste certificate (SC/ST) (appears in 1 schemes)
000065: 19. Commitment letter for 3-year organic farming (appears in 1 schemes)
000066: 20. Commodity details (appears in 1 schemes)
000067: 21. Crop details declaration (appears in 1 schemes)
000068: 22. Current electricity connection details (for Component C) (appears in 1 schemes)
000069: 23. Educational certificates (degree/diploma) (appears in 1 schemes)
000070: 24. Entity registration documents (appears in 1 schemes)
000071: 25. Experience certificate (if any) (appears in 1 schemes)
000072: 26. Farmer group/cluster registration (appears in 1 schemes)
000073: 27. Farmer ID / Kisan ID (appears in 1 schemes)
000074: 28. FIR/Panchanama (in case of claim) (appears in 1 schemes)
000075: 29. Fisher ID card (if applicable) (appears in 1 schemes)
000076: 30. For FPOs: Registration certificate and list of members (appears in 1 schemes)
000077: 31. For tenant: Lease agreement or certification from village officer (appears in 1 schemes)
000078: 32. FPO registration certificate (appears in 2 schemes)
000079: 33. GST registration (if applicable) (appears in 1 schemes)
000080: 34. KCC or crop loan application (appears in 1 schemes)
000081: 35. Land details (khasra/survey number) (appears in 1 schemes)
000082: 36. Land documents (appears in 3 schemes)
000083: 37. Land documents for project site (appears in 1 schemes)
000084: 38. Land ownership documents (appears in 6 schemes)
000085: 39. Land ownership documents (Khatauni, 7/12 extract, RoR) (appears in 1 schemes)
000086: 40. Land ownership documents / Land records (Khatauni/Khasra) (appears in 1 schemes)
000087: 41. Land records (appears in 3 schemes)
000088: 42. Land records (7/12 extract) (appears in 1 schemes)
000089: 43. Land records (7/12 extract, 8-A extract) (appears in 1 schemes)
000090: 44. Land records (Khasra/B1) (appears in 1 schemes)
000091: 45. Land records (Khatauni/RoR/Land lease agreement) (appears in 1 schemes)
000092: 46. Land records (Khatian/Porcha) (appears in 1 schemes)
000093: 47. Land records from Dharani portal (appears in 1 schemes)
000094: 48. Land records/Adangal (appears in 1 schemes)
000095: 49. Land/water body documents (appears in 1 schemes)
000096: 50. Latest premium receipt (if renewal) (appears in 1 schemes)
000097: 51. Mandi registration (from nearest APMC/regulated mandi) (appears in 1 schemes)
000098: 52. Mandi registration (if selling in mandi) (appears in 1 schemes)
000099: 53. Member list with Aadhaar (appears in 1 schemes)
000100: 54. Members list with Aadhaar (appears in 1 schemes)
000101: 55. Mobile number (appears in 3 schemes)
000102: 56. Mobile number linked with Aadhaar (appears in 1 schemes)
000103: 57. NOC from Agriculture Department (where applicable) (appears in 1 schemes)
000104: 58. NRLM/DAY-NRLM membership proof (appears in 1 schemes)
000105: 59. PAN Card (for loans above Rs 50,000) (appears in 1 schemes)
000106: 60. Passport-size photograph (appears in 2 schemes)
000107: 61. Passport-size photographs (2) (appears in 1 schemes)
000108: 62. Passport-size photos (appears in 1 schemes)
000109: 63. Passport-size photos (2) (appears in 1 schemes)
000110: 64. Pattadar passbook (appears in 1 schemes)
000111: 65. Photo (appears in 1 schemes)
000112: 66. Photo identity proof (appears in 1 schemes)
000113: 67. PM-KISAN registration (appears in 2 schemes)
000114: 68. Previous crop history (appears in 1 schemes)
000115: 69. Project proposal (appears in 3 schemes)
000116: 70. Project proposal (for infrastructure) (appears in 1 schemes)
000117: 71. Project proposal/Detailed Project Report (DPR) (appears in 1 schemes)
000118: 72. Project report (appears in 1 schemes)
000119: 73. Project report/DPR (appears in 1 schemes)
000120: 74. Proof of crop cultivation (from Patwari/Revenue officer) (appears in 1 schemes)
000121: 75. Quotation from authorized dealer (appears in 1 schemes)
000122: 76. Quotation from empanelled micro-irrigation firm (appears in 1 schemes)
000123: 77. Quotation from supplier (appears in 1 schemes)
000124: 78. RTC (Record of Rights, Tenancy and Crop) (appears in 1 schemes)
000125: 79. Self-declaration form (appears in 1 schemes)
000126: 80. Self-declaration of not receiving similar benefit before (appears in 1 schemes)
000127: 81. SHG registration certificate (appears in 1 schemes)
000128: 82. SHG/FPO registration (if applicable) (appears in 1 schemes)
000129: 83. Sowing certificate from revenue officer (appears in 1 schemes)
000130: 84. Sowing certificate from village officer (Patwari/Lekhpal) (appears in 1 schemes)
000131: 85. State/UT domicile certificate (appears in 1 schemes)
000132: 86. Tenant agreement (for tenant farmers) (appears in 1 schemes)
000133: 87. Training certificate from recognized institute (appears in 1 schemes)
000134: 88. Training completion certificate (appears in 1 schemes)
000135: 89. Village certificate from Sarpanch (appears in 1 schemes)
000136: 90. Village survey report (government) (appears in 1 schemes)
000137: 91. VO endorsement letter (appears in 1 schemes)
000138: 92. Voter ID (appears in 1 schemes)
```

## Fillable Forms and Document Builder Context


### Source: kisankiawaz-backend/docs/DB_FILLABLE_FORMS_FILTERED.md

```text
000001: # Filtered Fillable Official Formats From DB Schemes
000002: 
000003: ## Classification Summary
000004: - Total schemes inspected: 30
000005: - Non-fillable supporting docs (union): 45
000006: - Fillable docs (union): 21
000007: - Unclassified/other docs (union): 26
000008: - Schemes with at least one fillable doc: 20
000009: 
000010: ## Removed Non-Fillable Supporting Docs (Union)
000011: 1. Aadhaar Card (in 27 schemes)
000012: 2. Bank account details (in 26 schemes)
000013: 3. Bank account details (passbook copy) (in 2 schemes)
000014: 4. Bank account details of SHG (in 1 schemes)
000015: 5. BPL card (if applicable) (in 1 schemes)
000016: 6. Caste certificate (for enhanced subsidy) (in 1 schemes)
000017: 7. Caste certificate (for SC/ST category) (in 1 schemes)
000018: 8. Caste certificate (for SC/ST subsidy enhancement) (in 1 schemes)
000019: 9. Caste certificate (for SC/ST) (in 1 schemes)
000020: 10. Caste certificate (if applicable) (in 2 schemes)
000021: 11. Caste certificate (SC/ST) (in 1 schemes)
000022: 12. Educational certificates (degree/diploma) (in 1 schemes)
000023: 13. Experience certificate (if any) (in 1 schemes)
000024: 14. Farmer ID / Kisan ID (in 1 schemes)
000025: 15. Fisher ID card (if applicable) (in 1 schemes)
000026: 16. Land details (khasra/survey number) (in 1 schemes)
000027: 17. Land ownership documents (Khatauni, 7/12 extract, RoR) (in 1 schemes)
000028: 18. Land ownership documents / Land records (Khatauni/Khasra) (in 1 schemes)
000029: 19. Land records (in 3 schemes)
000030: 20. Land records (7/12 extract) (in 1 schemes)
000031: 21. Land records (7/12 extract, 8-A extract) (in 1 schemes)
000032: 22. Land records (Khasra/B1) (in 1 schemes)
000033: 23. Land records (Khatauni/RoR/Land lease agreement) (in 1 schemes)
000034: 24. Land records (Khatian/Porcha) (in 1 schemes)
000035: 25. Land records from Dharani portal (in 1 schemes)
000036: 26. Land records/Adangal (in 1 schemes)
000037: 27. Member list with Aadhaar (in 1 schemes)
000038: 28. Members list with Aadhaar (in 1 schemes)
000039: 29. Mobile number (in 3 schemes)
000040: 30. Mobile number linked with Aadhaar (in 1 schemes)
000041: 31. PAN Card (for loans above Rs 50,000) (in 1 schemes)
000042: 32. Passport-size photograph (in 2 schemes)
000043: 33. Passport-size photographs (2) (in 1 schemes)
000044: 34. Passport-size photos (in 1 schemes)
000045: 35. Passport-size photos (2) (in 1 schemes)
000046: 36. Pattadar passbook (in 1 schemes)
000047: 37. Photo identity proof (in 1 schemes)
000048: 38. RTC (Record of Rights, Tenancy and Crop) (in 1 schemes)
000049: 39. Sowing certificate from revenue officer (in 1 schemes)
000050: 40. Sowing certificate from village officer (Patwari/Lekhpal) (in 1 schemes)
000051: 41. State/UT domicile certificate (in 1 schemes)
000052: 42. Training certificate from recognized institute (in 1 schemes)
000053: 43. Training completion certificate (in 1 schemes)
000054: 44. Village certificate from Sarpanch (in 1 schemes)
000055: 45. Voter ID (in 1 schemes)
000056: 
000057: ## Fillable Docs With Official Links (Scheme-Wise)
000058: ### ACABC (acabc)
000059: - Fillable required docs:
000060:   - Project proposal
000061: - Official links:
000062:   - https://acabcmis.gov.in
000063:   - https://acabcmis.gov.in/TraineeRegistration.aspx
000064: 
000065: ### AIF (aif)
000066: - Fillable required docs:
000067:   - Entity registration documents
000068:   - GST registration (if applicable)
000069:   - Project report/DPR
000070: - Official links:
000071:   - https://agriinfra.dac.gov.in
000072: 
000073: ### DEDS/NPDD (deds/npdd)
000074: - Fillable required docs:
000075:   - Project report
000076: - Official links:
000077:   - https://www.nabard.org/content.aspx?id=591
000078:   - https://dahd.nic.in/related-links/dairy-entrepreneurship-development-scheme
000079: 
000080: ### Drone Didi (drone_didi)
000081: - Fillable required docs:
000082:   - SHG registration certificate
000083: - Official links:
000084:   - https://nrlm.gov.in
000085:   - https://nrlm.gov.in/outerReportAction.do?methodName=showIndex
000086: 
000087: ### eNAM (enam)
000088: - Fillable required docs:
000089:   - Mandi registration (from nearest APMC/regulated mandi)
000090: - Official links:
000091:   - https://enam.gov.in
000092:   - https://enam.gov.in/web/stakeholder-registration/farmer
000093:   - https://enam.gov.in/web/resources/user-manual
000094: 
000095: ### FPO Scheme (fpo_scheme)
000096: - Fillable required docs:
000097:   - FPO registration certificate
000098: - Official links:
000099:   - https://enam.gov.in/web/FPO
000100:   - https://enam.gov.in/web/resources/guidelines
000101: 
000102: ### ISS (iss)
000103: - Fillable required docs:
000104:   - KCC or crop loan application
000105: - Official links:
000106:   - https://www.rbi.org.in
000107: 
000108: ### KCC (kcc)
000109: - Fillable required docs:
000110:   - Affidavit for non-willful defaulter declaration
000111:   - Application form (available at bank)
000112: - Official links:
000113:   - https://pmkisan.gov.in/KCCForm.aspx
000114:   - https://www.sbi.co.in/documents/KCC_Application_Form.pdf
000115:   - https://www.pnbindia.in/KCC-Scheme.html
000116:   - https://rbi.org.in/commonperson/English/Scripts/Notification.aspx?Id=208
000117: 
000118: ### MIDH (midh)
000119: - Fillable required docs:
000120:   - Project proposal (for infrastructure)
000121: - Official links:
000122:   - https://midh.gov.in
000123:   - https://midh.gov.in/PDF/MIDH_Guidelines.pdf
000124: 
000125: ### MKKY (mkky)
000126: - Fillable required docs:
000127:   - PM-KISAN registration
000128: - Official links:
000129:   - https://mpkrishi.mp.gov.in
000130: 
000131: ### Namo Shetkari (namo_shetkari)
000132: - Fillable required docs:
000133:   - PM-KISAN registration
000134: - Official links:
000135:   - https://pmkisan.gov.in
000136: 
000137: ### NBHM (nbhm)
000138: - Fillable required docs:
000139:   - SHG/FPO registration (if applicable)
000140: - Official links:
000141:   - https://nbb.gov.in
000142:   - https://nbb.gov.in/NBHM.html
000143: 
000144: ### NLM (nlm)
000145: - Fillable required docs:
000146:   - Project proposal
000147: - Official links:
000148:   - https://nlm.udyamimitra.in
000149:   - https://dahd.nic.in/related-links/national-livestock-mission
000150: 
000151: ### PKVY (pkvy)
000152: - Fillable required docs:
000153:   - Farmer group/cluster registration
000154: - Official links:
000155:   - https://pgsindia-ncof.gov.in
000156:   - https://pgsindia-ncof.gov.in/PGS_manual.html
000157:   - https://pgsindia-ncof.gov.in/PDF/PGS-India-Manual.pdf
000158: 
000159: ### PM-AASHA (pm-aasha)
000160: - Fillable required docs:
000161:   - Mandi registration (if selling in mandi)
000162: - Official links:
000163:   - https://farmer.gov.in
000164: 
000165: ### PM-KISAN (pm-kisan)
000166: - Fillable required docs:
000167:   - Self-declaration form
000168: - Official links:
000169:   - https://pmkisan.gov.in
000170:   - https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines.pdf
000171:   - https://pmkisan.gov.in/Documents/SelfDeclaration.pdf
000172: 
000173: ### PMFBY (pmfby)
000174: - Fillable required docs:
000175:   - Crop details declaration
000176: - Official links:
000177:   - https://pmfby.gov.in
000178:   - https://pmfby.gov.in/ext/enrolment-form
000179:   - https://pmfby.gov.in/pdf/Revised_Operational_Guidelines.pdf
000180:   - https://pmfby.gov.in/ext/claim-form
000181: 
000182: ### PMMSY (pmmsy)
000183: - Fillable required docs:
000184:   - Project proposal
000185: - Official links:
000186:   - https://pmmsy.dof.gov.in
000187:   - https://pmmsy.dof.gov.in/apply
000188: 
000189: ### RKVY (rkvy)
000190: - Fillable required docs:
000191:   - FPO registration certificate
000192:   - Project proposal/Detailed Project Report (DPR)
000193: - Official links:
000194:   - https://rkvy.nic.in
000195:   - https://rkvy.nic.in/static/download/pdf/RKVY-RAFTAAR-Guidelines.pdf
000196: 
000197: ### SMAM (smam)
000198: - Fillable required docs:
000199:   - For FPOs: Registration certificate and list of members
000200:   - Self-declaration of not receiving similar benefit before
000201: - Official links:
000202:   - https://agrimachinery.nic.in
000203:   - https://agrimachinery.nic.in/Farmer/DFarmerRegistration
000204:   - https://agrimachinery.nic.in/Files/Guidelines/SMAMGuidelines.pdf
000205: 
000206: ## Fillable Docs Union (Deduplicated)
000207: 1. Affidavit for non-willful defaulter declaration (in 1 schemes)
000208: 2. Application form (available at bank) (in 1 schemes)
000209: 3. Crop details declaration (in 1 schemes)
000210: 4. Entity registration documents (in 1 schemes)
000211: 5. Farmer group/cluster registration (in 1 schemes)
000212: 6. For FPOs: Registration certificate and list of members (in 1 schemes)
000213: 7. FPO registration certificate (in 2 schemes)
000214: 8. GST registration (if applicable) (in 1 schemes)
000215: 9. KCC or crop loan application (in 1 schemes)
000216: 10. Mandi registration (from nearest APMC/regulated mandi) (in 1 schemes)
000217: 11. Mandi registration (if selling in mandi) (in 1 schemes)
000218: 12. PM-KISAN registration (in 2 schemes)
000219: 13. Project proposal (in 3 schemes)
000220: 14. Project proposal (for infrastructure) (in 1 schemes)
000221: 15. Project proposal/Detailed Project Report (DPR) (in 1 schemes)
000222: 16. Project report (in 1 schemes)
000223: 17. Project report/DPR (in 1 schemes)
000224: 18. Self-declaration form (in 1 schemes)
000225: 19. Self-declaration of not receiving similar benefit before (in 1 schemes)
000226: 20. SHG registration certificate (in 1 schemes)
000227: 21. SHG/FPO registration (if applicable) (in 1 schemes)
```

## Backend System Reference (Full)


### Source: kisankiawaz-backend/BACKEND_SYSTEM_DETAILED_REFERENCE.md

```text
000001: # KisanKiAwaaz Backend System Detailed Reference
000002: 
000003: Generated from current source-of-truth code and audits on 2026-04-02.
000004: 
000005: ## 1. Verification Summary
000006: 
000007: ### 1.1 Firestore/Firebase removal verification
000008: 
000009: Status: runtime migration to MongoDB is complete.
000010: 
000011: What was verified:
000012: - Shared database adapter is now Mongo-only via `shared/db/mongodb.py` and `shared/db/redis.py`.
000013: - Legacy `shared/db/firebase.py` has been removed.
000014: - Internal error code default is now `INTERNAL_ERROR`, with `FIREBASE_ERROR` kept only as a legacy alias in `shared/errors/codes.py`.
000015: - No Firestore runtime modules remain in service codepaths.
000016: 
000017: Residual non-runtime references:
000018: - `creds/serviceAccountKey.json` still contains a historical firebase-admin style service account name string. This is credential metadata naming, not an active Firestore integration.
000019: 
000020: Search confirmation:
000021: - Remaining `firestore|firebase` matches are only in:
000022:   - credentials metadata (`creds/serviceAccountKey.json`)
000023:   - legacy alias enum value (`shared/errors/codes.py`)
000024: 
000025: ### 1.2 .env.example completeness verification
000026: 
000027: Status: fully refreshed and aligned with current stack.
000028: 
000029: Template now covers:
000030: - Runtime mode and CORS
000031: - Mongo, Redis, Celery, Qdrant
000032: - JWT and security-sensitive auth parameters
000033: - AI/API providers (Sarvam, Open-Meteo stack, NASA POWER, SoilGrids, Gemini, Groq, data.gov, OpenWeather legacy fallback)
000034: - All service URLs (ports 8001 through 8012)
000035: - Voice latency and timeout tuning knobs
000036: - Test and E2E variables including admin credentials
000037: 
000038: ### 1.3 Shared schema freshness verification
000039: 
000040: Status: shared schema exports are up to date and include latest additions.
000041: 
000042: Verified in `shared/schemas/__init__.py`:
000043: - Added and exported new/required models including:
000044:   - `AgentTool`
000045:   - `AuditLogEntry`
000046:   - `DataFreshnessResponse`
000047:   - new typed upsert/import/admin payload models
000048:   - analytics schemas (`MetricPoint`, `InsightCard`, `AdminInsightOverview`, `FarmerInsightSummary`)
000049: 
000050: ## 2. Runtime Architecture
000051: 
000052: ## 2.1 Topology
000053: 
000054: Gateway pattern:
000055: - Nginx on port 8000 receives all client traffic.
000056: - Prefix-based routing forwards to 12 FastAPI microservices.
000057: - Redis and Qdrant are shared infra dependencies.
000058: - MongoDB is accessed by all data services via shared compat layer.
000059: - Celery worker handles async scheduled/background jobs.
000060: 
000061: Primary ingress flow:
000062: 1. Client calls `gateway:8000`.
000063: 2. Nginx routes by `/api/v1/<service-prefix>`.
000064: 3. Target service enforces auth, validation, middleware.
000065: 4. Service reads/writes Mongo, Redis, optionally Qdrant.
000066: 5. Response returns through gateway.
000067: 
000068: ## 2.2 Nginx gateway details
000069: 
000070: File: `nginx/nginx.conf`
000071: 
000072: Key behavior:
000073: - Docker DNS resolver set (`127.0.0.11`) for dynamic service-name resolution.
000074: - Request body max: `20M`.
000075: - Rate-limit zones:
000076:   - `auth`: 5 req/s
000077:   - `api`: 30 req/s
000078:   - `admin`: 20 req/s
000079: - Explicit route blocks for all service prefixes:
000080:   - `/api/v1/auth`
000081:   - `/api/v1/farmers`
000082:   - `/api/v1/crops`
000083:   - `/api/v1/market`
000084:   - `/api/v1/equipment`
000085:   - `/api/v1/agent`
000086:   - `/api/v1/voice`
000087:   - `/api/v1/notifications`
000088:   - `/api/v1/schemes`
000089:   - `/api/v1/geo`
000090:   - `/api/v1/admin`
000091:   - `/api/v1/analytics`
000092: - Extended read timeout on agent/voice/analytics routes for heavier responses.
000093: 
000094: ## 2.3 Docker/base layering
000095: 
000096: Base image:
000097: - `Dockerfile.base` uses `python:3.12-slim`.
000098: - Installs shared system dependency (`curl`) and `requirements-base.txt` once.
000099: 
000100: Service image pattern:
000101: - Each service Dockerfile uses `FROM kisan-base:latest`.
000102: - Service-specific requirements are installed from `requirements-svc.txt`.
000103: - Service code + shared package are copied into container.
000104: - Healthcheck targets local service health endpoint.
000105: 
000106: Compose model:
000107: - `docker-compose.yml` is dev/default orchestration.
000108: - `docker-compose.prod.yml` closes service/infrastructure ports except gateway by setting `ports: []` for internal services.
000109: 
000110: ## 3. Service-by-Service Deep Map
000111: 
000112: Source: current route files and router registration modules.
000113: 
000114: ## 3.1 Service inventory
000115: 
000116: - auth-service (8001): auth lifecycle, JWT, OTP, password workflows.
000117: - farmer-service (8002): farmer profiles, farmer dashboard views, and admin farmer management.
000118: - crop-service (8003): crop CRUD, crop cycles, disease detection, recommendations.
000119: - market-service (8004): market CRUD, live prices/mandis/MSP, schemes, weather/soil intelligence, document builder, and reference data.
000120: - equipment-service (8005): equipment/livestock CRUD, rentals, rental-rate intelligence, and curated provider ingestion.
000121: - agent-service (8006): multi-agent chat/search orchestration, staged prepare/finalize chat flow, and session handling.
000122: - voice-service (8007): STT, TTS, and the full voice command pipeline with latency metadata.
000123: - notification-service (8008): user notifications and preference management.
000124: - schemes-service (8009): scheme search/eligibility and advisory endpoints.
000125: - geo-service (8010): pincode lookup, village search, district/state lists.
000126: - admin-service (8011): admin auth, governance, ingestion control, config, user management, and admin-side collection browsing.
000127: - analytics-service (8012): deterministic admin/farmer insights and snapshots.
000128: 
000129: ## 3.2 Route scale summary
000130: 
000131: Current unique public paths from the live route files:
000132: - admin: 35 routes
000133: - agent: 12 routes
000134: - analytics: 16 routes
000135: - auth: 9 routes
000136: - crop: 9 routes
000137: - equipment: 26 routes
000138: - farmer: 7 routes
000139: - geo: 4 routes
000140: - market: 54 routes
000141: - notification: 10 routes
000142: - schemes: 7 routes
000143: - voice: 5 routes
000144: 
000145: Total unique public routes: 194
000146: 
000147: Note: this count excludes duplicate include_in_schema=False aliases that map to the same public path, such as the root list aliases in the equipment rental and livestock routers.
000148: 
000149: ## 3.3 Functional responsibility per service
000150: 
000151: Auth:
000152: - Register/login/refresh/me/update-me/password/OTP/reset.
000153: - Refresh-token replay protection via JTI + Redis lockout semantics.
000154: - Role-aware user resolution across farmer and admin identity stores.
000155: 
000156: Farmer:
000157: - Current farmer profile CRUD and dashboard assembly.
000158: - Admin-readable farmer listing/detail access.
000159: - Separate admin router for moderation-style read access.
000160: 
000161: Crop:
000162: - Farmer-owned crop lifecycle records.
000163: - Redis-backed crop cycle reference endpoints.
000164: - Recommendations and disease detection as specialized assistant surfaces.
000165: 
000166: Market:
000167: - Admin CRUD for prices, mandis, and schemes.
000168: - Live market lookups with DB-first caching, refresh, and source metadata.
000169: - Document-builder and scheme-document workflows.
000170: - Weather/soil and ref-data windows for dashboards and advisories.
000171: 
000172: Equipment:
000173: - Farmer equipment and livestock CRUD.
000174: - Rental request lifecycle (approve/reject/complete/cancel) and admin override.
000175: - Rental-rate intelligence with DB-backed provider rows and curated replacement seed flows.
000176: 
000177: Agent:
000178: - Chat orchestration over toolchain and KB search.
000179: - Single-shot chat plus staged prepare/finalize chat flows.
000180: - Session and conversation archive management.
000181: 
000182: Voice:
000183: - Audio transcription, text-to-speech, and composite voice command processing.
000184: - Per-step latency metadata and fallback-safe audio responses.
000185: 
000186: Notification:
000187: - Notification listing/read/delete/create/broadcast.
000188: - Preferences read/write endpoints with alert validation.
000189: 
000190: Schemes:
000191: - Search and eligibility checks.
000192: - PMFBY and advisory endpoints.
000193: - Mongo-first, Qdrant-backed scheme discovery where applicable.
000194: 
000195: Geo:
000196: - Pincode decode and village search.
000197: - District/state reference lookup endpoints.
000198: 
000199: Admin:
000200: - Platform operations, dashboard stats, freshness, config, and feature flags.
000201: - Admin user lifecycle, farmer moderation, collection browsing, and ingestion control.
000202: - Scheme/provider CRUD, equipment rental moderation, and bulk import orchestration.
000203: 
000204: Analytics:
000205: - Deterministic insight engine across growth/engagement/ops/market/opportunity dimensions.
000206: - Snapshot generation and trend retrieval.
000207: - Farmer summary and benchmark endpoints with access guards.
000208: 
000209: ## 3.4 Detailed Route Catalog
000210: 
000211: ### Auth Service (`/api/v1/auth`)
000212: - `POST /register` - creates a new user account from phone/password/name/role/language/email.
000213: - `POST /login` - authenticates with phone and password and returns access/refresh tokens.
000214: - `POST /refresh` - rotates access tokens using the refresh token and Redis-backed replay protection.
000215: - `GET /me` - returns the authenticated user's profile.
000216: - `PUT /me` - updates the authenticated user's basic profile fields.
000217: - `POST /change-password` - changes the current password after verifying the old password.
000218: - `POST /otp/send` - sends a one-time password to the supplied phone number.
000219: - `POST /otp/verify` - verifies an OTP challenge for the phone number.
000220: - `POST /reset-password` - resets the password after OTP verification.
000221: 
000222: ### Farmer Service (`/api/v1/farmers`)
000223: - `GET /me/profile` - returns the current farmer's profile document.
000224: - `POST /me/profile` - creates a profile for the authenticated farmer.
000225: - `PUT /me/profile` - updates the authenticated farmer's profile.
000226: - `DELETE /me/profile` - deletes the authenticated farmer's profile.
000227: - `GET /me/dashboard` - returns the aggregated farmer dashboard.
000228: - `GET /admin/` - admin-only paginated list of farmer profiles.
000229: - `GET /admin/{farmer_id}` - admin-only lookup for a specific farmer profile.
000230: 
000231: ### Crop Service (`/api/v1/crops`)
000232: - `GET /` - lists the authenticated farmer's crops.
000233: - `POST /` - adds a crop record for the current farmer.
000234: - `GET /{crop_id}` - fetches a single crop by ID with ownership checks.
000235: - `PUT /{crop_id}` - updates a crop record for the owning farmer.
000236: - `DELETE /{crop_id}` - deletes a crop record for the owning farmer.
000237: - `GET /cycles` - returns all crop cycles using the Redis-cached cycle service.
000238: - `GET /cycles/{name}` - returns crop cycles filtered by crop name.
000239: - `POST /recommendations` - returns crop recommendations from soil and season context.
000240: - `POST /disease/detect` - accepts an image upload and returns crop disease detection output.
000241: 
000242: ### Market Service (`/api/v1/market`)
000243: 
000244: Market price CRUD and live price reads are split across distinct route modules, so the exact trailing slash matters.
000245: 
000246: #### Market price CRUD (`services/market/routes/prices.py`, prefix `/prices`)
000247: - `GET /prices/` - lists recent market prices with crop/state/district/mandi filters and farmer-profile geo fallback.
000248: - `GET /prices/{price_id}` - fetches a single market price entry.
000249: - `POST /prices/` - admin-only create for a market price entry.
000250: - `PUT /prices/{price_id}` - admin-only update for a market price entry.
000251: - `DELETE /prices/{price_id}` - admin-only delete for a market price entry.
000252: 
000253: #### Mandi CRUD (`services/market/routes/mandis.py`, prefix `/mandis`)
000254: - `GET /mandis/` - lists mandis with state/district filters and farmer-profile geo fallback.
000255: - `GET /mandis/{mandi_id}` - fetches a single mandi record.
000256: - `POST /mandis/` - admin-only create for a mandi.
000257: - `PUT /mandis/{mandi_id}` - admin-only update for a mandi.
000258: - `DELETE /mandis/{mandi_id}` - admin-only delete for a mandi.
000259: 
000260: #### Scheme CRUD (`services/market/routes/schemes.py`, prefix `/schemes`)
000261: - `GET /schemes/` - lists stored government schemes with state/category/query/active filters.
000262: - `GET /schemes/{scheme_id}` - fetches a single scheme document.
000263: - `POST /schemes/` - admin-only create for a scheme document.
000264: - `PUT /schemes/{scheme_id}` - admin-only update for a scheme document.
000265: - `DELETE /schemes/{scheme_id}` - admin-only delete for a scheme document.
000266: - `POST /schemes/check-eligibility` - runs scheme eligibility checks for a farmer ID.
000267: 
000268: #### Document builder and built-in scheme reference flow (mounted at market service root)
000269: - `GET /schemes` - returns built-in scheme summaries, optionally filtered by category and state.
000270: - `GET /schemes/{scheme_name}` - returns full built-in scheme details.
000271: - `POST /sessions/start` - starts a document-builder session for a government scheme.
000272: - `POST /sessions/{session_id}/answer` - submits one batch of answers during the session.
000273: - `POST /sessions/{session_id}/extract` - extracts structured data from a base64-encoded document.
000274: - `GET /sessions/{session_id}` - returns the session state and accumulated progress.
000275: - `GET /sessions` - lists the current farmer's document-builder sessions.
000276: - `GET /sessions/{session_id}/download` - returns the generated application document for a completed session.
000277: - `POST /seed-schemes` - seeds built-in government schemes into MongoDB.
000278: - `POST /download-scheme-docs/{scheme_name}` - downloads all PDFs and documents for one scheme.
000279: - `POST /download-all-scheme-docs` - downloads documents for every built-in scheme.
000280: - `GET /scheme-docs/{scheme_name}` - lists downloaded documents for a specific scheme.
000281: - `GET /scheme-docs` - returns the global downloaded-document summary.
000282: - `GET /scheme-docs/{scheme_name}/file/{doc_name}` - serves one downloaded scheme document file.
000283: - `POST /extract-text` - extracts structured data from free-form text using LangExtract.
000284: 
000285: #### Live market reads and sync jobs (`services/market/routes/live_market.py`)
000286: - `GET /prices` - DB-first live price lookup with optional state/commodity/district filters and optional live refresh.
000287: - `GET /prices/all-india` - commodity price lookup across India, with DB-first fallback and live refresh support.
000288: - `GET /prices/bulk` - fetches bulk price data across major states and returns a per-state summary.
000289: - `GET /mandis` - DB-first mandi list lookup with optional live refresh.
000290: - `GET /msp` - returns all MSP values or a specific crop MSP when `crop` or `commodity` is supplied.
000291: - `GET /msp/all` - compatibility alias that returns the full MSP table.
000292: - `GET /msp/{commodity}` - returns the MSP for one commodity.
000293: - `POST /sync` - synchronizes live market data for selected states or a single commodity.
000294: - `POST /sync/full` - admin-only full sync for prices plus mandis.
000295: - `GET /commodities` - lists supported commodities.
000296: - `GET /states` - lists supported Indian states.
000297: 
000298: #### Weather and soil intelligence (`services/market/routes/weather_soil.py`)
000299: - `GET /weather/full` - returns the full weather payload for resolved coordinates.
000300: - `GET /weather/soil-composition` - returns soil composition for resolved coordinates.
000301: - `GET /weather/city` - returns weather by city string.
000302: - `GET /weather/coords` - returns weather by latitude/longitude.
000303: - `GET /weather/forecast/city` - returns a forecast by city string.
000304: - `GET /weather/forecast/coords` - returns a forecast by coordinates.
000305: - `GET /soil-moisture` - returns soil moisture data for a state, with optional district/year/month filters.
000306: 
000307: #### Reference data windows (`services/market/routes/ref_data.py`, prefix `/ref-data`)
000308: - `GET /ref-data/cold-storage` - returns cold-storage capacity reference data by state.
000309: - `GET /ref-data/reservoir` - returns reservoir reference data by state.
000310: - `GET /ref-data/msp-data` - returns MSP reference data from Mongo.
000311: - `GET /ref-data/mandi-directory` - returns mandi directory reference rows with optional state filtering.
000312: - `GET /ref-data/price-trends` - returns price-trend data for a commodity, optionally filtered by state and market.
000313: 
000314: ### Equipment Service (`/api/v1/equipment`)
000315: 
000316: This service registers four subrouters at the same service prefix. The repeated `GET /` entries below are intentionally grouped by module, and the hidden include_in_schema=False aliases are not counted separately.
000317: 
000318: #### Equipment CRUD (`services/equipment/routes/equipment.py`)
000319: - `GET /` - lists the authenticated farmer's equipment; `?browse=true` switches to marketplace browsing with geo fallback.
000320: - `POST /` - adds an equipment record for the current farmer.
000321: - `GET /{equipment_id}` - fetches one equipment item with ownership checks.
000322: - `PUT /{equipment_id}` - updates an equipment item with ownership checks.
000323: - `DELETE /{equipment_id}` - deletes an equipment item with ownership checks.
000324: 
000325: #### Rentals (`services/equipment/routes/rentals.py`)
000326: - `GET /` - lists rental requests for the current farmer.
000327: - `POST /` - creates a rental request for equipment.
000328: - `GET /{rental_id}` - fetches a rental request.
000329: - `PUT /{rental_id}/approve` - owner approves a rental request.
000330: - `PUT /{rental_id}/reject` - owner rejects a rental request.
000331: - `PUT /{rental_id}/complete` - owner marks a rental as complete.
000332: - `PUT /{rental_id}/cancel` - renter cancels a rental request.
000333: 
000334: #### Livestock (`services/equipment/routes/livestock.py`)
000335: - `GET /` - lists livestock for the authenticated farmer.
000336: - `POST /` - adds livestock for the current farmer.
000337: - `GET /{livestock_id}` - fetches one livestock record.
000338: - `PUT /{livestock_id}` - updates a livestock record.
000339: - `DELETE /{livestock_id}` - deletes a livestock record.
000340: 
000341: #### Rental rates (`services/equipment/routes/rental_rates.py`)
000342: - `GET /` - lists rental-rate intelligence for the current farmer.
000343: - `GET /categories` - returns supported equipment categories.
000344: - `GET /chc-info` - returns Custom Hiring Centre guidance.
000345: - `GET /search` - searches rental equipment by name, description, or category.
000346: - `GET /mechanization-stats` - returns mechanization percentage and tractor-density stats.
000347: - `GET /rate-history` - returns historical rate entries for a specific equipment name and optional state.
000348: - `GET /{equipment_name}` - returns rate details and provider rows for one equipment name.
000349: - `POST /seed` - seeds equipment rental data into MongoDB.
000350: - `POST /replace-seed` - replaces curated provider data from a JSON file path.
000351: - `POST /embed` - embeds equipment rental data into Qdrant.
000352: 
000353: ### Agent Service (`/api/v1/agent`)
000354: - `POST /chat` - single-shot chat with allocator-backed model selection and fallback logic.
000355: - `POST /chat/prepare` - starts a staged chat job and returns partial response metadata.
000356: - `POST /chat/finalize` - polls a staged chat job until it reaches completed, failed, or pending.
000357: - `GET /key-pool/status` - returns anonymized key-pool activity for admin monitoring.
000358: - `GET /sessions` - lists the current user's chat sessions.
000359: - `GET /sessions/{session_id}` - returns one chat session history.
000360: - `DELETE /sessions/{session_id}` - deletes one chat session.
000361: - `DELETE /sessions` - deletes all sessions for the current user.
000362: - `POST /search` - searches allowed embedding collections using the live embedding service.
000363: - `GET /conversations/` - lists the current user's conversation documents with pagination.
000364: - `GET /conversations/{session_id}` - returns the full stored conversation document.
000365: - `DELETE /conversations/{session_id}` - deletes one conversation document.
000366: 
000367: ### Voice Service (`/api/v1/voice`)
000368: - `POST /stt` - transcribes an uploaded audio file and returns transcript plus language code.
000369: - `POST /tts` - synthesizes speech from text and returns a WAV attachment.
000370: - `POST /tts/base64` - synthesizes speech and returns the audio as base64.
000371: - `POST /command` - full voice pipeline: STT -> agent response -> TTS, returning audio with transcript and latency headers.
000372: - `POST /command/text` - same full voice pipeline, but returns JSON with transcript, response text, base64 audio, language, and timing metadata.
000373: 
000374: ### Notification Service (`/api/v1/notifications`)
000375: - `GET /` - lists the current user's notifications with optional read-status filtering.
000376: - `GET /unread/count` - counts unread notifications for the current user.
000377: - `GET /{notification_id}` - fetches one notification with ownership enforcement.
000378: - `PUT /{notification_id}/read` - marks one notification as read.
000379: - `PUT /read-all` - marks every notification as read for the current user.
000380: - `DELETE /{notification_id}` - deletes one notification with ownership enforcement.
000381: - `POST /` - admin-only create notification endpoint.
000382: - `POST /broadcast` - admin-only broadcast notification endpoint.
000383: - `GET /preferences/` - returns the current user's notification preferences.
000384: - `PUT /preferences/` - updates the current user's notification preferences and validates alert limits.
000385: 
000386: ### Schemes Service (`/api/v1/schemes`)
000387: - `GET /` - lists government schemes with optional state, category, query, and active filters.
000388: - `GET /{scheme_id}` - fetches one government scheme.
000389: - `POST /` - admin-only create for a government scheme.
000390: - `PUT /{scheme_id}` - admin-only update for a government scheme.
000391: - `DELETE /{scheme_id}` - admin-only delete for a government scheme.
000392: - `POST /search` - searches schemes using the service-layer query flow.
000393: - `POST /eligibility-check` - checks eligibility for a farmer ID.
000394: - `GET /pmfby` - returns PMFBY reference data.
000395: - `GET /fertilizer-advisory` - returns fertilizer advisory data.
000396: - `GET /pesticide-advisory` - returns pesticide advisory data.
000397: 
000398: ### Geo Service (`/api/v1/geo`)
000399: - `GET /pin/{pincode}` - resolves a pincode to location details.
000400: - `POST /village/search` - fuzzy-searches villages via Qdrant.
000401: - `GET /district/{state}` - lists all districts for a state.
000402: - `GET /states` - lists all supported states.
000403: 
000404: ### Admin Service (`/api/v1/admin`)
000405: 
000406: This is the broadest operational surface in the backend. It mixes login, dashboard reads, moderation, collection browsing, reference CRUD, imports, ingestion controls, and admin user management.
000407: 
000408: #### Auth and dashboard
000409: - `POST /login` - authenticates an admin by email and password and returns access/refresh tokens.
000410: - `GET /stats` - returns the daily admin dashboard snapshot, falling back to a farmer count when no snapshot exists.
000411: - `GET /data-freshness` - returns the latest ingestion metadata per collection.
000412: 
000413: #### Generic collection browser
000414: - `GET /data/collection/{collection_name}` - generic admin collection browser used by the database explorer; whitelists browseable collections, strips password hashes for users/admins, supports search, and paginates results.
000415: 
000416: #### Farmer moderation
000417: - `GET /farmers` - paginated farmer list for admins.
000418: - `GET /farmers/{farmer_id}` - full farmer profile with attached profile document when present.
000419: - `PUT /farmers/{farmer_id}/status` - activates or suspends a farmer and writes an audit log entry.
000420: - `GET /farmers/{farmer_id}/conversations` - returns the farmer's agent conversation history.
000421: 
000422: #### Scheme management
000423: - `GET /data/schemes` - lists reference scheme rows.
000424: - `POST /data/schemes` - creates a scheme reference row and writes an audit log.
000425: - `PUT /data/schemes/{scheme_id}` - updates a scheme reference row.
000426: - `DELETE /data/schemes/{scheme_id}` - soft-deletes a scheme by setting `is_active=false`.
000427: 
000428: #### Equipment provider management
000429: - `GET /data/equipment-providers` - lists reference equipment provider rows.
000430: - `POST /data/equipment-providers` - creates a provider row and normalizes contact phone aliases.
000431: - `PUT /data/equipment-providers/{rental_id}` - updates a provider row and logs the edited field set.
000432: - `DELETE /data/equipment-providers/{rental_id}` - deactivates a provider row instead of hard-deleting it.
000433: - `GET /data/equipment-providers/search` - searches provider rows by query, state, category, and active flag.
000434: - `POST /data/equipment-rate-history` - creates a rate-history entry keyed by equipment, state, and period.
000435: - `GET /data/equipment-rate-history` - lists rate-history entries filtered by equipment name and state.
000436: 
000437: #### Rental moderation and equipment stats
000438: - `GET /rentals` - lists bookings with optional status filter.
000439: - `GET /rentals/{rental_id}` - fetches one booking.
000440: - `PUT /rentals/{rental_id}/force-status` - super-admin-only override for booking status plus reason tracking and audit logging.
000441: - `GET /equipment/stats` - returns marketplace stats across listings, bookings, and provider coverage.
000442: 
000443: #### Import and ingestion control
000444: - `POST /data/import/schemes` - bulk-imports schemes from a curated file and logs the import outcome.
000445: - `POST /data/import/equipment` - bulk-imports equipment providers from a curated file and logs the import outcome.
000446: - `GET /data/mandi-prices` - browses reference mandi-price rows with state and commodity filters.
000447: - `GET /ingestion/logs` - lists ingestion metadata documents.
000448: - `POST /ingestion/trigger/{script_name}` - super-admin-only trigger for allowed ingestion scripts.
000449: 
000450: #### Analytics and configuration
000451: - `GET /analytics/overview` - returns a date-based analytics snapshot or a fallback message when missing.
000452: - `GET /config` - returns the global app config document or a default config stub.
000453: - `PUT /config` - updates the global app config.
000454: - `PUT /config/feature-flags` - updates global feature flags.
000455: 
000456: #### Admin user management
000457: - `GET /admins` - lists admin users without password hashes.
000458: - `POST /admins` - creates a new admin user after duplicate-email checks.
000459: - `PUT /admins/{admin_id}/status` - toggles admin active status.
000460: 
000461: ### Analytics Service (`/api/v1/analytics`)
000462: - `GET /overview` - builds the full admin insight overview.
000463: - `GET /insights/kpis` - returns the scorecard view for dashboard cards.
000464: - `GET /insights/engagement` - returns engagement and growth-trend slices.
000465: - `GET /insights/operational` - returns operational-health slices.
000466: - `GET /insights/opportunities` - returns opportunity and recommendation slices.
000467: - `GET /insights/market` - returns market-intelligence slices.
000468: - `GET /insights/equipment` - returns equipment-marketplace insights.
000469: - `GET /insights/recommendations` - returns prioritized admin recommendations.
000470: - `GET /segments/farmers` - returns farmer segmentation buckets for outreach planning.
000471: - `GET /trends` - returns growth trends.
000472: - `POST /snapshots/generate` - generates and persists a dated analytics snapshot.
000473: - `GET /snapshots/{date}` - fetches one persisted analytics snapshot.
000474: - `GET /snapshots/trends` - returns recent snapshots for historical comparison.
000475: - `GET /farmer/{farmer_id}/summary` - returns a farmer-specific insight summary for self-access or admins.
000476: - `GET /farmer/{farmer_id}/benchmarks` - returns a farmer-specific benchmark comparison for self-access or admins.
000477: - `GET /overview/live` - returns the live admin overview using the default 30-day window.
000478: - `GET /overview/today` - returns today's persisted snapshot.
000479: 
000480: ### Operational note
000481: - The market, equipment, and admin services now carry the most route surface area and the most frequent backend changes. Any frontend or integration work should prefer the exact path strings above, especially where the same stem appears in both CRUD and live-data routers.
000482: 
000483: ## 4. Shared Library Deep Structure
000484: 
000485: Source: `shared/info.txt` and schema source files.
000486: 
000487: ## 4.1 Shared modules
000488: 
000489: - `shared/auth`: JWT helpers and auth dependency guards.
000490: - `shared/cache`: market cache helpers.
000491: - `shared/core`: settings + constants/enums.
000492: - `shared/db`: Mongo compat abstraction and Redis connectors.
000493: - `shared/errors`: error codes, exception constructors, global handlers.
000494: - `shared/middleware`: logging/security/rate-limiter middleware.
000495: - `shared/patterns`: service client, circuit breaker, bloom filters.
000496: - `shared/schemas`: centralized contracts for all services.
000497: - `shared/services`: key allocator + knowledge base + Qdrant service.
000498: 
000499: ## 4.2 Core constants and system contracts
000500: 
000501: File: `shared/core/constants.py`
000502: 
000503: Defines:
000504: - Mongo collection canonical names (`MongoCollections`).
000505: - Qdrant collection canonical names (`Qdrant`).
000506: - embedding dimension (`EMBEDDING_DIM = 768`).
000507: - user roles (`farmer`, `admin`, `super_admin`, `agent`).
000508: - supported language map and pagination defaults.
000509: 
000510: ## 5. Database Structure (Mongo)
000511: 
000512: Source: `shared/core/constants.py`, routes/services behavior, schema contracts.
000513: 
000514: ## 5.1 Collection families
000515: 
000516: Operational domain collections:
000517: - `users`, `farmer_profiles`, `crops`, `crop_cycles`, `livestock`
000518: - `market_prices`, `mandis`
000519: - `equipment`, `equipment_bookings`, `equipment_rental_rates`
000520: - `notifications`, `notification_preferences`
000521: - `agent_conversations`, `voice_sessions`, `chat_messages`, `chat_sessions`
000522: - `documents`, `document_builder_sessions`
000523: - `calendar_events`, `feedback`, `farmer_feedback`, `health_records`, `crop_expenses`
000524: 
000525: Reference data collections (`ref_*`):
000526: - `ref_mandi_prices`, `ref_mandi_directory`, `ref_msp_prices`
000527: - `ref_farmer_schemes`, `ref_equipment_providers`
000528: - `ref_soil_health`, `ref_cold_storage`, `ref_reservoir_data`
000529: - `ref_crop_varieties`, `ref_pmfby_data`
000530: - `ref_fertilizer_data`, `ref_pesticide_advisory`, `ref_fasal_data`
000531: - `ref_pin_master`, `ref_data_ingestion_meta`
000532: 
000533: Governance and admin collections:
000534: - `admin_users`, `admin_audit_logs`, `app_config`, `analytics_snapshots`, `support_tickets`
000535: 
000536: ## 5.2 Field-level schema contracts by functionality
000537: 
000538: Note: request/response schemas are contracts; persisted docs can carry additional service metadata fields.
000539: 
000540: Auth and identity (schemas in `shared/schemas/auth.py`):
000541: - RegisterRequest:
000542:   - `phone:str`, `password:str`, `name:str`, `email?:str`, `role:farmer`, `language:str`
000543: - LoginRequest:
000544:   - `phone:str`, `password:str`
000545: - RefreshRequest:
000546:   - `refresh_token:str`
000547: - ChangePasswordRequest:
000548:   - `current_password:str`, `new_password:str`
000549: - OTPRequest:
000550:   - `phone:str`
000551: - OTPVerify:
000552:   - `phone:str`, `otp:str`
000553: - ResetPasswordRequest:
000554:   - `phone:str`, `otp:str`, `new_password:str`
000555: - UserUpdateRequest:
000556:   - `name?:str`, `email?:str`, `language?:str`
000557: 
000558: Farmer profile (`shared/schemas/farmer.py`):
000559: - FarmerProfileCreate/Update fields:
000560:   - `village`, `district`, `state`, `pin_code`, `land_size_acres`, `soil_type`, `irrigation_type`, `language`
000561: 
000562: Crop (`shared/schemas/crop.py`):
000563: - CropCreate/Update fields:
000564:   - `name`, `season`, `area_acres`, `sowing_date`, `expected_harvest_date`, `variety`
000565: 
000566: Equipment and rental (`shared/schemas/equipment.py`):
000567: - EquipmentCreate/Update:
000568:   - `name`, `description`, `rate_per_hour`, `available`
000569: - EquipmentRecordCreate/Update:
000570:   - `name`, `type`, `status`, `rate_per_hour`, `rate_per_day`, `location`, `contact_phone`, `description`
000571: - BookingCreate:
000572:   - `equipment_id`, `start_date`, `end_date`, `notes`
000573: - RentalRequestCreate:
000574:   - `equipment_id`, `start_date`, `end_date`, `message`
000575: 
000576: Livestock (`shared/schemas/livestock.py`):
000577: - LivestockCreate/Update:
000578:   - `animal_type`, `breed`, `count`, `age_months`, `health_status`
000579: - LivestockRecordCreate/Update:
000580:   - `type`, `breed`, `count`, `health_status`
000581: 
000582: Market (`shared/schemas/market.py`):
000583: - Query contract (MandiPriceQuery):
000584:   - `commodity`, `state`, `district`, `market`, `days`, `limit`
000585: - Response contract (MandiPriceResponse):
000586:   - `state`, `district`, `market`, `commodity`, `variety`, `grade`, `arrival_date`, `min_price`, `max_price`, `modal_price`
000587: - Trend contract (PriceTrendResponse):
000588:   - `commodity`, `market`, `state`, `district`, `days`, `avg_modal_price`, `trend`, `price_points`
000589: - Admin upsert contracts:
000590:   - AdminPriceUpsert: `crop_name`, `mandi_name`, `state`, `district`, `modal_price`, `min_price`, `max_price`, `date`, `source`
000591:   - AdminMandiUpsert: `name`, `state`, `district`, `latitude`, `longitude`, `address`, `source`
000592:   - AdminSchemeUpsert: `name`, `description`, `category`, `state`, `is_active`
000593: 
000594: Schemes (`shared/schemas/scheme.py`):
000595: - SchemeSearchRequest:
000596:   - `query`, `state`, `ministry`, `limit`
000597: - SchemeResponse:
000598:   - `scheme_id`, `title`, `summary`, `ministry`, `eligibility`, `how_to_apply`, `official_links`, `document_links`, `beneficiary_state`, `categories`, `tags`, `contact_numbers`, `contact_emails`, `required_documents`, `similarity_score`
000599: - SchemeEligibilityRequest:
000600:   - `scheme_id`, `farmer_state`, `land_size_acres`
000601: 
000602: Geo (`shared/schemas/geo.py`):
000603: - VillageSearchRequest:
000604:   - `query`, `state`, `limit`
000605: - PinCodeResponse fields:
000606:   - `pincode`, `state_name`, `district_name`, `subdistrict_name`, `village_name`, `state_code`, `district_code`, `village_code`
000607: 
000608: Notification (`shared/schemas/notification.py`):
000609: - PriceAlert:
000610:   - `commodity`, `market`, `threshold_price`, `direction`
000611: - NotificationPreferencesUpdate:
000612:   - `price_alerts`, `scheme_alerts`, `crop_advisories`, `language`
000613: - CreateNotificationRequest:
000614:   - `user_id`, `title`, `message`, `type(alias)->notification_type`, `data`
000615: - BroadcastRequest:
000616:   - `title`, `message`, `role`, `target_states`, `type(alias)->notification_type`
000617: 
000618: Agent contracts (`shared/schemas/agent.py`):
000619: - ChatRequest:
000620:   - `message`, `session_id`, `language`
000621: - ChatResponse:
000622:   - `session_id`, `message`, `agents_used`, `tools_called`, `latency_ms`
000623: - ConversationMessage:
000624:   - `role`, `content`, `agent_used`, `tools_called`, `latency_ms`, `timestamp`
000625: 
000626: Route-local staged chat contracts (`services/agent/routes/chat.py`):
000627: - ChatPrepareRequest:
000628:   - `message`, `session_id`, `language`, `farmer_id`
000629: - ChatFinalizeRequest:
000630:   - `request_id`, `timeout_ms`
000631: - Prepare flow response:
000632:   - returns `request_id`, `partial_response`, and `status` (`in_progress` or `completed`)
000633: - Finalize flow response:
000634:   - returns `status` (`completed`, `in_progress`, or `failed`), plus merged final payload when completed
000635: 
000636: Admin contracts (`shared/schemas/admin.py`):
000637: - AdminLoginRequest, AdminUserCreate/Response
000638: - AppConfigUpdate/Response
000639: - FarmerStatusUpdate
000640: - BulkImportRequest
000641: - SchemeUpsertRequest
000642: - ProviderUpsertRequest
000643: - FeatureFlagsUpdate
000644: - AuditLogEntry
000645: - DataFreshnessResponse
000646: - AnalyticsOverview
000647: 
000648: Analytics contracts (`shared/schemas/analytics.py`):
000649: - MetricPoint: `date`, `value`
000650: - InsightCard: `title`, `value`, `delta`, `trend`, `context`
000651: - AdminInsightOverview: `window_days`, `generated_at`, `scorecard`, `growth_trends`, `engagement`, `operational_health`, `market_intelligence`, `opportunities`, `recommendations`
000652: - FarmerInsightSummary: `farmer_id`, `generated_at`, `totals`, `activity`, `benchmarks`, `recommendations`
000653: 
000654: ## 6. Qdrant Structure and Vector Responsibilities
000655: 
000656: Collection constants (`shared/core/constants.py`):
000657: - legacy: `crop_knowledge`, `scheme_knowledge`, `market_knowledge`, `farming_general`
000658: - current semantic indexes:
000659:   - `schemes_semantic`
000660:   - `schemes_faq`
000661:   - `mandi_price_intelligence`
000662:   - `crop_advisory_kb`
000663:   - `geo_location_index`
000664:   - `equipment_semantic`
000665: 
000666: Embedding model:
000667: - multilingual mpnet variant with vector dimension 768.
000668: 
000669: Indexing sources:
000670: - scripts (`scripts/generate_qdrant_indexes.py`)
000671: - worker task `refresh_qdrant_indexes`
000672: - runtime service helpers in `shared/services/qdrant_service.py` and `shared/services/knowledge_base_service.py`
000673: 
000674: Compatibility hardening:
000675: - Search logic supports both old `search` and newer `query_points` Qdrant client APIs.
000676: 
000677: ## 7. Worker, Cron, and Background Jobs
000678: 
000679: Celery app:
000680: - `workers/celery_app.py`
000681: - broker/backend from env (`CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`)
000682: - task tracking enabled, late ack enabled, prefetch 1.
000683: 
000684: Tasks:
000685: - `workers/tasks/data_tasks.py`
000686:   - `refresh_qdrant_indexes`
000687:   - `generate_analytics_snapshot`
000688:   - `check_price_alerts`
000689: - `workers/tasks/embedding_tasks.py`
000690:   - `embed_text`
000691:   - `embed_batch`
000692: - `workers/tasks/notification_tasks.py`
000693:   - `send_notification`
000694:   - `send_broadcast`
000695: 
000696: Cron setup script:
000697: - `scripts/setup_cron.sh`
000698: - configured jobs:
000699:   - 02:00 IST seed reference data
000700:   - 02:30 IST rebuild Qdrant indexes
000701:   - 03:00 IST generate analytics snapshots
000702: 
000703: ## 8. Scripts, Tests, and Operational Tooling
000704: 
000705: Scripts inventory:
000706: - `scripts/info.txt` documents 51 script/data files.
000707: - includes ingestion generators, seeders, Qdrant builders, curated replacement scripts.
000708: - hardening runbook scripts:
000709:   - `scripts/fix_and_audit_data_quality.py`
000710:   - `scripts/build_production_indexes.py`
000711:   - `scripts/generate_qdrant_indexes.py`
000712:   - `scripts/build_qdrant_payload_indexes.py`
000713:   - outputs written to audit/report artifacts under `scripts/*.json`
000714: 
000715: Tests inventory:
000716: - `tests/info.txt` documents:
000717:   - endpoint integration suite (`test_all_endpoints.py`)
000718:   - feature E2E suite (`test_e2e_new_features.py`)
000719:   - dynamic pentest (`test_dynamic_pentest.py`)
000720: 
000721: Security/pentest focus points covered:
000722: - refresh replay protection
000723: - admin-only sensitive route checks
000724: - CORS permissiveness checks
000725: - forged default-secret token rejection
000726: 
000727: ## 9. Runtime Tree Snapshot (backend scope)
000728: 
000729: Top-level tree (`kisankiawaz-backend`):
000730: - `.env`, `.env.example`
000731: - `docker-compose.yml`, `docker-compose.prod.yml`
000732: - `Dockerfile.base`
000733: - `nginx/`
000734: - `services/`
000735: - `shared/`
000736: - `workers/`
000737: - `scripts/`
000738: - `tests/`
000739: - `creds/`
000740: 
000741: Services tree:
000742: - `services/admin`
000743: - `services/agent`
000744: - `services/analytics`
000745: - `services/auth`
000746: - `services/crop`
000747: - `services/equipment`
000748: - `services/farmer`
000749: - `services/geo`
000750: - `services/market`
000751: - `services/notification`
000752: - `services/schemes`
000753: - `services/voice`
000754: 
000755: Shared tree:
000756: - `shared/auth`
000757: - `shared/cache`
000758: - `shared/core`
000759: - `shared/db`
000760: - `shared/errors`
000761: - `shared/middleware`
000762: - `shared/patterns`
000763: - `shared/schemas`
000764: - `shared/services`
000765: 
000766: Workers tree:
000767: - `workers/celery_app.py`
000768: - `workers/tasks/data_tasks.py`
000769: - `workers/tasks/embedding_tasks.py`
000770: - `workers/tasks/notification_tasks.py`
000771: 
000772: For full recursive script/test inventories, see:
000773: - `scripts/info.txt`
000774: - `tests/info.txt`
000775: - `services/info.txt`
000776: - `shared/info.txt`
000777: 
000778: ## 10. Practical Notes for Frontend and Integrators
000779: 
000780: - Always call through gateway (`:8000`) in integrated environments.
000781: - Prefer shared schema contracts for request construction and response typing.
000782: - Admin and analytics endpoints are heavily role-guarded; design auth-aware UX fallbacks for 401/403 states.
000783: - Voice responses now include latency and provenance metadata; consume these for debugging and UX telemetry.
000784: - For market/equipment/schemes, many endpoints include strict->relaxed fallback behavior; source fields in payloads should be surfaced in UI for trust and traceability.
000785: 
000786: ## 11. Security Features Implemented (Production-Grade)
000787: 
000788: This section consolidates all major security controls now active in the backend.
000789: 
000790: ### 11.1 Authentication and token security
000791: 
000792: - JWT access/refresh token model is implemented in shared auth utilities.
000793: - Refresh tokens include unique `jti` values and are replay-protected in Redis.
000794: - Used refresh tokens are revoked for full refresh TTL to block reuse.
000795: - Role-aware identity lookup is enforced (`users` vs `admin_users`).
000796: - Inactive users are denied token refresh/login continuation.
000797: 
000798: ### 11.2 Credential and secret hardening
000799: 
000800: - `JWT_SECRET` policy is validated at startup in production-like environments.
000801: - Weak/default JWT secrets are explicitly rejected when `APP_ENV` is production/staging-like.
000802: - Minimum JWT secret length is enforced for production-like runs.
000803: - Wildcard CORS (`*`) is rejected in production-like mode.
000804: 
000805: ### 11.3 OTP abuse prevention controls
000806: 
000807: - OTP TTL control is enforced (5-minute validity window).
000808: - OTP send cooldown is enforced to reduce spam/replay attempts.
000809: - OTP verification attempt counters are tracked.
000810: - Lockout window is applied after repeated invalid OTP attempts.
000811: - OTP attempts and lock states are persisted in Redis for centralized enforcement.
000812: 
000813: ### 11.4 Rate limiting and gateway traffic protection
000814: 
000815: - Gateway-level rate limiting in Nginx with dedicated zones:
000816:   - auth-sensitive routes
000817:   - standard API routes
000818:   - admin routes
000819: - Service-level Redis sliding-window rate limiter middleware is implemented.
000820: - Retry-After headers are returned on 429 responses.
000821: - Safe-fail behavior allows requests if Redis limiter backend is temporarily unavailable.
000822: 
000823: ### 11.5 HTTP response security headers
000824: 
000825: - Security headers middleware injects:
000826:   - `X-Content-Type-Options: nosniff`
000827:   - `X-Frame-Options: DENY`
000828:   - `X-XSS-Protection: 1; mode=block`
000829:   - `Strict-Transport-Security`
000830:   - `Referrer-Policy`
000831: 
000832: ### 11.6 API surface protection and role guarding
000833: 
000834: - Admin-only route families are separated and role-guarded.
000835: - Sensitive internal diagnostics (for example key-pool status) are protected from non-admin callers.
000836: - Farmer self-access checks are applied where user-scoped analytics data is returned.
000837: 
000838: ### 11.7 Error handling and information exposure control
000839: 
000840: - Centralized exception handler standardizes error responses.
000841: - Unexpected exceptions return generic `INTERNAL_ERROR` without leaking internals.
000842: - Domain exceptions return explicit typed error codes.
000843: - `FIREBASE_ERROR` exists only as a legacy alias and is no longer default runtime behavior.
000844: 
000845: ### 11.8 Security verification coverage
000846: 
000847: Dynamic security tests include:
000848: - refresh token replay rejection
000849: - non-admin denial on admin-sensitive endpoint
000850: - CORS permissiveness checks
000851: - forged default-secret JWT rejection
000852: 
000853: ## 12. Validation and Pydantic Contract Strategy
000854: 
000855: ### 12.1 Contract-first API design
000856: 
000857: - Shared schema package acts as the single source of request/response contracts.
000858: - Service routes increasingly consume typed request models instead of raw unvalidated dictionaries.
000859: - Contract updates are centralized in shared schemas to prevent drift.
000860: 
000861: ### 12.2 Input validation strictness
000862: 
000863: - Pydantic strict mode is enabled widely across schema models.
000864: - Many request models enforce `extra = forbid` to block undocumented payload fields.
000865: - Field-level constraints are defined with explicit bounds, for example:
000866:   - lengths for strings
000867:   - numeric minimums/maximums
000868:   - enum/literal constraints for controlled values
000869: - Aliased fields (for example notification type fields) are normalized with explicit model config.
000870: 
000871: ### 12.3 Domain-specific typed payload migration
000872: 
000873: Recent typed migration examples include:
000874: - auth profile update payload typed (`UserUpdateRequest`)
000875: - equipment/livestock create-update payloads typed
000876: - market admin CRUD payloads typed (`AdminPriceUpsert`, `AdminMandiUpsert`, `AdminSchemeUpsert`)
000877: - notification create/broadcast payloads typed
000878: - analytics response contracts typed (`AdminInsightOverview`, `FarmerInsightSummary`)
000879: 
000880: ### 12.4 Business-layer defensive validation
000881: 
000882: Beyond route-level schema checks, service-layer defenses include:
000883: - field allowlists before persistence updates
000884: - required-field checks before create operations
000885: - ownership checks for farmer-owned entities
000886: - invalid/no-op update rejection (`No valid fields to update` pattern)
000887: 
000888: ### 12.5 Why this matters for frontend and integrators
000889: 
000890: - Predictable validation failures enable reliable form-level error UX.
000891: - Strong schema contracts reduce integration ambiguity between frontend/backend.
000892: - Payload strictness lowers accidental API misuse and hidden bug classes.
000893: 
000894: ## 13. Engineering Practices Followed (Industry-Level)
000895: 
000896: ### 13.1 Architecture and modularity
000897: 
000898: - Clear microservice boundaries by business domain.
000899: - Shared library pattern for cross-cutting concerns (auth, db, middleware, errors, schemas).
000900: - Gateway-first routing model with centralized ingress controls.
000901: 
000902: ### 13.2 Reliability and compatibility
000903: 
000904: - Backward-compatible handling for Qdrant client API evolution (`search` and `query_points`).
000905: - Graceful fallback patterns in data-heavy endpoints (strict -> relaxed matching).
000906: - Defensive default handling in external API unavailability cases.
000907: 
000908: ### 13.3 Data and infra hygiene
000909: 
000910: - Mongo-only runtime path after Firestore removal.
000911: - Ref-data ingestion and freshness metadata tracking.
000912: - Distinct reference collections (`ref_*`) to separate canonical/static data from transactional data.
000913: - Production compose profile keeps only gateway externally exposed.
000914: 
000915: ### 13.4 Operational observability
000916: 
000917: - Request logging middleware across services.
000918: - Health endpoints and container healthchecks per service.
000919: - Structured latency and provenance metadata in voice flows.
000920: - Audit and info inventory files maintained for service/shared/scripts/tests modules.
000921: 
000922: ### 13.5 Testing posture
000923: 
000924: - Broad endpoint integration coverage.
000925: - E2E feature flows across major domains.
000926: - Dedicated dynamic pentest script for auth and exposure controls.
000927: 
000928: ### 13.6 Delivery discipline
000929: 
000930: - Centralized env template with explicit runtime and test variables.
000931: - Shared schemas exported from one index to reduce import drift.
000932: - Docker base-layer reuse for reproducible builds and reduced variance.
000933: 
000934: ## 14. Recommended Next Hardening Steps (Optional)
000935: 
000936: These are not gaps in core functionality, but common enterprise next steps:
000937: 
000938: - Add static analysis and schema-drift checks in CI pipeline.
000939: - Add OpenAPI contract snapshot tests for breaking-change detection.
000940: - Add secret scanning and dependency CVE checks in build pipeline.
000941: - Add distributed tracing headers across gateway and service clients.
000942: - Add formal threat-model notes per critical route family (auth/admin/voice).
000943: 
000944: 
000945: File Tree: 
000946: â”œâ”€â”€ .dockerignore
000947: â”œâ”€â”€ .env
000948: â”œâ”€â”€ .env.example
000949: â”œâ”€â”€ .gitignore
000950: â”œâ”€â”€ .pytest_cache
000951: â”‚   â”œâ”€â”€ .gitignore
000952: â”‚   â”œâ”€â”€ CACHEDIR.TAG
000953: â”‚   â”œâ”€â”€ README.md
000954: â”‚   â””â”€â”€ v
000955: â”‚       â””â”€â”€ cache
000956: â”‚           â”œâ”€â”€ lastfailed
000957: â”‚           â””â”€â”€ nodeids
000958: â”œâ”€â”€ BACKEND_SYSTEM_DETAILED_REFERENCE.md
000959: â”œâ”€â”€ Dockerfile.base
000960: â”œâ”€â”€ creds
000961: â”‚   â”œâ”€â”€ KisanKiAwaaz.postman_collection.json
000962: â”‚   â”œâ”€â”€ creds_gcp.json
000963: â”‚   â”œâ”€â”€ creds_gcpO.json
000964: â”‚   â””â”€â”€ serviceAccountKey.json
000965: â”œâ”€â”€ docker-compose.prod.yml
000966: â”œâ”€â”€ docker-compose.yml
000967: â”œâ”€â”€ nginx
000968: â”‚   â”œâ”€â”€ Dockerfile
000969: â”‚   â”œâ”€â”€ info.txt
000970: â”‚   â””â”€â”€ nginx.conf
000971: â”œâ”€â”€ requirements-base.txt
000972: â”œâ”€â”€ scripts
000973: â”‚   â”œâ”€â”€ __pycache__
000974: â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
000975: â”‚   â”‚   â”œâ”€â”€ generate_analytics_snapshots.cpython-312.pyc
000976: â”‚   â”‚   â”œâ”€â”€ generate_qdrant_indexes.cpython-312.pyc
000977: â”‚   â”‚   â”œâ”€â”€ reset_firestore.cpython-312.pyc
000978: â”‚   â”‚   â”œâ”€â”€ seed.cpython-312.pyc
000979: â”‚   â”‚   â”œâ”€â”€ seed_admin.cpython-312.pyc
000980: â”‚   â”‚   â”œâ”€â”€ seed_farmers_end_to_end.cpython-312.pyc
000981: â”‚   â”‚   â””â”€â”€ seed_reference_data.cpython-312.pyc
000982: â”‚   â”œâ”€â”€ data_ingestion
000983: â”‚   â”‚   â”œâ”€â”€ __pycache__
000984: â”‚   â”‚   â”‚   â”œâ”€â”€ generate_data_gov_extraction_snapshots.cpython-312.pyc
000985: â”‚   â”‚   â”‚   â”œâ”€â”€ generate_farmer_schemes_data.cpython-312.pyc
000986: â”‚   â”‚   â”‚   â”œâ”€â”€ generate_legacy_api_feeds.cpython-312.pyc
000987: â”‚   â”‚   â”‚   â”œâ”€â”€ generate_master_reference_tables.cpython-312.pyc
000988: â”‚   â”‚   â”‚   â”œâ”€â”€ generate_recovery_pipeline_data.cpython-312.pyc
000989: â”‚   â”‚   â”‚   â””â”€â”€ generate_staging_backfill_data.cpython-312.pyc
000990: â”‚   â”‚   â”œâ”€â”€ generate_data_gov_extraction_snapshots.py
000991: â”‚   â”‚   â”œâ”€â”€ generate_farmer_schemes_data.py
000992: â”‚   â”‚   â”œâ”€â”€ generate_legacy_api_feeds.py
000993: â”‚   â”‚   â”œâ”€â”€ generate_master_reference_tables.py
000994: â”‚   â”‚   â”œâ”€â”€ generate_recovery_pipeline_data.py
000995: â”‚   â”‚   â”œâ”€â”€ generate_staging_backfill_data.py
000996: â”‚   â”‚   â””â”€â”€ info.txt
000997: â”‚   â”œâ”€â”€ generate_qdrant_indexes.py
000998: â”‚   â”œâ”€â”€ info.txt
000999: â”‚   â”œâ”€â”€ replace_equipment_providers_from_json.py
001000: â”‚   â”œâ”€â”€ replace_schemes_from_json.py
001001: â”‚   â”œâ”€â”€ reports
001002: â”‚   â”‚   â”œâ”€â”€ data_assets
001003: â”‚   â”‚   â”‚   â””â”€â”€ audit
001004: â”‚   â”‚   â”‚       â”œâ”€â”€ seed_farmers_end_to_end_report.json
001005: â”‚   â”‚   â”‚       â””â”€â”€ seeded_farmers_credentials.csv
001006: â”‚   â”‚   â”œâ”€â”€ data_gov_extraction_snapshots
001007: â”‚   â”‚   â”‚   â”œâ”€â”€ 35985678-0d79-46b4-9ed6-6f13308a1d24.csv
001008: â”‚   â”‚   â”‚   â”œâ”€â”€ 4554a3c8-74e3-4f93-8727-8fd92161e345.csv
001009: â”‚   â”‚   â”‚   â””â”€â”€ 9ef84268-d588-465a-a308-a864a43d0070.csv
001010: â”‚   â”‚   â”œâ”€â”€ equipment_rental_pan_india_2026.json
001011: â”‚   â”‚   â”œâ”€â”€ farmer_schemes_data
001012: â”‚   â”‚   â”‚   â””â”€â”€ farmer_schemes_master.csv
001013: â”‚   â”‚   â”œâ”€â”€ legacy_api_feeds
001014: â”‚   â”‚   â”‚   â”œâ”€â”€ mandi_directory_derived_geocoded.csv
001015: â”‚   â”‚   â”‚   â””â”€â”€ vegetable_api_pulls.csv
001016: â”‚   â”‚   â”œâ”€â”€ master_reference_tables
001017: â”‚   â”‚   â”‚   â”œâ”€â”€ mandi_directory_india.csv
001018: â”‚   â”‚   â”‚   â””â”€â”€ manual_rental_providers.csv
001019: â”‚   â”‚   â”œâ”€â”€ recovery_pipeline_data
001020: â”‚   â”‚   â”‚   â”œâ”€â”€ agromet
001021: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 049d64ee-24ed-483f-b84f-00b525516552.csv
001022: â”‚   â”‚   â”‚   â”œâ”€â”€ arrivals
001023: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 02e72f1b-d82d-4512-a105-7b4373d6fa85.csv
001024: â”‚   â”‚   â”‚   â”œâ”€â”€ cold_storage
001025: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ a75195de-8cd6-4ecf-a818-54c761dfa24a.csv
001026: â”‚   â”‚   â”‚   â”œâ”€â”€ cost_cultivation
001027: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 48bcec64-5573-4f3d-b38e-c474253a6a9d.csv
001028: â”‚   â”‚   â”‚   â”œâ”€â”€ crop_yield_varieties
001029: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ 7b9f57f0-5f8a-4442-9759-352dacb9d71b.csv
001030: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ cf80173e-fece-439d-a0b1-6e9cb510593d.csv
001031: â”‚   â”‚   â”‚   â”œâ”€â”€ fasal
001032: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 14f6f0d0-311d-4b71-acfe-ac08bbecfd1c.csv
001033: â”‚   â”‚   â”‚   â”œâ”€â”€ fertilizer
001034: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 5c2f62fe-5afa-4119-a499-fec9d604d5bd.csv
001035: â”‚   â”‚   â”‚   â”œâ”€â”€ fpo
001036: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 28287ce1-424a-4c43-85f4-de8a38924a69.csv
001037: â”‚   â”‚   â”‚   â”œâ”€â”€ groundwater
001038: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 6f81905b-5c66-458f-baa3-74f870de5cd0.csv
001039: â”‚   â”‚   â”‚   â”œâ”€â”€ kcc
001040: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 2bbff406-a8a8-4920-90c3-095adebf531f.csv
001041: â”‚   â”‚   â”‚   â”œâ”€â”€ labour_wages
001042: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 67722646-54ac-4b26-b73e-124d4bc22bda.csv
001043: â”‚   â”‚   â”‚   â”œâ”€â”€ market_prices
001044: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 9ef84268-d588-465a-a308-a864a43d0070.csv
001045: â”‚   â”‚   â”‚   â”œâ”€â”€ msp
001046: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 5e6056c8-b644-40a8-a346-3da6b3d8e67e.csv
001047: â”‚   â”‚   â”‚   â”œâ”€â”€ pesticides
001048: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ 7c568619-b9b4-40bb-b563-68c28c27a6c1.csv
001049: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 98a33686-715f-4076-97da-fa3dcf6bc61b.csv
001050: â”‚   â”‚   â”‚   â”œâ”€â”€ pin_master
001051: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ f17a1608-5f10-4610-bb50-a63c80d83974.csv
001052: â”‚   â”‚   â”‚   â”œâ”€â”€ pmfby
001053: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ a330e681-6562-4552-a94b-58f1df7eccf3.csv
001054: â”‚   â”‚   â”‚   â”œâ”€â”€ reservoir
001055: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 247146af-5216-47ff-80f6-ddea261f1139.csv
001056: â”‚   â”‚   â”‚   â”œâ”€â”€ soil_health
001057: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ 4554a3c8-74e3-4f93-8727-8fd92161e345.csv
001058: â”‚   â”‚   â”‚   â””â”€â”€ supporting_assets
001059: â”‚   â”‚   â”‚       â””â”€â”€ recovery_generation_report.csv
001060: â”‚   â”‚   â”œâ”€â”€ scheme.json
001061: â”‚   â”‚   â””â”€â”€ staging_backfill_data
001062: â”‚   â”‚       â”œâ”€â”€ 4554a3c8-74e3-4f93-8727-8fd92161e345.csv
001063: â”‚   â”‚       â”œâ”€â”€ all_data_gov_rows.csv
001064: â”‚   â”‚       â””â”€â”€ mandi_master_derived_geocoded.csv
001065: â”‚   â”œâ”€â”€ seed.py
001066: â”‚   â”œâ”€â”€ seed_admin.py
001067: â”‚   â”œâ”€â”€ seed_farmers_end_to_end.py
001068: â”‚   â”œâ”€â”€ seed_reference_data.py
001069: â”‚   â””â”€â”€ setup_cron.sh
001070: â”œâ”€â”€ services
001071: â”‚   â”œâ”€â”€ admin
001072: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001073: â”‚   â”‚   â”œâ”€â”€ __init__.py
001074: â”‚   â”‚   â”œâ”€â”€ __pycache__
001075: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001076: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001077: â”‚   â”‚   â”œâ”€â”€ main.py
001078: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001079: â”‚   â”‚   â”œâ”€â”€ routes
001080: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001081: â”‚   â”‚   â”‚   â””â”€â”€ __pycache__
001082: â”‚   â”‚   â”‚       â””â”€â”€ __init__.cpython-312.pyc
001083: â”‚   â”‚   â””â”€â”€ services
001084: â”‚   â”‚       â”œâ”€â”€ __init__.py
001085: â”‚   â”‚       â”œâ”€â”€ __pycache__
001086: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001087: â”‚   â”‚       â”‚   â””â”€â”€ bulk_import_service.cpython-312.pyc
001088: â”‚   â”‚       â””â”€â”€ bulk_import_service.py
001089: â”‚   â”œâ”€â”€ agent
001090: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001091: â”‚   â”‚   â”œâ”€â”€ __init__.py
001092: â”‚   â”‚   â”œâ”€â”€ __pycache__
001093: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001094: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001095: â”‚   â”‚   â”œâ”€â”€ agents
001096: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001097: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001098: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001099: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ coordinator.cpython-312.pyc
001100: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ crop_agent.cpython-312.pyc
001101: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ general_agent.cpython-312.pyc
001102: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ market_agent.cpython-312.pyc
001103: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ scheme_agent.cpython-312.pyc
001104: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ weather_agent.cpython-312.pyc
001105: â”‚   â”‚   â”‚   â”œâ”€â”€ coordinator.py
001106: â”‚   â”‚   â”‚   â”œâ”€â”€ crop_agent.py
001107: â”‚   â”‚   â”‚   â”œâ”€â”€ general_agent.py
001108: â”‚   â”‚   â”‚   â”œâ”€â”€ market_agent.py
001109: â”‚   â”‚   â”‚   â”œâ”€â”€ scheme_agent.py
001110: â”‚   â”‚   â”‚   â””â”€â”€ weather_agent.py
001111: â”‚   â”‚   â”œâ”€â”€ main.py
001112: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001113: â”‚   â”‚   â”œâ”€â”€ routes
001114: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001115: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001116: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001117: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ chat.cpython-312.pyc
001118: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ conversations.cpython-312.pyc
001119: â”‚   â”‚   â”‚   â”œâ”€â”€ chat.py
001120: â”‚   â”‚   â”‚   â””â”€â”€ conversations.py
001121: â”‚   â”‚   â”œâ”€â”€ services
001122: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001123: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001124: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001125: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ chat_service.cpython-312.pyc
001126: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ embedding_service.cpython-312.pyc
001127: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ groq_fallback_service.cpython-312.pyc
001128: â”‚   â”‚   â”‚   â”œâ”€â”€ chat_service.py
001129: â”‚   â”‚   â”‚   â”œâ”€â”€ embedding_service.py
001130: â”‚   â”‚   â”‚   â””â”€â”€ groq_fallback_service.py
001131: â”‚   â”‚   â””â”€â”€ tools
001132: â”‚   â”‚       â”œâ”€â”€ __init__.py
001133: â”‚   â”‚       â”œâ”€â”€ __pycache__
001134: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001135: â”‚   â”‚       â”‚   â”œâ”€â”€ crop_tools.cpython-312.pyc
001136: â”‚   â”‚       â”‚   â”œâ”€â”€ general_tools.cpython-312.pyc
001137: â”‚   â”‚       â”‚   â”œâ”€â”€ market_tools.cpython-312.pyc
001138: â”‚   â”‚       â”‚   â”œâ”€â”€ scheme_tools.cpython-312.pyc
001139: â”‚   â”‚       â”‚   â””â”€â”€ weather_tools.cpython-312.pyc
001140: â”‚   â”‚       â”œâ”€â”€ crop_tools.py
001141: â”‚   â”‚       â”œâ”€â”€ general_tools.py
001142: â”‚   â”‚       â”œâ”€â”€ market_tools.py
001143: â”‚   â”‚       â”œâ”€â”€ scheme_tools.py
001144: â”‚   â”‚       â””â”€â”€ weather_tools.py
001145: â”‚   â”œâ”€â”€ analytics
001146: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001147: â”‚   â”‚   â”œâ”€â”€ __init__.py
001148: â”‚   â”‚   â”œâ”€â”€ __pycache__
001149: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001150: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001151: â”‚   â”‚   â”œâ”€â”€ info.txt
001152: â”‚   â”‚   â”œâ”€â”€ main.py
001153: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001154: â”‚   â”‚   â”œâ”€â”€ routes
001155: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001156: â”‚   â”‚   â”‚   â””â”€â”€ __pycache__
001157: â”‚   â”‚   â”‚       â””â”€â”€ __init__.cpython-312.pyc
001158: â”‚   â”‚   â””â”€â”€ services
001159: â”‚   â”‚       â”œâ”€â”€ __init__.py
001160: â”‚   â”‚       â””â”€â”€ insight_service.py
001161: â”‚   â”œâ”€â”€ auth
001162: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001163: â”‚   â”‚   â”œâ”€â”€ __init__.py
001164: â”‚   â”‚   â”œâ”€â”€ __pycache__
001165: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001166: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001167: â”‚   â”‚   â”œâ”€â”€ main.py
001168: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001169: â”‚   â”‚   â”œâ”€â”€ routes
001170: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001171: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001172: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001173: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ auth.cpython-312.pyc
001174: â”‚   â”‚   â”‚   â””â”€â”€ auth.py
001175: â”‚   â”‚   â””â”€â”€ services
001176: â”‚   â”‚       â”œâ”€â”€ __init__.py
001177: â”‚   â”‚       â”œâ”€â”€ __pycache__
001178: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001179: â”‚   â”‚       â”‚   â””â”€â”€ auth_service.cpython-312.pyc
001180: â”‚   â”‚       â””â”€â”€ auth_service.py
001181: â”‚   â”œâ”€â”€ crop
001182: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001183: â”‚   â”‚   â”œâ”€â”€ __init__.py
001184: â”‚   â”‚   â”œâ”€â”€ __pycache__
001185: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001186: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001187: â”‚   â”‚   â”œâ”€â”€ main.py
001188: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001189: â”‚   â”‚   â”œâ”€â”€ routes
001190: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001191: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001192: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001193: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ crops.cpython-312.pyc
001194: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ cycles.cpython-312.pyc
001195: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ disease.cpython-312.pyc
001196: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ recommendations.cpython-312.pyc
001197: â”‚   â”‚   â”‚   â”œâ”€â”€ crops.py
001198: â”‚   â”‚   â”‚   â”œâ”€â”€ cycles.py
001199: â”‚   â”‚   â”‚   â”œâ”€â”€ disease.py
001200: â”‚   â”‚   â”‚   â””â”€â”€ recommendations.py
001201: â”‚   â”‚   â””â”€â”€ services
001202: â”‚   â”‚       â”œâ”€â”€ __init__.py
001203: â”‚   â”‚       â”œâ”€â”€ __pycache__
001204: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001205: â”‚   â”‚       â”‚   â”œâ”€â”€ crop_service.cpython-312.pyc
001206: â”‚   â”‚       â”‚   â”œâ”€â”€ cycle_service.cpython-312.pyc
001207: â”‚   â”‚       â”‚   â””â”€â”€ disease_service.cpython-312.pyc
001208: â”‚   â”‚       â”œâ”€â”€ crop_service.py
001209: â”‚   â”‚       â”œâ”€â”€ cycle_service.py
001210: â”‚   â”‚       â””â”€â”€ disease_service.py
001211: â”‚   â”œâ”€â”€ equipment
001212: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001213: â”‚   â”‚   â”œâ”€â”€ __init__.py
001214: â”‚   â”‚   â”œâ”€â”€ __pycache__
001215: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001216: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001217: â”‚   â”‚   â”œâ”€â”€ main.py
001218: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001219: â”‚   â”‚   â”œâ”€â”€ routes
001220: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001221: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001222: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001223: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ equipment.cpython-312.pyc
001224: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ livestock.cpython-312.pyc
001225: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ rental_rates.cpython-312.pyc
001226: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ rentals.cpython-312.pyc
001227: â”‚   â”‚   â”‚   â”œâ”€â”€ equipment.py
001228: â”‚   â”‚   â”‚   â”œâ”€â”€ livestock.py
001229: â”‚   â”‚   â”‚   â”œâ”€â”€ rental_rates.py
001230: â”‚   â”‚   â”‚   â””â”€â”€ rentals.py
001231: â”‚   â”‚   â””â”€â”€ services
001232: â”‚   â”‚       â”œâ”€â”€ __init__.py
001233: â”‚   â”‚       â”œâ”€â”€ __pycache__
001234: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001235: â”‚   â”‚       â”‚   â”œâ”€â”€ equipment_rental_data.cpython-312.pyc
001236: â”‚   â”‚       â”‚   â”œâ”€â”€ equipment_service.cpython-312.pyc
001237: â”‚   â”‚       â”‚   â”œâ”€â”€ livestock_service.cpython-312.pyc
001238: â”‚   â”‚       â”‚   â””â”€â”€ rental_service.cpython-312.pyc
001239: â”‚   â”‚       â”œâ”€â”€ equipment_rental_data.py
001240: â”‚   â”‚       â”œâ”€â”€ equipment_service.py
001241: â”‚   â”‚       â”œâ”€â”€ livestock_service.py
001242: â”‚   â”‚       â””â”€â”€ rental_service.py
001243: â”‚   â”œâ”€â”€ farmer
001244: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001245: â”‚   â”‚   â”œâ”€â”€ __init__.py
001246: â”‚   â”‚   â”œâ”€â”€ __pycache__
001247: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001248: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001249: â”‚   â”‚   â”œâ”€â”€ main.py
001250: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001251: â”‚   â”‚   â”œâ”€â”€ routes
001252: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001253: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001254: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001255: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ admin.cpython-312.pyc
001256: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard.cpython-312.pyc
001257: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ profiles.cpython-312.pyc
001258: â”‚   â”‚   â”‚   â”œâ”€â”€ admin.py
001259: â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard.py
001260: â”‚   â”‚   â”‚   â””â”€â”€ profiles.py
001261: â”‚   â”‚   â””â”€â”€ services
001262: â”‚   â”‚       â”œâ”€â”€ __init__.py
001263: â”‚   â”‚       â”œâ”€â”€ __pycache__
001264: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001265: â”‚   â”‚       â”‚   â””â”€â”€ farmer_service.cpython-312.pyc
001266: â”‚   â”‚       â””â”€â”€ farmer_service.py
001267: â”‚   â”œâ”€â”€ geo
001268: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001269: â”‚   â”‚   â”œâ”€â”€ __init__.py
001270: â”‚   â”‚   â”œâ”€â”€ __pycache__
001271: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001272: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001273: â”‚   â”‚   â”œâ”€â”€ main.py
001274: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001275: â”‚   â”‚   â”œâ”€â”€ routes
001276: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001277: â”‚   â”‚   â”‚   â””â”€â”€ __pycache__
001278: â”‚   â”‚   â”‚       â””â”€â”€ __init__.cpython-312.pyc
001279: â”‚   â”‚   â””â”€â”€ services
001280: â”‚   â”‚       â”œâ”€â”€ __init__.py
001281: â”‚   â”‚       â”œâ”€â”€ __pycache__
001282: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001283: â”‚   â”‚       â”‚   â””â”€â”€ geo_service.cpython-312.pyc
001284: â”‚   â”‚       â””â”€â”€ geo_service.py
001285: â”‚   â”œâ”€â”€ info.txt
001286: â”‚   â”œâ”€â”€ market
001287: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001288: â”‚   â”‚   â”œâ”€â”€ __init__.py
001289: â”‚   â”‚   â”œâ”€â”€ __pycache__
001290: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001291: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001292: â”‚   â”‚   â”œâ”€â”€ main.py
001293: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001294: â”‚   â”‚   â”œâ”€â”€ routes
001295: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001296: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001297: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001298: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ document_builder.cpython-312.pyc
001299: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ live_market.cpython-312.pyc
001300: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ mandis.cpython-312.pyc
001301: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ prices.cpython-312.pyc
001302: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ ref_data.cpython-312.pyc
001303: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ schemes.cpython-312.pyc
001304: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ weather_soil.cpython-312.pyc
001305: â”‚   â”‚   â”‚   â”œâ”€â”€ document_builder.py
001306: â”‚   â”‚   â”‚   â”œâ”€â”€ live_market.py
001307: â”‚   â”‚   â”‚   â”œâ”€â”€ mandis.py
001308: â”‚   â”‚   â”‚   â”œâ”€â”€ prices.py
001309: â”‚   â”‚   â”‚   â”œâ”€â”€ ref_data.py
001310: â”‚   â”‚   â”‚   â”œâ”€â”€ schemes.py
001311: â”‚   â”‚   â”‚   â””â”€â”€ weather_soil.py
001312: â”‚   â”‚   â””â”€â”€ services
001313: â”‚   â”‚       â”œâ”€â”€ __init__.py
001314: â”‚   â”‚       â”œâ”€â”€ __pycache__
001315: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001316: â”‚   â”‚       â”‚   â”œâ”€â”€ document_builder_service.cpython-312.pyc
001317: â”‚   â”‚       â”‚   â”œâ”€â”€ government_schemes_data.cpython-312.pyc
001318: â”‚   â”‚       â”‚   â”œâ”€â”€ langextract_service.cpython-312.pyc
001319: â”‚   â”‚       â”‚   â”œâ”€â”€ mandi_data_fetcher.cpython-312.pyc
001320: â”‚   â”‚       â”‚   â”œâ”€â”€ mandi_service.cpython-312.pyc
001321: â”‚   â”‚       â”‚   â”œâ”€â”€ price_service.cpython-312.pyc
001322: â”‚   â”‚       â”‚   â”œâ”€â”€ scheme_document_downloader.cpython-312.pyc
001323: â”‚   â”‚       â”‚   â”œâ”€â”€ scheme_service.cpython-312.pyc
001324: â”‚   â”‚       â”‚   â”œâ”€â”€ soil_service.cpython-312.pyc
001325: â”‚   â”‚       â”‚   â””â”€â”€ weather_service.cpython-312.pyc
001326: â”‚   â”‚       â”œâ”€â”€ document_builder_service.py
001327: â”‚   â”‚       â”œâ”€â”€ government_schemes_data.py
001328: â”‚   â”‚       â”œâ”€â”€ langextract_service.py
001329: â”‚   â”‚       â”œâ”€â”€ mandi_data_fetcher.py
001330: â”‚   â”‚       â”œâ”€â”€ mandi_service.py
001331: â”‚   â”‚       â”œâ”€â”€ price_service.py
001332: â”‚   â”‚       â”œâ”€â”€ scheme_document_downloader.py
001333: â”‚   â”‚       â”œâ”€â”€ scheme_service.py
001334: â”‚   â”‚       â”œâ”€â”€ soil_service.py
001335: â”‚   â”‚       â””â”€â”€ weather_service.py
001336: â”‚   â”œâ”€â”€ notification
001337: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001338: â”‚   â”‚   â”œâ”€â”€ __init__.py
001339: â”‚   â”‚   â”œâ”€â”€ __pycache__
001340: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001341: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001342: â”‚   â”‚   â”œâ”€â”€ info.txt
001343: â”‚   â”‚   â”œâ”€â”€ main.py
001344: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001345: â”‚   â”‚   â”œâ”€â”€ routes
001346: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001347: â”‚   â”‚   â”‚   â”œâ”€â”€ __pycache__
001348: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001349: â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ notifications.cpython-312.pyc
001350: â”‚   â”‚   â”‚   â”‚   â””â”€â”€ preferences.cpython-312.pyc
001351: â”‚   â”‚   â”‚   â”œâ”€â”€ notifications.py
001352: â”‚   â”‚   â”‚   â””â”€â”€ preferences.py
001353: â”‚   â”‚   â””â”€â”€ services
001354: â”‚   â”‚       â”œâ”€â”€ __init__.py
001355: â”‚   â”‚       â”œâ”€â”€ __pycache__
001356: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001357: â”‚   â”‚       â”‚   â””â”€â”€ notification_service.cpython-312.pyc
001358: â”‚   â”‚       â””â”€â”€ notification_service.py
001359: â”‚   â”œâ”€â”€ scheme_documents
001360: â”‚   â”‚   â”œâ”€â”€ acabc
001361: â”‚   â”‚   â”œâ”€â”€ aif
001362: â”‚   â”‚   â”‚   â””â”€â”€ aif_application.html
001363: â”‚   â”‚   â”œâ”€â”€ deds_npdd
001364: â”‚   â”‚   â”œâ”€â”€ drone_didi
001365: â”‚   â”‚   â”œâ”€â”€ enam
001366: â”‚   â”‚   â”‚   â”œâ”€â”€ enam_farmer_registration.html
001367: â”‚   â”‚   â”‚   â””â”€â”€ enam_user_manual.html
001368: â”‚   â”‚   â”œâ”€â”€ fpo_scheme
001369: â”‚   â”‚   â”‚   â””â”€â”€ fpo_formation_guidelines.html
001370: â”‚   â”‚   â”œâ”€â”€ iss
001371: â”‚   â”‚   â”œâ”€â”€ kalia
001372: â”‚   â”‚   â”œâ”€â”€ kcc
001373: â”‚   â”‚   â”‚   â”œâ”€â”€ kcc_application_form_pnb.html
001374: â”‚   â”‚   â”‚   â”œâ”€â”€ kcc_guidelines_rbi.html
001375: â”‚   â”‚   â”‚   â””â”€â”€ pm-kisan_kcc_form.html
001376: â”‚   â”‚   â”œâ”€â”€ krishak_bandhu
001377: â”‚   â”‚   â”œâ”€â”€ manifest.json
001378: â”‚   â”‚   â”œâ”€â”€ midh
001379: â”‚   â”‚   â”‚   â””â”€â”€ midh_guidelines.pdf
001380: â”‚   â”‚   â”œâ”€â”€ mkky
001381: â”‚   â”‚   â”œâ”€â”€ mks_yojana
001382: â”‚   â”‚   â”œâ”€â”€ namo_shetkari
001383: â”‚   â”‚   â”œâ”€â”€ nbhm
001384: â”‚   â”‚   â”œâ”€â”€ nlm
001385: â”‚   â”‚   â”œâ”€â”€ nmsa-rad
001386: â”‚   â”‚   â”œâ”€â”€ pkvy
001387: â”‚   â”‚   â”‚   â”œâ”€â”€ pgs_india_guidelines.pdf
001388: â”‚   â”‚   â”‚   â””â”€â”€ pkvy_cluster_registration_form.html
001389: â”‚   â”‚   â”œâ”€â”€ pm-aasha
001390: â”‚   â”‚   â”œâ”€â”€ pm-kisan
001391: â”‚   â”‚   â”œâ”€â”€ pm-kusum
001392: â”‚   â”‚   â”‚   â”œâ”€â”€ component_b_guidelines.html
001393: â”‚   â”‚   â”‚   â””â”€â”€ pm-kusum_application_form.html
001394: â”‚   â”‚   â”œâ”€â”€ pmfby
001395: â”‚   â”‚   â”‚   â”œâ”€â”€ claim_form.html
001396: â”‚   â”‚   â”‚   â”œâ”€â”€ pmfby_application_form.html
001397: â”‚   â”‚   â”‚   â””â”€â”€ pmfby_guidelines.pdf
001398: â”‚   â”‚   â”œâ”€â”€ pmksy
001399: â”‚   â”‚   â”œâ”€â”€ pmmsy
001400: â”‚   â”‚   â”‚   â””â”€â”€ pmmsy_application.html
001401: â”‚   â”‚   â”œâ”€â”€ raitha_siri
001402: â”‚   â”‚   â”œâ”€â”€ rkvy
001403: â”‚   â”‚   â”œâ”€â”€ rythu_bandhu
001404: â”‚   â”‚   â”œâ”€â”€ shc
001405: â”‚   â”‚   â”‚   â””â”€â”€ soil_health_card_sample.pdf
001406: â”‚   â”‚   â”œâ”€â”€ smam
001407: â”‚   â”‚   â”‚   â”œâ”€â”€ smam_guidelines.pdf
001408: â”‚   â”‚   â”‚   â””â”€â”€ smam_online_application.html
001409: â”‚   â”‚   â””â”€â”€ ysr_rythu_bharosa
001410: â”‚   â”œâ”€â”€ schemes
001411: â”‚   â”‚   â”œâ”€â”€ Dockerfile
001412: â”‚   â”‚   â”œâ”€â”€ __init__.py
001413: â”‚   â”‚   â”œâ”€â”€ __pycache__
001414: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001415: â”‚   â”‚   â”‚   â””â”€â”€ main.cpython-312.pyc
001416: â”‚   â”‚   â”œâ”€â”€ main.py
001417: â”‚   â”‚   â”œâ”€â”€ requirements.txt
001418: â”‚   â”‚   â”œâ”€â”€ routes
001419: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.py
001420: â”‚   â”‚   â”‚   â””â”€â”€ __pycache__
001421: â”‚   â”‚   â”‚       â””â”€â”€ __init__.cpython-312.pyc
001422: â”‚   â”‚   â””â”€â”€ services
001423: â”‚   â”‚       â”œâ”€â”€ __init__.py
001424: â”‚   â”‚       â”œâ”€â”€ __pycache__
001425: â”‚   â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001426: â”‚   â”‚       â”‚   â””â”€â”€ schemes_service.cpython-312.pyc
001427: â”‚   â”‚       â””â”€â”€ schemes_service.py
001428: â”‚   â””â”€â”€ voice
001429: â”‚       â”œâ”€â”€ Dockerfile
001430: â”‚       â”œâ”€â”€ __init__.py
001431: â”‚       â”œâ”€â”€ __pycache__
001432: â”‚       â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001433: â”‚       â”‚   â””â”€â”€ main.cpython-312.pyc
001434: â”‚       â”œâ”€â”€ main.py
001435: â”‚       â”œâ”€â”€ requirements.txt
001436: â”‚       â”œâ”€â”€ routes
001437: â”‚       â”‚   â”œâ”€â”€ __init__.py
001438: â”‚       â”‚   â”œâ”€â”€ __pycache__
001439: â”‚       â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001440: â”‚       â”‚   â”‚   â”œâ”€â”€ stt.cpython-312.pyc
001441: â”‚       â”‚   â”‚   â”œâ”€â”€ tts.cpython-312.pyc
001442: â”‚       â”‚   â”‚   â””â”€â”€ voice.cpython-312.pyc
001443: â”‚       â”‚   â”œâ”€â”€ stt.py
001444: â”‚       â”‚   â”œâ”€â”€ tts.py
001445: â”‚       â”‚   â””â”€â”€ voice.py
001446: â”‚       â””â”€â”€ services
001447: â”‚           â”œâ”€â”€ __init__.py
001448: â”‚           â”œâ”€â”€ __pycache__
001449: â”‚           â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001450: â”‚           â”‚   â”œâ”€â”€ stt_service.cpython-312.pyc
001451: â”‚           â”‚   â””â”€â”€ tts_service.cpython-312.pyc
001452: â”‚           â”œâ”€â”€ stt_service.py
001453: â”‚           â””â”€â”€ tts_service.py
001454: â”œâ”€â”€ shared
001455: â”‚   â”œâ”€â”€ __init__.py
001456: â”‚   â”œâ”€â”€ __pycache__
001457: â”‚   â”‚   â””â”€â”€ __init__.cpython-312.pyc
001458: â”‚   â”œâ”€â”€ auth
001459: â”‚   â”‚   â”œâ”€â”€ __init__.py
001460: â”‚   â”‚   â”œâ”€â”€ __pycache__
001461: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001462: â”‚   â”‚   â”‚   â”œâ”€â”€ deps.cpython-312.pyc
001463: â”‚   â”‚   â”‚   â””â”€â”€ security.cpython-312.pyc
001464: â”‚   â”‚   â”œâ”€â”€ deps.py
001465: â”‚   â”‚   â””â”€â”€ security.py
001466: â”‚   â”œâ”€â”€ cache
001467: â”‚   â”‚   â”œâ”€â”€ __init__.py
001468: â”‚   â”‚   â”œâ”€â”€ __pycache__
001469: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001470: â”‚   â”‚   â”‚   â””â”€â”€ market_cache.cpython-312.pyc
001471: â”‚   â”‚   â””â”€â”€ market_cache.py
001472: â”‚   â”œâ”€â”€ core
001473: â”‚   â”‚   â”œâ”€â”€ __init__.py
001474: â”‚   â”‚   â”œâ”€â”€ __pycache__
001475: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001476: â”‚   â”‚   â”‚   â”œâ”€â”€ config.cpython-312.pyc
001477: â”‚   â”‚   â”‚   â””â”€â”€ constants.cpython-312.pyc
001478: â”‚   â”‚   â”œâ”€â”€ config.py
001479: â”‚   â”‚   â””â”€â”€ constants.py
001480: â”‚   â”œâ”€â”€ db
001481: â”‚   â”‚   â”œâ”€â”€ __init__.py
001482: â”‚   â”‚   â”œâ”€â”€ __pycache__
001483: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001484: â”‚   â”‚   â”‚   â”œâ”€â”€ firebase.cpython-312.pyc
001485: â”‚   â”‚   â”‚   â”œâ”€â”€ mongodb.cpython-312.pyc
001486: â”‚   â”‚   â”‚   â””â”€â”€ redis.cpython-312.pyc
001487: â”‚   â”‚   â”œâ”€â”€ mongodb.py
001488: â”‚   â”‚   â””â”€â”€ redis.py
001489: â”‚   â”œâ”€â”€ errors
001490: â”‚   â”‚   â”œâ”€â”€ __init__.py
001491: â”‚   â”‚   â”œâ”€â”€ __pycache__
001492: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001493: â”‚   â”‚   â”‚   â”œâ”€â”€ codes.cpython-312.pyc
001494: â”‚   â”‚   â”‚   â”œâ”€â”€ exceptions.cpython-312.pyc
001495: â”‚   â”‚   â”‚   â””â”€â”€ handlers.cpython-312.pyc
001496: â”‚   â”‚   â”œâ”€â”€ codes.py
001497: â”‚   â”‚   â”œâ”€â”€ exceptions.py
001498: â”‚   â”‚   â””â”€â”€ handlers.py
001499: â”‚   â”œâ”€â”€ info.txt
001500: â”‚   â”œâ”€â”€ middleware
001501: â”‚   â”‚   â”œâ”€â”€ __init__.py
001502: â”‚   â”‚   â”œâ”€â”€ __pycache__
001503: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001504: â”‚   â”‚   â”‚   â”œâ”€â”€ auth.cpython-312.pyc
001505: â”‚   â”‚   â”‚   â”œâ”€â”€ logging.cpython-312.pyc
001506: â”‚   â”‚   â”‚   â”œâ”€â”€ rate_limiter.cpython-312.pyc
001507: â”‚   â”‚   â”‚   â””â”€â”€ security.cpython-312.pyc
001508: â”‚   â”‚   â”œâ”€â”€ auth.py
001509: â”‚   â”‚   â”œâ”€â”€ logging.py
001510: â”‚   â”‚   â”œâ”€â”€ rate_limiter.py
001511: â”‚   â”‚   â””â”€â”€ security.py
001512: â”‚   â”œâ”€â”€ patterns
001513: â”‚   â”‚   â”œâ”€â”€ __init__.py
001514: â”‚   â”‚   â”œâ”€â”€ __pycache__
001515: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001516: â”‚   â”‚   â”‚   â”œâ”€â”€ bloom_filter.cpython-312.pyc
001517: â”‚   â”‚   â”‚   â”œâ”€â”€ circuit_breaker.cpython-312.pyc
001518: â”‚   â”‚   â”‚   â””â”€â”€ service_client.cpython-312.pyc
001519: â”‚   â”‚   â”œâ”€â”€ bloom_filter.py
001520: â”‚   â”‚   â”œâ”€â”€ circuit_breaker.py
001521: â”‚   â”‚   â””â”€â”€ service_client.py
001522: â”‚   â”œâ”€â”€ schemas
001523: â”‚   â”‚   â”œâ”€â”€ __init__.py
001524: â”‚   â”‚   â”œâ”€â”€ __pycache__
001525: â”‚   â”‚   â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001526: â”‚   â”‚   â”‚   â”œâ”€â”€ admin.cpython-312.pyc
001527: â”‚   â”‚   â”‚   â”œâ”€â”€ agent.cpython-312.pyc
001528: â”‚   â”‚   â”‚   â”œâ”€â”€ auth.cpython-312.pyc
001529: â”‚   â”‚   â”‚   â”œâ”€â”€ common.cpython-312.pyc
001530: â”‚   â”‚   â”‚   â”œâ”€â”€ crop.cpython-312.pyc
001531: â”‚   â”‚   â”‚   â”œâ”€â”€ equipment.cpython-312.pyc
001532: â”‚   â”‚   â”‚   â”œâ”€â”€ farmer.cpython-312.pyc
001533: â”‚   â”‚   â”‚   â”œâ”€â”€ geo.cpython-312.pyc
001534: â”‚   â”‚   â”‚   â”œâ”€â”€ livestock.cpython-312.pyc
001535: â”‚   â”‚   â”‚   â”œâ”€â”€ market.cpython-312.pyc
001536: â”‚   â”‚   â”‚   â”œâ”€â”€ notification.cpython-312.pyc
001537: â”‚   â”‚   â”‚   â””â”€â”€ scheme.cpython-312.pyc
001538: â”‚   â”‚   â”œâ”€â”€ admin.py
001539: â”‚   â”‚   â”œâ”€â”€ agent.py
001540: â”‚   â”‚   â”œâ”€â”€ analytics.py
001541: â”‚   â”‚   â”œâ”€â”€ auth.py
001542: â”‚   â”‚   â”œâ”€â”€ common.py
001543: â”‚   â”‚   â”œâ”€â”€ crop.py
001544: â”‚   â”‚   â”œâ”€â”€ equipment.py
001545: â”‚   â”‚   â”œâ”€â”€ farmer.py
001546: â”‚   â”‚   â”œâ”€â”€ geo.py
001547: â”‚   â”‚   â”œâ”€â”€ livestock.py
001548: â”‚   â”‚   â”œâ”€â”€ market.py
001549: â”‚   â”‚   â”œâ”€â”€ notification.py
001550: â”‚   â”‚   â””â”€â”€ scheme.py
001551: â”‚   â””â”€â”€ services
001552: â”‚       â”œâ”€â”€ __pycache__
001553: â”‚       â”‚   â”œâ”€â”€ api_key_allocator.cpython-312.pyc
001554: â”‚       â”‚   â”œâ”€â”€ knowledge_base_service.cpython-312.pyc
001555: â”‚       â”‚   â””â”€â”€ qdrant_service.cpython-312.pyc
001556: â”‚       â”œâ”€â”€ api_key_allocator.py
001557: â”‚       â”œâ”€â”€ knowledge_base_service.py
001558: â”‚       â””â”€â”€ qdrant_service.py
001559: â”œâ”€â”€ tests
001560: â”‚   â”œâ”€â”€ __pycache__
001561: â”‚   â”‚   â”œâ”€â”€ test_all_endpoints.cpython-312-pytest-8.4.1.pyc
001562: â”‚   â”‚   â”œâ”€â”€ test_all_endpoints.cpython-312-pytest-9.0.2.pyc
001563: â”‚   â”‚   â”œâ”€â”€ test_all_endpoints.cpython-312.pyc
001564: â”‚   â”‚   â”œâ”€â”€ test_e2e_new_features.cpython-312-pytest-8.4.1.pyc
001565: â”‚   â”‚   â”œâ”€â”€ test_e2e_new_features.cpython-312-pytest-9.0.2.pyc
001566: â”‚   â”‚   â””â”€â”€ test_e2e_new_features.cpython-312.pyc
001567: â”‚   â”œâ”€â”€ info.txt
001568: â”‚   â”œâ”€â”€ materials
001569: â”‚   â”‚   â””â”€â”€ audio
001570: â”‚   â”‚       â””â”€â”€ voice_pipeline_test.wav
001571: â”‚   â”œâ”€â”€ test_all_endpoints.py
001572: â”‚   â”œâ”€â”€ test_dynamic_pentest.py
001573: â”‚   â””â”€â”€ test_e2e_new_features.py
001574: â””â”€â”€ workers
001575:     â”œâ”€â”€ Dockerfile
001576:     â”œâ”€â”€ __init__.py
001577:     â”œâ”€â”€ __pycache__
001578:     â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001579:     â”‚   â””â”€â”€ celery_app.cpython-312.pyc
001580:     â”œâ”€â”€ celery_app.py
001581:     â”œâ”€â”€ info.txt
001582:     â”œâ”€â”€ requirements.txt
001583:     â””â”€â”€ tasks
001584:         â”œâ”€â”€ __init__.py
001585:         â”œâ”€â”€ __pycache__
001586:         â”‚   â”œâ”€â”€ __init__.cpython-312.pyc
001587:         â”‚   â”œâ”€â”€ data_tasks.cpython-312.pyc
001588:         â”‚   â”œâ”€â”€ embedding_tasks.cpython-312.pyc
001589:         â”‚   â””â”€â”€ notification_tasks.cpython-312.pyc
001590:         â”œâ”€â”€ data_tasks.py
001591:         â”œâ”€â”€ embedding_tasks.py
001592:         â””â”€â”€ notification_tasks.py
```

## DB Analysis Text Report (Full)


### Source: kisankiawaz-backend/data_analysis/reports/db_analysis_report_20260407_211829.txt

```text
000001: KISANKIAWAAZ DATABASE ANALYSIS REPORT
000002: Generated at: 2026-04-07T15:48:29.130151+00:00
000003: 
000004: === EXECUTIVE SUMMARY ===
000005: Database: farmer
000006: Total collections analyzed: 35
000007: Total documents (sum across collections): 146,521
000008: Top 10 largest collections:
000009: - ref_mandi_prices: 75,391
000010: - market_prices: 30,217
000011: - ref_equipment_rate_history: 29,040
000012: - ref_soil_health: 4,454
000013: - ref_pin_master: 2,726
000014: - ref_equipment_providers: 1,210
000015: - ref_mandi_directory: 976
000016: - agent_session_messages: 922
000017: - users: 303
000018: - agent_sessions: 301
000019: 
000020: === ACTIVITY DIAGNOSTIC (WHY ANALYTICS CAN LOOK BORING) ===
000021: Key operational collection volumes:
000022: - users: 303
000023: - farmer_profiles: 298
000024: - crops: 8
000025: - market_prices: 30,217
000026: - equipment_bookings: 1
000027: - notifications: 32
000028: - agent_sessions: 301
000029: - agent_session_messages: 922
000030: - calendar_events: 18
000031: Low-volume high-impact collections (<100 docs):
000032: - crops
000033: - equipment_bookings
000034: - notifications
000035: - calendar_events
000036: 
000037: === RELATIONSHIP COVERAGE CHECKS ===
000038: - farmer_profiles.user_id -> users._id: distinct=298, matched=298, coverage=100.00%
000039: - notifications.user_id -> users._id: distinct=1, matched=1, coverage=100.00%
000040: - notification_preferences.user_id -> users._id: distinct=1, matched=1, coverage=100.00%
000041: - equipment_bookings.equipment_id -> equipment._id: distinct=1, matched=1, coverage=100.00%
000042: 
000043: === COLLECTION-BY-COLLECTION DEEP DIVE ===
000044: 
000045: --- admin_audit_logs ---
000046: Total docs: 28
000047: Sample analyzed: 28
000048: Indexes:
000049: - _id_ | keys=SON([('_id', 1)]) | unique=False
000050: Quality findings:
000051: - timestamp span: 2 days
000052: Top 7 fields by coverage:
000053: - _id: coverage=1.00, types={'str': 28}, unique~=28
000054:   examples="a443f80f6a084dfaaff715e342a65282"; "2b96762e2fd14d0f9125403be82c9ea2"; "4d642393c7e0403495af6fe7d0f9a7e7"
000055: - admin_id: coverage=1.00, types={'str': 28}, unique~=1
000056:   examples="admin_admin"
000057: - action: coverage=1.00, types={'str': 28}, unique~=3
000058:   examples="UPDATE_FARMER_STATUS"; "UPDATE_EQUIPMENT_PROVIDER"; "SOFT_DELETE_EQUIPMENT_PROVIDER"
000059: - target_collection: coverage=1.00, types={'str': 28}, unique~=2
000060:   examples="users"; "ref_equipment_providers"
000061: - target_doc_id: coverage=1.00, types={'str': 28}, unique~=10
000062:   examples="seed_farmer_01"; "seed_farmer_03"; "rental_prov_test_api_test_seeder_maharashtra_pune"
000063: - payload_summary: coverage=1.00, types={'str': 28}, unique~=3
000064:   examples="is_active=False"; "is_active=True"; "fields=contact_phone,documents_required,eligibility,provider_phone,rate_daily,rental_id,updated_at"
000065: - timestamp: coverage=1.00, types={'str': 28}, unique~=28
000066:   datetime[min=2026-03-30T09:34:07.378687+00:00, max=2026-04-01T23:31:07.041409+00:00, span_days=2]
000067:   examples="2026-03-30T09:34:07.378687+00:00"; "2026-03-30T09:34:11.735877+00:00"; "2026-03-30T09:34:15.297149+00:00"
000068: 
000069: --- admin_users ---
000070: Total docs: 2
000071: Sample analyzed: 2
000072: Indexes:
000073: - _id_ | keys=SON([('_id', 1)]) | unique=False
000074: Quality findings:
000075: - created_at span: 0 days
000076: Top 10 fields by coverage:
000077: - _id: coverage=1.00, types={'str': 2}, unique~=2
000078:   examples="admin_superadmin"; "admin_admin"
000079: - admin_id: coverage=1.00, types={'str': 2}, unique~=2
000080:   examples="admin_superadmin"; "admin_admin"
000081: - email: coverage=1.00, types={'str': 2}, unique~=2
000082:   examples="superadmin@kisankiawaz.in"; "admin@kisankiawaz.in"
000083: - password_hash: coverage=1.00, types={'str': 2}, unique~=2
000084:   examples="$2b$12$TOisPuaLK9ajJ95ITUXwJ.2vjM6nWojAOuYF2RZ3gHoiNfzexQJf2"; "$2b$12$NRZPYUd00KNhPtmgHy5Bj.bGY7wGuPapKJkhQu.BNlpJGrKi9G4aq"
000085: - name: coverage=1.00, types={'str': 2}, unique~=2
000086:   examples="Super Admin"; "Admin User"
000087: - role: coverage=1.00, types={'str': 2}, unique~=2
000088:   examples="super_admin"; "admin"
000089: - is_active: coverage=1.00, types={'bool': 2}, unique~=1
000090:   examples=true
000091: - created_at: coverage=1.00, types={'str': 2}, unique~=1
000092:   datetime[min=2026-03-26T20:03:54.744538+00:00, max=2026-03-26T20:03:54.744538+00:00, span_days=0]
000093:   examples="2026-03-26T20:03:54.744538+00:00"
000094: - last_login_at: coverage=1.00, types={'str': 2}, unique~=2
000095:   datetime[min=2026-03-31T15:16:19.240125+00:00, max=2026-04-07T14:52:01.020537+00:00, span_days=6]
000096:   examples="2026-03-31T15:16:19.240125+00:00"; "2026-04-07T14:52:01.020537+00:00"
000097: - created_by: coverage=1.00, types={'str': 2}, unique~=1
000098:   examples="seed_script"
000099: 
000100: --- agent_session_messages ---
000101: Total docs: 922
000102: Sample analyzed: 922
000103: Indexes:
000104: - _id_ | keys=SON([('_id', 1)]) | unique=False
000105: Quality findings:
000106: - timestamp span: 6 days
000107: Top 7 fields by coverage:
000108: - _id: coverage=1.00, types={'str': 922}, unique~=922
000109:   examples="e0be650552644d4aa122d88c3c20ced1"; "e2f3a1943326480b81b1c8acb4580388"; "10e9d4055a8048f18e57ca0e417d21b0"
000110: - session_id: coverage=1.00, types={'str': 922}, unique~=297
000111:   examples="176215d6-a19b-4531-b840-0ac5ddc0e034"; "18c51337-aeff-4223-9b04-ff48cc4f59d7"; "50f9d0ca-f4b4-49a6-a226-5f54bfc2bc19"
000112: - user_id: coverage=1.00, types={'str': 922}, unique~=1
000113:   examples="seed_farmer_01"
000114: - role: coverage=1.00, types={'str': 922}, unique~=2
000115:   examples="user"; "assistant"
000116: - content: coverage=1.00, types={'str': 922}, unique~=614
000117:   examples="Will it rain tomorrow in my area and is evening spray safe?"; "Here's the weather update and advice for your area (Pune):\n\n*   **Data Now (Source: OpenWeatherMap, retrieved 2026-04-01 11:04 UTC):**\n    *   **Tonight (April 1st):** Expec...; "PM-KISAN eligibility, required documents, and exact apply process for a Maharashtra farmer."
000118: - timestamp: coverage=1.00, types={'str': 922}, unique~=461
000119:   datetime[min=2026-04-01T11:04:20.816271+00:00, max=2026-04-07T14:34:09.744321+00:00, span_days=6]
000120:   examples="2026-04-01T11:04:20.816271+00:00"; "2026-04-01T11:04:23.332189+00:00"; "2026-04-01T11:04:24.504013+00:00"
000121: - agent: coverage=0.50, types={'str': 461}, unique~=11
000122:   examples="WeatherAgent"; "scheme_direct"; "equipment_direct"
000123: 
000124: --- agent_sessions ---
000125: Total docs: 301
000126: Sample analyzed: 301
000127: Indexes:
000128: - _id_ | keys=SON([('_id', 1)]) | unique=False
000129: Quality findings:
000130: - created_at span: 6 days
000131: - updated_at span: 6 days
000132: Top 13 fields by coverage:
000133: - farmer_facts[]: coverage=7.66, types={'str': 2306, 'null': 9}, unique~=45
000134:   examples="topics=weather"; "crops_of_interest=rice"; "location_hint=Pune"
000135: - _id: coverage=1.00, types={'str': 301}, unique~=301
000136:   examples="f7c968a8-994c-4e0d-9a18-14a1cec70c8a"; "6e7eb3d7-365d-4d6c-956c-118bcdbad259"; "08b703dd-f895-4d1c-a541-a566fb9eed48"
000137: - language: coverage=1.00, types={'str': 301}, unique~=13
000138:   examples="en"; "hinglish"; "hi"
000139: - updated_at: coverage=1.00, types={'str': 301}, unique~=301
000140:   datetime[min=2026-04-01T10:19:24.130824+00:00, max=2026-04-07T14:34:09.799856+00:00, span_days=6]
000141:   examples="2026-04-01T10:19:24.130824+00:00"; "2026-04-01T10:29:23.943562+00:00"; "2026-04-01T10:36:42.361084+00:00"
000142: - user_id: coverage=1.00, types={'str': 301}, unique~=1
000143:   examples="seed_farmer_01"
000144: - farmer_facts: coverage=1.00, types={'list': 301}, unique~=0
000145:   examples=["topics=weather"]; []; ["crops_of_interest=rice"]
000146: - summary: coverage=1.00, types={'str': 301}, unique~=301
000147:   examples="[2026-04-01T10:18:29.926236+00:00] User intent: hi what's the weather right now | Assistant response gist: Here's the current weather update for Pune, India, as of April 1, 202...; "[2026-04-01T10:29:23.943562+00:00] User intent: Give one concise daily farming recommendation in 1-2 sentences for calendar planning. Upcoming tasks: Market Alert on Mar 24 at ...; "[2026-04-01T10:35:29.891561+00:00] User intent: hi what's the price of tomat9 | Assistant response gist: Exact local match is limited in current records, so here is the closest...
000148: - agent_type: coverage=0.99, types={'str': 297}, unique~=6
000149:   examples="weather"; "market"; "scheme"
000150: - created_at: coverage=0.99, types={'str': 297}, unique~=297
000151:   datetime[min=2026-04-01T11:04:20.816271+00:00, max=2026-04-07T14:34:09.744321+00:00, span_days=6]
000152:   examples="2026-04-01T11:04:20.816271+00:00"; "2026-04-01T11:09:19.305746+00:00"; "2026-04-01T11:13:18.094915+00:00"
000153: - farmer_id: coverage=0.99, types={'str': 297}, unique~=1
000154:   examples="seed_farmer_01"
000155: - last_activity: coverage=0.99, types={'str': 297}, unique~=297
000156:   datetime[min=2026-04-01T11:04:52.554343+00:00, max=2026-04-07T14:34:09.744321+00:00, span_days=6]
000157:   examples="2026-04-01T11:04:52.554343+00:00"; "2026-04-01T11:11:03.087646+00:00"; "2026-04-01T11:14:48.097985+00:00"
000158: - message_count: coverage=0.99, types={'int': 297}, unique~=9
000159:   numeric[min=2.00, p50=2.00, max=18.00, mean=3.10]
000160:   examples=8; 16; 18
000161: - session_id: coverage=0.99, types={'str': 297}, unique~=297
000162:   examples="176215d6-a19b-4531-b840-0ac5ddc0e034"; "18c51337-aeff-4223-9b04-ff48cc4f59d7"; "50f9d0ca-f4b4-49a6-a226-5f54bfc2bc19"
000163: 
000164: --- analytics_snapshots ---
000165: Total docs: 3
000166: Sample analyzed: 3
000167: Indexes:
000168: - _id_ | keys=SON([('_id', 1)]) | unique=False
000169: Quality findings:
000170: - High sparsity: 1 fields under 20% coverage
000171: Top 30 fields by coverage:
000172: - insights.growth_trends.farmers[]: coverage=30.00, types={'dict': 90}, unique~=0
000173:   examples={"date": "2026-02-25", "value": 0}; {"date": "2026-02-26", "value": 0}; {"date": "2026-02-27", "value": 0}
000174: - insights.growth_trends.farmers[].date: coverage=30.00, types={'str': 90}, unique~=66
000175:   datetime[min=2025-12-31T00:00:00+00:00, max=2026-04-01T00:00:00+00:00, span_days=91]
000176:   examples="2026-02-25"; "2026-02-26"; "2026-02-27"
000177: - insights.growth_trends.farmers[].value: coverage=30.00, types={'int': 90}, unique~=3
000178:   numeric[min=0.00, p50=0.00, max=8.00, mean=0.23]
000179:   examples=0; 8; 5
000180: - insights.growth_trends.conversations[]: coverage=30.00, types={'dict': 90}, unique~=0
000181:   examples={"date": "2026-02-25", "value": 0}; {"date": "2026-02-26", "value": 0}; {"date": "2026-02-27", "value": 0}
000182: - insights.growth_trends.conversations[].date: coverage=30.00, types={'str': 90}, unique~=66
000183:   datetime[min=2025-12-31T00:00:00+00:00, max=2026-04-01T00:00:00+00:00, span_days=91]
000184:   examples="2026-02-25"; "2026-02-26"; "2026-02-27"
000185: - insights.growth_trends.conversations[].value: coverage=30.00, types={'int': 90}, unique~=1
000186:   numeric[min=0.00, p50=0.00, max=0.00, mean=0.00]
000187:   examples=0
000188: - insights.growth_trends.bookings[]: coverage=30.00, types={'dict': 90}, unique~=0
000189:   examples={"date": "2026-02-25", "value": 0}; {"date": "2026-02-26", "value": 0}; {"date": "2026-02-27", "value": 0}
000190: - insights.growth_trends.bookings[].date: coverage=30.00, types={'str': 90}, unique~=66
000191:   datetime[min=2025-12-31T00:00:00+00:00, max=2026-04-01T00:00:00+00:00, span_days=91]
000192:   examples="2026-02-25"; "2026-02-26"; "2026-02-27"
000193: - insights.growth_trends.bookings[].value: coverage=30.00, types={'int': 90}, unique~=2
000194:   numeric[min=0.00, p50=0.00, max=1.00, mean=0.02]
000195:   examples=0; 1
000196: - insights.scorecard[]: coverage=4.00, types={'dict': 12}, unique~=0
000197:   examples={"title": "Total Farmers", "value": 8, "delta": 100.0, "trend": "up", "context": "New farmers in last 30 days: 8"}; {"title": "Active Farmers", "value": 1, "delta": 12.5, "trend": "neutral", "context": "Activation rate in 30 days: 12.5%"}; {"title": "Conversations", "value": 0, "delta": 0.0, "trend": "down", "context": "Agent usage intensity over current window"}
000198: - insights.scorecard[].title: coverage=4.00, types={'str': 12}, unique~=4
000199:   examples="Total Farmers"; "Active Farmers"; "Conversations"
000200: - insights.scorecard[].value: coverage=4.00, types={'int': 12}, unique~=4
000201:   numeric[min=0.00, p50=1.00, max=13.00, mean=2.92]
000202:   examples=8; 1; 0
000203: - insights.scorecard[].delta: coverage=4.00, types={'float': 12}, unique~=4
000204:   numeric[min=0.00, p50=12.50, max=100.00, mean=52.72]
000205:   examples=100.0; 12.5; 0.0
000206: - insights.scorecard[].trend: coverage=4.00, types={'str': 12}, unique~=3
000207:   examples="up"; "neutral"; "down"
000208: - insights.scorecard[].context: coverage=4.00, types={'str': 12}, unique~=8
000209:   examples="New farmers in last 30 days: 8"; "Activation rate in 30 days: 12.5%"; "Agent usage intensity over current window"
000210: - insights.operational_health.top_states[]: coverage=3.33, types={'dict': 10}, unique~=0
000211:   examples={"state": "maharashtra", "farmers": 1}; {"state": "punjab", "farmers": 1}; {"state": "uttar pradesh", "farmers": 1}
000212: - insights.operational_health.top_states[].state: coverage=3.33, types={'str': 10}, unique~=8
000213:   examples="maharashtra"; "punjab"; "uttar pradesh"
000214: - insights.operational_health.top_states[].farmers: coverage=3.33, types={'int': 10}, unique~=3
000215:   numeric[min=1.00, p50=1.00, max=8.00, mean=2.30]
000216:   examples=1; 8; 7
000217: - insights.recommendations[]: coverage=3.33, types={'str': 10}, unique~=4
000218:   examples="Run a 14-day onboarding nudging campaign for new farmers to improve activation."; "Prioritize at-risk farmers with targeted notifications and local language outreach."; "Launch profile completion prompts; missing profile data is blocking insight precision."
000219: - _id: coverage=1.00, types={'str': 3}, unique~=3
000220:   datetime[min=2026-03-26T00:00:00+00:00, max=2026-04-01T00:00:00+00:00, span_days=6]
000221:   examples="2026-03-26"; "2026-03-30"; "2026-04-01"
000222: - date: coverage=1.00, types={'str': 3}, unique~=3
000223:   datetime[min=2026-03-26T00:00:00+00:00, max=2026-04-01T00:00:00+00:00, span_days=6]
000224:   examples="2026-03-26"; "2026-03-30"; "2026-04-01"
000225: - window_days: coverage=1.00, types={'int': 3}, unique~=2
000226:   numeric[min=30.00, p50=30.00, max=90.00, mean=50.00]
000227:   examples=30; 90
000228: - insights: coverage=1.00, types={'dict': 3}, unique~=0
000229:   examples={"window_days": 30, "generated_at": "2026-03-26T22:39:27.786498+00:00", "scorecard": [{"title": "Total Farmers", "value": 8, "delta": 100.0, "trend": "up", "context": "New farme...; {"window_days": 90, "generated_at": "2026-03-30T15:19:00.610096+00:00", "scorecard": [{"title": "Total Farmers", "value": 8, "delta": 100.0, "trend": "up", "context": "New farme...; {"window_days": 30, "generated_at": "2026-04-01T20:16:25.579058+00:00", "scorecard": [{"title": "Total Farmers", "value": 13, "delta": 100.0, "trend": "up", "context": "New farm...
000230: - insights.window_days: coverage=1.00, types={'int': 3}, unique~=2
000231:   numeric[min=30.00, p50=30.00, max=90.00, mean=50.00]
000232:   examples=30; 90
000233: - insights.generated_at: coverage=1.00, types={'str': 3}, unique~=3
000234:   datetime[min=2026-03-26T22:39:27.786498+00:00, max=2026-04-01T20:16:25.579058+00:00, span_days=5]
000235:   examples="2026-03-26T22:39:27.786498+00:00"; "2026-03-30T15:19:00.610096+00:00"; "2026-04-01T20:16:25.579058+00:00"
000236: - insights.scorecard: coverage=1.00, types={'list': 3}, unique~=0
000237:   examples=[{"title": "Total Farmers", "value": 8, "delta": 100.0, "trend": "up", "context": "New farmers in last 30 days: 8"}, {"title": "Active Farmers", "value": 1, "delta": 12.5, "tren...; [{"title": "Total Farmers", "value": 8, "delta": 100.0, "trend": "up", "context": "New farmers in last 90 days: 8"}, {"title": "Active Farmers", "value": 1, "delta": 12.5, "tren...; [{"title": "Total Farmers", "value": 13, "delta": 100.0, "trend": "up", "context": "New farmers in last 30 days: 13"}, {"title": "Active Farmers", "value": 1, "delta": 7.69, "tr...
000238: - insights.growth_trends: coverage=1.00, types={'dict': 3}, unique~=0
000239:   examples={"farmers": [{"date": "2026-02-25", "value": 0}, {"date": "2026-02-26", "value": 0}, {"date": "2026-02-27", "value": 0}, {"date": "2026-02-28", "value": 0}, {"date": "2026-03-01...; {"farmers": [{"date": "2025-12-31", "value": 0}, {"date": "2026-01-01", "value": 0}, {"date": "2026-01-02", "value": 0}, {"date": "2026-01-03", "value": 0}, {"date": "2026-01-04...; {"farmers": [{"date": "2026-03-03", "value": 0}, {"date": "2026-03-04", "value": 0}, {"date": "2026-03-05", "value": 0}, {"date": "2026-03-06", "value": 0}, {"date": "2026-03-07...
000240: - insights.growth_trends.farmers: coverage=1.00, types={'list': 3}, unique~=0
000241:   examples=[{"date": "2026-02-25", "value": 0}, {"date": "2026-02-26", "value": 0}, {"date": "2026-02-27", "value": 0}, {"date": "2026-02-28", "value": 0}, {"date": "2026-03-01", "value": ...; [{"date": "2025-12-31", "value": 0}, {"date": "2026-01-01", "value": 0}, {"date": "2026-01-02", "value": 0}, {"date": "2026-01-03", "value": 0}, {"date": "2026-01-04", "value": ...; [{"date": "2026-03-03", "value": 0}, {"date": "2026-03-04", "value": 0}, {"date": "2026-03-05", "value": 0}, {"date": "2026-03-06", "value": 0}, {"date": "2026-03-07", "value": ...
000242: - insights.growth_trends.conversations: coverage=1.00, types={'list': 3}, unique~=0
000243:   examples=[{"date": "2026-02-25", "value": 0}, {"date": "2026-02-26", "value": 0}, {"date": "2026-02-27", "value": 0}, {"date": "2026-02-28", "value": 0}, {"date": "2026-03-01", "value": ...; [{"date": "2025-12-31", "value": 0}, {"date": "2026-01-01", "value": 0}, {"date": "2026-01-02", "value": 0}, {"date": "2026-01-03", "value": 0}, {"date": "2026-01-04", "value": ...; [{"date": "2026-03-03", "value": 0}, {"date": "2026-03-04", "value": 0}, {"date": "2026-03-05", "value": 0}, {"date": "2026-03-06", "value": 0}, {"date": "2026-03-07", "value": ...
000244: - insights.growth_trends.bookings: coverage=1.00, types={'list': 3}, unique~=0
000245:   examples=[{"date": "2026-02-25", "value": 0}, {"date": "2026-02-26", "value": 0}, {"date": "2026-02-27", "value": 0}, {"date": "2026-02-28", "value": 0}, {"date": "2026-03-01", "value": ...; [{"date": "2025-12-31", "value": 0}, {"date": "2026-01-01", "value": 0}, {"date": "2026-01-02", "value": 0}, {"date": "2026-01-03", "value": 0}, {"date": "2026-01-04", "value": ...; [{"date": "2026-03-03", "value": 0}, {"date": "2026-03-04", "value": 0}, {"date": "2026-03-05", "value": 0}, {"date": "2026-03-06", "value": 0}, {"date": "2026-03-07", "value": ...
000246: Very sparse fields (<10% coverage):
000247: - insights.market_intelligence.top_commodities[]
000248: 
000249: --- app_config ---
000250: Total docs: 1
000251: Sample analyzed: 1
000252: Indexes:
000253: - _id_ | keys=SON([('_id', 1)]) | unique=False
000254: Quality findings:
000255: - High sparsity: 1 fields under 20% coverage
000256: - updated_at span: 0 days
000257: Top 14 fields by coverage:
000258: - _id: coverage=1.00, types={'str': 1}, unique~=1
000259:   examples="global"
000260: - agent_enabled: coverage=1.00, types={'bool': 1}, unique~=1
000261:   examples=true
000262: - data_gov_api_keys: coverage=1.00, types={'list': 1}, unique~=0
000263:   examples=[]
000264: - feature_flags: coverage=1.00, types={'dict': 1}, unique~=0
000265:   examples={"schemes_search": true, "voice_streaming": true, "price_alerts": true, "admin_dashboard": true}
000266: - feature_flags.schemes_search: coverage=1.00, types={'bool': 1}, unique~=1
000267:   examples=true
000268: - feature_flags.voice_streaming: coverage=1.00, types={'bool': 1}, unique~=1
000269:   examples=true
000270: - feature_flags.price_alerts: coverage=1.00, types={'bool': 1}, unique~=1
000271:   examples=true
000272: - feature_flags.admin_dashboard: coverage=1.00, types={'bool': 1}, unique~=1
000273:   examples=true
000274: - maintenance_mode: coverage=1.00, types={'bool': 1}, unique~=1
000275:   examples=false
000276: - max_price_alert_per_user: coverage=1.00, types={'int': 1}, unique~=1
000277:   numeric[min=10.00, p50=10.00, max=10.00, mean=10.00]
000278:   examples=10
000279: - updated_at: coverage=1.00, types={'str': 1}, unique~=1
000280:   datetime[min=2026-03-24T21:00:25.151136+00:00, max=2026-03-24T21:00:25.151136+00:00, span_days=0]
000281:   examples="2026-03-24T21:00:25.151136+00:00"
000282: - updated_by: coverage=1.00, types={'str': 1}, unique~=1
000283:   examples="seed_script"
000284: - voice_enabled: coverage=1.00, types={'bool': 1}, unique~=1
000285:   examples=true
000286: - data_gov_api_keys[]: coverage=0.00, types={'null': 1}, unique~=0
000287: Very sparse fields (<10% coverage):
000288: - data_gov_api_keys[]
000289: 
000290: --- calendar_action_logs ---
000291: Total docs: 13
000292: Sample analyzed: 13
000293: Indexes:
000294: - _id_ | keys=SON([('_id', 1)]) | unique=False
000295: Quality findings:
000296: - High sparsity: 60 fields under 20% coverage
000297: - created_at span: 4 days
000298: Top 30 fields by coverage:
000299: - payload.deleted.metadata.route_context.schemes.results[].tags[]: coverage=7.23, types={'str': 94}, unique~=37
000300:   examples="credit"; "loan"; "kisan credit"
000301: - payload.deleted.metadata.route_context.mandis.mandis[]: coverage=3.08, types={'dict': 40}, unique~=0
000302:   examples={"name": "Pundibari", "state": "West Bengal", "district": "Coochbehar", "source": "data.gov.in_daily_prices", "ingested_at": "2026-03-25T21:16:07.072428+00:00"}; {"name": "Toofanganj", "state": "West Bengal", "district": "Coochbehar", "source": "data.gov.in_daily_prices", "ingested_at": "2026-03-25T21:16:07.072428+00:00"}; {"name": "Sheoraphuly", "state": "West Bengal", "district": "Hooghly", "source": "data.gov.in_daily_prices", "ingested_at": "2026-03-25T21:16:07.072428+00:00"}
000303: - payload.deleted.metadata.route_context.mandis.mandis[].name: coverage=3.08, types={'str': 40}, unique~=20
000304:   examples="Pundibari"; "Toofanganj"; "Sheoraphuly"
000305: - payload.deleted.metadata.route_context.mandis.mandis[].state: coverage=3.08, types={'str': 40}, unique~=4
000306:   examples="West Bengal"; "Uttar Pradesh"; "Gujarat"
000307: - payload.deleted.metadata.route_context.mandis.mandis[].district: coverage=3.08, types={'str': 40}, unique~=13
000308:   examples="Coochbehar"; "Hooghly"; "Bulandshahar"
000309: - payload.deleted.metadata.route_context.mandis.mandis[].source: coverage=3.08, types={'str': 40}, unique~=1
000310:   examples="data.gov.in_daily_prices"
000311: - payload.deleted.metadata.route_context.mandis.mandis[].ingested_at: coverage=3.08, types={'str': 40}, unique~=1
000312:   datetime[min=2026-03-25T21:16:07.072428+00:00, max=2026-03-25T21:16:07.072428+00:00, span_days=0]
000313:   examples="2026-03-25T21:16:07.072428+00:00"
000314: - payload.deleted.metadata.route_context.schemes.results[].where_to_apply[]: coverage=2.77, types={'str': 36}, unique~=8
000315:   examples="Official portal: https://www.nabard.org"; "Nearest CSC"; "District Agriculture Department Office"
000316: - payload.deleted.metadata.route_context.schemes.results[].required_documents[]: coverage=2.31, types={'str': 30, 'null': 6}, unique~=13
000317:   examples="Aadhaar Card"; "PAN Card"; "Land ownership documents (7/12 extract / Khasra)"
000318: - payload.deleted.metadata.route_context.schemes.results[].benefits[]: coverage=2.15, types={'str': 28, 'null': 6}, unique~=14
000319:   examples="Short-term crop loan at 4% interest (after 3% subvention from Govt). Loan up to Rs. 3 lakh at concessional rate. Credit limit based on land holding. Flexible withdrawal and rep...; "000. Asset insurance coverage."; "Enhanced convergence of PM-KISAN"
000320: - payload.deleted.metadata.route_context.schemes.results[].eligibility[]: coverage=2.00, types={'str': 26, 'null': 6}, unique~=13
000321:   examples="All farmers - individual or joint borrowers"; "Tenant farmers, oral lessees and share croppers"; "Self Help Groups (SHGs) and Joint Liability Groups (JLGs)"
000322: - payload.deleted.metadata.route_context.schemes.results[].application_process[]: coverage=1.85, types={'str': 24, 'null': 6}, unique~=12
000323:   examples="Step 1: Visit your nearest bank branch (SBI, UCO, PNB, Cooperative Bank etc.) or apply online Any scheduled commercial bank, regional rural bank, or cooperative bank provides K...; "Step 2: Download and fill KCC application form Available at bank branches or online on bank websites"; "Step 3: Submit application with all required documents Land records, Aadhaar, bank account details are mandatory"
000324: - payload.deleted.metadata.route_context.market_prices.prices[]: coverage=1.54, types={'dict': 20}, unique~=0
000325:   examples={"market": "Kharar APMC", "state": "Punjab", "district": "Mohali", "commodity": "Tomato", "variety": "Tomato", "modal_price": 2000, "min_price": 1500, "max_price": 2500, "arriva...; {"market": "Pallikonda(Uzhavar Sandhai)", "state": "Tamil Nadu", "district": "Vellore", "commodity": "Tomato", "variety": "Deshi", "modal_price": 1650, "min_price": 1500, "max_p...; {"market": "Peravurani(Uzhavar Sandhai)", "state": "Tamil Nadu", "district": "Thanjavur", "commodity": "Tomato", "variety": "Deshi", "modal_price": 2000, "min_price": 2000, "max...
000326: - payload.deleted.metadata.route_context.market_prices.prices[].market: coverage=1.54, types={'str': 20}, unique~=10
000327:   examples="Kharar APMC"; "Pallikonda(Uzhavar Sandhai)"; "Peravurani(Uzhavar Sandhai)"
000328: - payload.deleted.metadata.route_context.market_prices.prices[].state: coverage=1.54, types={'str': 20}, unique~=5
000329:   examples="Punjab"; "Tamil Nadu"; "Maharashtra"
000330: - payload.deleted.metadata.route_context.market_prices.prices[].district: coverage=1.54, types={'str': 20}, unique~=10
000331:   examples="Mohali"; "Vellore"; "Thanjavur"
000332: - payload.deleted.metadata.route_context.market_prices.prices[].commodity: coverage=1.54, types={'str': 20}, unique~=1
000333:   examples="Tomato"
000334: - payload.deleted.metadata.route_context.market_prices.prices[].variety: coverage=1.54, types={'str': 20}, unique~=5
000335:   examples="Tomato"; "Deshi"; "Other"
000336: - payload.deleted.metadata.route_context.market_prices.prices[].modal_price: coverage=1.54, types={'int': 20}, unique~=9
000337:   numeric[min=800.00, p50=1700.00, max=3600.00, mean=1760.00]
000338:   examples=2000; 1650; 1700
000339: - payload.deleted.metadata.route_context.market_prices.prices[].min_price: coverage=1.54, types={'int': 20}, unique~=6
000340:   numeric[min=250.00, p50=1500.00, max=3500.00, mean=1535.00]
000341:   examples=1500; 2000; 1600
000342: - payload.deleted.metadata.route_context.market_prices.prices[].max_price: coverage=1.54, types={'int': 20}, unique~=7
000343:   numeric[min=1125.00, p50=1800.00, max=3700.00, mean=1962.50]
000344:   examples=2500; 1800; 2000
000345: - payload.deleted.metadata.route_context.market_prices.prices[].arrival_date: coverage=1.54, types={'str': 20}, unique~=1
000346:   examples="20/03/2026"
000347: - payload.deleted.metadata.route_context.market_prices.prices[].ingested_at: coverage=1.54, types={'str': 20}, unique~=1
000348:   datetime[min=2026-03-24T20:19:48.396062+00:00, max=2026-03-24T20:19:48.396062+00:00, span_days=0]
000349:   examples="2026-03-24T20:19:48.396062+00:00"
000350: - payload.deleted.metadata.route_context.schemes.results[].categories[]: coverage=1.38, types={'str': 18}, unique~=5
000351:   examples="Agricultural Credit"; "Integrated Agricultural Development"; "Agriculture Extension"
000352: - payload.deleted.metadata.route_context.schemes.results[].official_links[]: coverage=1.23, types={'str': 16}, unique~=8
000353:   examples="https://www.nabard.org"; "https://www.sbi.co.in/web/agri-rural/agriculture-banking/kisan-credit-card"; "https://agricoop.nic.in"
000354: - payload.event_ids[]: coverage=1.15, types={'str': 15}, unique~=15
000355:   examples="f50fc03a3b104825a958ddd5f2530498"; "bc8227f6b53a4a4cbc379fe27579a375"; "af1536e6664a40e7bfaea3f210a6d4c4"
000356: - _id: coverage=1.00, types={'str': 13}, unique~=13
000357:   examples="83a5bb5ff6f54224a22488386011db27"; "b5a15bebf2fc4e15b97fdf089513c4d7"; "77969ec2e83a42eab88cab5f7a0e5338"
000358: - user_id: coverage=1.00, types={'str': 13}, unique~=1
000359:   examples="seed_farmer_01"
000360: - action_type: coverage=1.00, types={'str': 13}, unique~=3
000361:   examples="batch_create"; "update"; "delete"
000362: - payload: coverage=1.00, types={'dict': 13}, unique~=0
000363:   examples={"event_ids": ["f50fc03a3b104825a958ddd5f2530498", "bc8227f6b53a4a4cbc379fe27579a375"], "request_text": "Please schedule and verify these events in my calendar: 2026-04-12 06:30...; {"before": {"id": "f50fc03a3b104825a958ddd5f2530498", "title": "E2E Calendar Task One", "event_date": "2026-04-12", "event_time": "06:30", "status": "planned", "details": "Sched...; {"deleted": {"id": "bc8227f6b53a4a4cbc379fe27579a375", "user_id": "seed_farmer_01", "title": "E2E Calendar Task Two.", "details": "Scheduled from chat request", "event_date": "2...
000364: 
000365: --- calendar_events ---
000366: Total docs: 18
000367: Sample analyzed: 18
000368: Indexes:
000369: - _id_ | keys=SON([('_id', 1)]) | unique=False
000370: Quality findings:
000371: - High sparsity: 60 fields under 20% coverage
000372: - created_at span: 4 days
000373: - updated_at span: 4 days
000374: Top 30 fields by coverage:
000375: - metadata.route_context.schemes.results[].tags[]: coverage=15.00, types={'str': 270}, unique~=132
000376:   examples="Haryana"; "farm mechanization"; "tractor subsidy"
000377: - metadata.route_context.schemes.results[].required_documents[]: coverage=8.39, types={'str': 151, 'null': 7}, unique~=65
000378:   examples="Aadhaar Card"; "Land records (Jamabandi/Fard)"; "Bank account details (with IFSC)"
000379: - metadata.route_context.schemes.results[].eligibility[]: coverage=7.39, types={'str': 133, 'null': 7}, unique~=80
000380:   examples="Permanent resident of Haryana"; "Must be a farmer with agricultural land in own name or close family member's name (spouse, parents, children)"; "Small, marginal, women, and SC farmers get priority"
000381: - metadata.route_context.schemes.results[].application_process[]: coverage=6.72, types={'str': 121, 'null': 7}, unique~=73
000382:   examples="Step 1: Register on Haryana Agriculture portal or Meri Fasal Mera Byora Create farmer account if not already registered (https://agriharyana.gov.in)"; "Step 2: Apply online for Krishi Yantra Anudan Yojana Fill application with district, block, name, Aadhaar, land details (https://www.agriharyanacrm.com)"; "Step 3: Submit application and note reference number Save reference number for tracking"
000383: - metadata.route_context.mandis.mandis[]: coverage=6.61, types={'dict': 119}, unique~=0
000384:   examples={"name": "Bhiwani", "state": "Haryana", "district": "Bhiwani", "source": "data.gov.in_daily_prices", "ingested_at": "2026-03-25T21:16:07.072428+00:00"}; {"name": "Ch. Dadri", "state": "Haryana", "district": "Bhiwani", "source": "data.gov.in_daily_prices", "ingested_at": "2026-03-25T21:16:07.072428+00:00"}; {"name": "Tosham", "state": "Haryana", "district": "Bhiwani", "source": "data.gov.in_daily_prices", "ingested_at": "2026-03-25T21:16:07.072428+00:00"}
000385: - metadata.route_context.mandis.mandis[].name: coverage=6.61, types={'str': 119}, unique~=22
000386:   examples="Bhiwani"; "Ch. Dadri"; "Tosham"
000387: - metadata.route_context.mandis.mandis[].state: coverage=6.61, types={'str': 119}, unique~=4
000388:   examples="Haryana"; "West Bengal"; "Uttar Pradesh"
000389: - metadata.route_context.mandis.mandis[].district: coverage=6.61, types={'str': 119}, unique~=15
000390:   examples="Bhiwani"; "Hissar"; "Panchkula"
000391: - metadata.route_context.mandis.mandis[].source: coverage=6.61, types={'str': 119}, unique~=1
000392:   examples="data.gov.in_daily_prices"
000393: - metadata.route_context.mandis.mandis[].ingested_at: coverage=6.39, types={'str': 119}, unique~=2
000394:   datetime[min=2026-03-25T21:16:07.072428+00:00, max=2026-03-25T21:16:07.072428+00:00, span_days=0]
000395:   examples="2026-03-25T21:16:07.072428+00:00"; ""
000396: - metadata.route_context.schemes.results[].where_to_apply[]: coverage=6.33, types={'str': 114}, unique~=23
000397:   examples="Official portal: https://agriharyana.gov.in"; "Nearest CSC"; "District Agriculture Department Office"
000398: - metadata.route_context.schemes.results[].benefits[]: coverage=4.94, types={'str': 89, 'null': 7}, unique~=54
000399:   examples="40-50% subsidy on purchase of eligible agricultural machinery. Maximum subsidy up to Rs. 3 lakh for tractors for SC farmers. Up to 3 machines per farmer."; "Rs. 4"; "000 per acre incentive for farmers adopting DSR technique. Saves water and labour. Eligible for DSR machine subsidy additionally."
000400: - metadata.route_context.schemes.results[]: coverage=4.61, types={'str': 45, 'dict': 38}, unique~=6
000401:   examples="Under Pradhan Mantri Krishi Sinchai Yojana (PMKSY) - Per Drop More Crop: Other farmers: 45% subsidy"; "Under Pradhan Mantri Krishi Sinchai Yojana (PMKSY) - Per Drop More Crop: Fertigation support included"; "Under Pradhan Mantri Krishi Sinchai Yojana (PMKSY) - Per Drop More Crop: Small/marginal farmers: 55% subsidy on micro-irrigation systems"
000402: - metadata.route_context.market_prices.prices[]: coverage=3.89, types={'null': 5, 'dict': 70}, unique~=0
000403:   examples={"market": "Pundri APMC", "state": "Haryana", "district": "Kaithal", "commodity": "Tomato", "variety": "Other", "modal_price": 1700, "min_price": 1600, "max_price": 1800, "arriv...; {"market": "Sonepat APMC", "state": "Haryana", "district": "Sonipat", "commodity": "Tomato", "variety": "Deshi", "modal_price": 1000, "min_price": 900, "max_price": 1500, "arriv...; {"market": "Raipur Rai APMC", "state": "Haryana", "district": "Panchkula", "commodity": "Tomato", "variety": "Tomato", "modal_price": 1800, "min_price": 1800, "max_price": 2000,...
000404: - metadata.route_context.market_prices.prices[].market: coverage=3.89, types={'str': 70}, unique~=20
000405:   examples="Pundri APMC"; "Sonepat APMC"; "Raipur Rai APMC"
000406: - metadata.route_context.market_prices.prices[].state: coverage=3.89, types={'str': 70}, unique~=6
000407:   examples="Haryana"; "Punjab"; "Tamil Nadu"
000408: - metadata.route_context.market_prices.prices[].district: coverage=3.89, types={'str': 70}, unique~=18
000409:   examples="Kaithal"; "Sonipat"; "Panchkula"
000410: - metadata.route_context.market_prices.prices[].commodity: coverage=3.89, types={'str': 70}, unique~=1
000411:   examples="Tomato"
000412: - metadata.route_context.market_prices.prices[].variety: coverage=3.89, types={'str': 70}, unique~=5
000413:   examples="Other"; "Deshi"; "Tomato"
000414: - metadata.route_context.market_prices.prices[].modal_price: coverage=3.89, types={'int': 70}, unique~=13
000415:   numeric[min=800.00, p50=1700.00, max=3600.00, mean=1678.57]
000416:   examples=1700; 1000; 1800
000417: - metadata.route_context.market_prices.prices[].min_price: coverage=3.89, types={'int': 70}, unique~=9
000418:   numeric[min=250.00, p50=1500.00, max=3500.00, mean=1467.86]
000419:   examples=1600; 900; 1800
000420: - metadata.route_context.market_prices.prices[].max_price: coverage=3.89, types={'int': 70}, unique~=8
000421:   numeric[min=1125.00, p50=1800.00, max=3700.00, mean=1861.79]
000422:   examples=1800; 1500; 2000
000423: - metadata.route_context.market_prices.prices[].arrival_date: coverage=3.89, types={'str': 70}, unique~=1
000424:   examples="20/03/2026"
000425: - metadata.route_context.market_prices.prices[].ingested_at: coverage=3.89, types={'str': 70}, unique~=1
000426:   datetime[min=2026-03-24T20:19:48.396062+00:00, max=2026-03-24T20:19:48.396062+00:00, span_days=0]
000427:   examples="2026-03-24T20:19:48.396062+00:00"
000428: - metadata.route_context.weather_knowledge.results[]: coverage=3.50, types={'str': 63}, unique~=8
000429:   examples="Sprinkler Irrigation System (\u0938\u094d\u092a\u094d\u0930\u093f\u0902\u0915\u0932\u0930 \u0938\u093f\u0902\u091a\u093e\u0908 \u092a\u094d\u0930\u0923\u093e\u0932\u0940): Port...; "Drip Irrigation Kit (Portable) (\u0921\u094d\u0930\u093f\u092a \u0938\u093f\u0902\u091a\u093e\u0908 \u0915\u093f\u091f): Temporary drip kit for seasonal crops. Rental: \u20b945...; "Drip Irrigation Kit (Portable) (\u0921\u094d\u0930\u093f\u092a \u0938\u093f\u0902\u091a\u093e\u0908 \u0915\u093f\u091f): Temporary drip kit for seasonal crops. Category: Irriga...
000430: - metadata.route_context.equipment.results[]: coverage=3.39, types={'str': 60, 'dict': 1}, unique~=10
000431:   examples="Cultivator (\u0915\u0932\u094d\u091f\u0940\u0935\u0947\u091f\u0930): 9-tyne cultivator for secondary tillage. Rental: \u20b9650/per acre. Availability: High."; "Potato Planter (\u0906\u0932\u0942 \u092c\u094b\u0935\u093e\u0908 \u092e\u0936\u0940\u0928): Automatic potato planter with fertilizer attachment. Category: Sowing & Planting. R...; "Potato Planter (\u0906\u0932\u0942 \u092c\u094b\u0935\u093e\u0908 \u092e\u0936\u0940\u0928): Automatic potato planter with fertilizer attachment. Rental: \u20b92000/per acre. A...
000432: - metadata.route_context.crop_calendar.info[]: coverage=3.00, types={'str': 54}, unique~=3
000433:   examples="Finalize seed and field prep 2-3 weeks before local sowing window."; "Complete sowing when soil moisture is adequate and temperature supports germination."; "Plan harvest labor and storage in advance to reduce post-harvest losses."
000434: - metadata.route_context.schemes.results[].official_links[]: coverage=2.78, types={'str': 50}, unique~=25
000435:   examples="https://agriharyana.gov.in"; "https://www.agriharyanacrm.com"; "https://fasal.haryana.gov.in"
000436: - metadata.route_context.schemes.results[].categories[]: coverage=2.50, types={'str': 45}, unique~=19
000437:   examples="Farm Mechanization"; "Water Conservation"; "Agricultural Credit"
000438: - metadata.route_context.mandis.results[]: coverage=2.22, types={'str': 40}, unique~=8
000439:   examples="[Commodity: Karbuja(Musk Melon)] [Market: PMY Kangni Mandi, Mandi, Himachal Pradesh] Recent modal price \u20b92900/quintal. 7-day avg: \u20b92900. Trend: STABLE."; "[Commodity: Arhar(Tur/Red Gram)(Whole)] [Market: Mahuva(Station Road) APMC, Bhavnagar, Gujarat] Recent modal price \u20b96910/quintal. 7-day avg: \u20b96910. Trend: STABLE."; "[Commodity: Masur Dal] [Market: Dhanotu (Mandi), Mandi, Himachal Pradesh] Recent modal price \u20b92782/quintal. 7-day avg: \u20b92782. Trend: DOWN."
000440: Very sparse fields (<10% coverage):
000441: - metadata.route_context.mandis.requested_filters.district
000442: - metadata.route_context.soil.as_of_latest_date
000443: - metadata.route_context.soil.records[]
000444: - metadata.route_context.weather_knowledge.source
000445: - metadata.route_context.weather_knowledge.retrieved_at_utc
000446: - metadata.route_context.weather_knowledge.note
000447: - metadata.route_context.equipment.retrieved_at_utc
000448: - metadata.route_context.equipment.results[].equipment
000449: - metadata.route_context.equipment.results[].category
000450: - metadata.route_context.equipment.results[].provider
000451: - metadata.route_context.equipment.results[].state
000452: - metadata.route_context.equipment.results[].district
000453: - metadata.route_context.equipment.results[].rate_hourly
000454: - metadata.route_context.equipment.results[].rate_daily
000455: - metadata.route_context.equipment.results[].contact
000456: - metadata.route_context.equipment.results[].last_updated
000457: - metadata.route_context.equipment.total
000458: - metadata.route_context.equipment.note
000459: 
000460: --- chat_user_preferences ---
000461: Total docs: 1
000462: Sample analyzed: 1
000463: Indexes:
000464: - _id_ | keys=SON([('_id', 1)]) | unique=False
000465: Quality findings:
000466: - updated_at span: 0 days
000467: Top 3 fields by coverage:
000468: - _id: coverage=1.00, types={'str': 1}, unique~=1
000469:   examples="seed_farmer_01"
000470: - response_mode: coverage=1.00, types={'str': 1}, unique~=1
000471:   examples="detailed"
000472: - updated_at: coverage=1.00, types={'str': 1}, unique~=1
000473:   datetime[min=2026-04-02T22:14:20.540957+00:00, max=2026-04-02T22:14:20.540957+00:00, span_days=0]
000474:   examples="2026-04-02T22:14:20.540957+00:00"
000475: 
000476: --- crops ---
000477: Total docs: 8
000478: Sample analyzed: 8
000479: Indexes:
000480: - _id_ | keys=SON([('_id', 1)]) | unique=False
000481: Quality findings:
000482: - created_at span: 0 days
000483: - updated_at span: 0 days
000484: Top 11 fields by coverage:
000485: - _id: coverage=1.00, types={'str': 8}, unique~=8
000486:   examples="crop_seed_farmer_01"; "crop_seed_farmer_02"; "crop_seed_farmer_03"
000487: - farmer_id: coverage=1.00, types={'str': 8}, unique~=8
000488:   examples="seed_farmer_01"; "seed_farmer_02"; "seed_farmer_03"
000489: - name: coverage=1.00, types={'str': 8}, unique~=8
000490:   examples="Wheat"; "Rice"; "Soybean"
000491: - variety: coverage=1.00, types={'str': 8}, unique~=8
000492:   examples="HD-2967"; "Pusa Basmati 1121"; "JS-335"
000493: - season: coverage=1.00, types={'str': 8}, unique~=2
000494:   examples="kharif"; "rabi"
000495: - area: coverage=1.00, types={'float': 8}, unique~=8
000496:   numeric[min=1.50, p50=2.90, max=4.90, mean=3.19]
000497:   examples=1.5; 2.0; 2.5
000498: - sowing_date: coverage=1.00, types={'str': 8}, unique~=2
000499:   datetime[min=2026-06-15T00:00:00+00:00, max=2026-11-12T00:00:00+00:00, span_days=150]
000500:   examples="2026-06-15"; "2026-11-12"
000501: - status: coverage=1.00, types={'str': 8}, unique~=1
000502:   examples="growing"
000503: - created_at: coverage=1.00, types={'str': 8}, unique~=8
000504:   datetime[min=2026-03-24T21:00:43.627707+00:00, max=2026-03-24T21:00:45.904026+00:00, span_days=0]
000505:   examples="2026-03-24T21:00:43.627707+00:00"; "2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"
000506: - updated_at: coverage=1.00, types={'str': 8}, unique~=8
000507:   datetime[min=2026-03-24T21:00:43.627707+00:00, max=2026-03-24T21:00:45.904026+00:00, span_days=0]
000508:   examples="2026-03-24T21:00:43.627707+00:00"; "2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"
000509: - is_seed_data: coverage=1.00, types={'bool': 8}, unique~=1
000510:   examples=true
000511: 
000512: --- document_builder_sessions ---
000513: Total docs: 14
000514: Sample analyzed: 14
000515: Indexes:
000516: - _id_ | keys=SON([('_id', 1)]) | unique=False
000517: Quality findings:
000518: - High sparsity: 4 fields under 20% coverage
000519: - created_at span: 9 days
000520: - updated_at span: 9 days
000521: Top 30 fields by coverage:
000522: - form_fields[]: coverage=14.57, types={'dict': 204}, unique~=0
000523:   examples={"field": "farmer_name", "label": "Full Name", "type": "text", "required": true, "hindi_label": "\u092a\u0942\u0930\u093e \u0928\u093e\u092e"}; {"field": "father_name", "label": "Father's Name", "type": "text", "required": true, "hindi_label": "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e"}; {"field": "gender", "label": "Gender", "type": "select", "options": ["Male", "Female", "Other"], "required": true, "hindi_label": "\u0932\u093f\u0902\u0917"}
000524: - form_fields[].field: coverage=14.57, types={'str': 204}, unique~=22
000525:   examples="farmer_name"; "father_name"; "gender"
000526: - form_fields[].label: coverage=14.57, types={'str': 204}, unique~=22
000527:   examples="Full Name"; "Father's Name"; "Gender"
000528: - form_fields[].type: coverage=14.57, types={'str': 204}, unique~=4
000529:   examples="text"; "select"; "date"
000530: - form_fields[].required: coverage=14.57, types={'bool': 204}, unique~=2
000531:   examples=true; false
000532: - form_fields[].hindi_label: coverage=14.57, types={'str': 204}, unique~=24
000533:   examples="\u092a\u0942\u0930\u093e \u0928\u093e\u092e"; "\u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e"; "\u0932\u093f\u0902\u0917"
000534: - questions_asked[]: coverage=8.79, types={'str': 123}, unique~=16
000535:   examples="ifsc_code"; "bank_account_number"; "father_name"
000536: - form_fields[].options[]: coverage=5.43, types={'str': 76}, unique~=13
000537:   examples="Male"; "Female"; "Other"
000538: - required_documents[]: coverage=5.36, types={'str': 75}, unique~=11
000539:   examples="Aadhaar Card"; "Land ownership documents / Land records (Khatauni/Khasra)"; "Bank account details (passbook copy)"
000540: - form_fields[].options: coverage=1.50, types={'list': 21}, unique~=0
000541:   examples=["Male", "Female", "Other"]; ["General", "SC", "ST", "OBC"]; ["Canal", "Tube Well", "Well", "Rain-fed", "Drip", "Sprinkler"]
000542: - uploaded_documents[].extracted_fields[]: coverage=1.43, types={'str': 20}, unique~=2
000543:   examples="farmer_name"; "date_of_birth"
000544: - _id: coverage=1.00, types={'str': 14}, unique~=14
000545:   examples="a30367d66a6047cfa0bd9510ce5163d1"; "3b6056a4e2a24d0a8976a9ce7ea8f51b"; "de19e9f9621a461bb67caadcc2fa3005"
000546: - session_id: coverage=1.00, types={'str': 14}, unique~=14
000547:   examples="a30367d66a6047cfa0bd9510ce5163d1"; "3b6056a4e2a24d0a8976a9ce7ea8f51b"; "de19e9f9621a461bb67caadcc2fa3005"
000548: - scheme_name: coverage=1.00, types={'str': 14}, unique~=3
000549:   examples="PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)"; "Soil Health Card Scheme"; "Mukhyamantri Kisan Kalyan Yojana (Madhya Pradesh)"
000550: - scheme_short_name: coverage=1.00, types={'str': 14}, unique~=3
000551:   examples="PM-KISAN"; "SHC"; "MKKY"
000552: - scheme_category: coverage=1.00, types={'str': 14}, unique~=2
000553:   examples="income_support"; "soil_health"
000554: - form_fields: coverage=1.00, types={'list': 14}, unique~=0
000555:   examples=[{"field": "farmer_name", "label": "Full Name", "type": "text", "required": true, "hindi_label": "\u092a\u0942\u0930\u093e \u0928\u093e\u092e"}, {"field": "father_name", "label"...; [{"field": "farmer_name", "label": "Full Name", "type": "text", "required": true, "hindi_label": "\u092a\u0942\u0930\u093e \u0928\u093e\u092e"}, {"field": "mobile_number", "labe...; [{"field": "farmer_name", "label": "Full Name", "type": "text", "required": true, "hindi_label": "\u092a\u0942\u0930\u093e \u0928\u093e\u092e"}, {"field": "aadhaar_number", "lab...
000556: - filled_fields: coverage=1.00, types={'dict': 14}, unique~=0
000557:   examples={"state": "state", "district": "district", "village": "village", "aadhaar_number": "123456789012", "farmer_name": "Vinayak", "date_of_birth": "01/01/1990"}; {"state": "Maharashtra", "district": "Mumbai", "village": "Mulund", "farmer_name": "Vinayak Bhatia", "mobile_number": "9930679651", "khasra_number": "3455", "land_area_hectares"...; {"state": "state", "district": "district", "village": "village"}
000558: - filled_fields.state: coverage=1.00, types={'str': 14}, unique~=2
000559:   examples="state"; "Maharashtra"
000560: - filled_fields.district: coverage=1.00, types={'str': 14}, unique~=3
000561:   examples="district"; "Mumbai"; "mumbai"
000562: - filled_fields.village: coverage=1.00, types={'str': 14}, unique~=3
000563:   examples="village"; "Mulund"; "mulund"
000564: - required_documents: coverage=1.00, types={'list': 14}, unique~=0
000565:   examples=["Aadhaar Card", "Land ownership documents / Land records (Khatauni/Khasra)", "Bank account details (passbook copy)", "Mobile number linked with Aadhaar", "State/UT domicile cer...; ["Aadhaar Card", "Land details (khasra/survey number)", "Mobile number"]; ["Aadhaar Card", "PM-KISAN registration", "Bank account details", "Land records (Khasra/B1)"]
000566: - uploaded_documents: coverage=1.00, types={'list': 14}, unique~=0
000567:   examples=[{"filename": "sample.txt", "path": "/tmp/doc_uploads/a30367d66a6047cfa0bd9510ce5163d1_sample.txt", "extracted_fields": ["farmer_name", "date_of_birth"], "uploaded_at": "2026-03...; [{"filename": "sample.txt", "path": "/tmp/doc_uploads/3b6056a4e2a24d0a8976a9ce7ea8f51b_sample.txt", "extracted_fields": ["farmer_name", "date_of_birth"], "uploaded_at": "2026-03...; [{"filename": "sample.txt", "path": "/tmp/doc_uploads/de19e9f9621a461bb67caadcc2fa3005_sample.txt", "extracted_fields": ["farmer_name", "date_of_birth"], "uploaded_at": "2026-03...
000568: - status: coverage=1.00, types={'str': 14}, unique~=2
000569:   examples="in_progress"; "completed"
000570: - questions_asked: coverage=1.00, types={'list': 14}, unique~=0
000571:   examples=["ifsc_code", "bank_account_number", "father_name", "mobile_number", "sub_district", "bank_name", "farmer_name", "date_of_birth", "aadhaar_number", "gender"]; ["gender", "farmer_name", "ifsc_code", "mobile_number", "father_name", "bank_account_number", "sub_district", "bank_name", "aadhaar_number", "date_of_birth"]; ["sub_district", "bank_name", "date_of_birth", "gender", "aadhaar_number", "mobile_number", "farmer_name", "father_name", "ifsc_code", "bank_account_number"]
000572: - created_at: coverage=1.00, types={'str': 14}, unique~=14
000573:   datetime[min=2026-03-24T21:04:37.662351+00:00, max=2026-04-03T20:48:39.374369+00:00, span_days=9]
000574:   examples="2026-03-24T21:04:37.662351+00:00"; "2026-03-24T21:10:05.041778+00:00"; "2026-03-24T21:15:49.843855+00:00"
000575: - updated_at: coverage=1.00, types={'str': 14}, unique~=14
000576:   datetime[min=2026-03-24T21:04:50.597432+00:00, max=2026-04-03T20:48:50.753255+00:00, span_days=9]
000577:   examples="2026-03-24T21:04:50.597432+00:00"; "2026-03-24T21:10:14.211341+00:00"; "2026-03-24T21:15:59.943694+00:00"
000578: - filled_fields.farmer_name: coverage=0.93, types={'str': 13}, unique~=3
000579:   examples="Vinayak"; "Vinayak Bhatia"; "vinayak bhatia"
000580: - filled_fields.aadhaar_number: coverage=0.86, types={'str': 12}, unique~=2
000581:   examples="123456789012"; "750352486425"
000582: - filled_fields.date_of_birth: coverage=0.71, types={'str': 10}, unique~=1
000583:   examples="01/01/1990"
000584: Very sparse fields (<10% coverage):
000585: - filled_fields.khasra_number
000586: - filled_fields.previous_crop
000587: 
000588: --- equipment ---
000589: Total docs: 48
000590: Sample analyzed: 48
000591: Indexes:
000592: - _id_ | keys=SON([('_id', 1)]) | unique=False
000593: - ix_farmer_updated_desc | keys=SON([('farmer_id', 1), ('updated_at', -1)]) | unique=False
000594: - ix_status_type_updated_desc | keys=SON([('status', 1), ('type', 1), ('updated_at', -1)]) | unique=False
000595: Quality findings:
000596: - High sparsity: 73 fields under 20% coverage
000597: - created_at span: 7 days
000598: - updated_at span: 7 days
000599: Top 30 fields by coverage:
000600: - _id: coverage=1.00, types={'str': 48}, unique~=48
000601:   examples="equipment_seed_farmer_01"; "equipment_seed_farmer_02"; "equipment_seed_farmer_03"
000602: - name: coverage=1.00, types={'str': 48}, unique~=43
000603:   examples="Tractor 45HP"; "Rotavator"; "Seed Drill"
000604: - created_at: coverage=1.00, types={'str': 48}, unique~=9
000605:   datetime[min=2026-03-24T21:00:43.627707+00:00, max=2026-04-01T16:59:16.988185+00:00, span_days=7]
000606:   examples="2026-03-24T21:00:43.627707+00:00"; "2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"
000607: - updated_at: coverage=1.00, types={'str': 48}, unique~=9
000608:   datetime[min=2026-03-24T21:00:43.627707+00:00, max=2026-04-01T16:59:16.988185+00:00, span_days=7]
000609:   examples="2026-03-24T21:00:43.627707+00:00"; "2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"
000610: - is_seed_data: coverage=1.00, types={'bool': 48}, unique~=1
000611:   examples=true
000612: - availability: coverage=0.83, types={'str': 40}, unique~=4
000613:   examples="High"; "Medium"; "Low"
000614: - category: coverage=0.83, types={'str': 40}, unique~=10
000615:   examples="land_preparation"; "sowing_planting"; "irrigation"
000616: - description: coverage=0.83, types={'str': 40}, unique~=40
000617:   examples="Medium-duty tractor for ploughing, tilling, and hauling"; "Multi-row seed drill for wheat, rice, pulses"; "Direct seeding in standing stubble (anti-stubble burning)"
000618: - hindi_name: coverage=0.83, types={'str': 40}, unique~=40
000619:   examples="\u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930 (35-45 HP)"; "\u0938\u0940\u0921 \u0921\u094d\u0930\u093f\u0932"; "\u0939\u0948\u092a\u0940 \u0938\u0940\u0921\u0930"
000620: - is_active: coverage=0.83, types={'bool': 40}, unique~=1
000621:   examples=true
000622: - rental_rates: coverage=0.83, types={'dict': 40}, unique~=0
000623:   examples={"hourly": {"min": 500, "max": 800, "avg": 650}, "daily": {"min": 3000, "max": 5000, "avg": 4000}, "per_acre": {"min": 800, "max": 1500, "avg": 1100}}; {"per_acre": {"min": 400, "max": 800, "avg": 600}}; {"per_acre": {"min": 1200, "max": 2000, "avg": 1600}}
000624: - source: coverage=0.83, types={'str': 40}, unique~=21
000625:   examples="CHC/FMTTI"; "CHC"; "CHC/State Agri Dept"
000626: - rental_rates.per_acre: coverage=0.54, types={'dict': 26}, unique~=0
000627:   examples={"min": 800, "max": 1500, "avg": 1100}; {"min": 400, "max": 800, "avg": 600}; {"min": 1200, "max": 2000, "avg": 1600}
000628: - rental_rates.per_acre.min: coverage=0.54, types={'int': 26}, unique~=12
000629:   numeric[min=200.00, p50=800.00, max=5000.00, mean=1176.92]
000630:   examples=800; 400; 1200
000631: - rental_rates.per_acre.max: coverage=0.54, types={'int': 26}, unique~=16
000632:   numeric[min=400.00, p50=1500.00, max=10000.00, mean=2119.23]
000633:   examples=1500; 800; 2000
000634: - rental_rates.per_acre.avg: coverage=0.54, types={'int': 26}, unique~=16
000635:   numeric[min=300.00, p50=1100.00, max=7500.00, mean=1640.38]
000636:   examples=1100; 600; 1600
000637: - popular_brands[]: coverage=0.38, types={'str': 18}, unique~=16
000638:   examples="Mahindra"; "Swaraj"; "John Deere"
000639: - state_variations: coverage=0.33, types={'dict': 16}, unique~=0
000640:   examples={"Punjab": {"per_acre": 900, "daily": 3500}, "Haryana": {"per_acre": 950, "daily": 3800}, "Uttar Pradesh": {"per_acre": 800, "daily": 3000}, "Madhya Pradesh": {"per_acre": 850, ...; {"Punjab": {"per_acre": 450}, "Haryana": {"per_acre": 500}, "Madhya Pradesh": {"per_acre": 550}, "Rajasthan": {"per_acre": 600}}; {"Punjab": {"per_acre": 1200}, "Haryana": {"per_acre": 1400}, "Uttar Pradesh": {"per_acre": 1500}}
000641: - rental_rates.daily: coverage=0.27, types={'dict': 13}, unique~=0
000642:   examples={"min": 3000, "max": 5000, "avg": 4000}; {"min": 5000, "max": 8000, "avg": 6500}; {"min": 600, "max": 1000, "avg": 800}
000643: - rental_rates.daily.min: coverage=0.27, types={'int': 13}, unique~=9
000644:   numeric[min=50.00, p50=500.00, max=5000.00, mean=1053.85]
000645:   examples=3000; 5000; 600
000646: - rental_rates.daily.max: coverage=0.27, types={'int': 13}, unique~=10
000647:   numeric[min=150.00, p50=800.00, max=8000.00, mean=1811.54]
000648:   examples=5000; 8000; 1000
000649: - rental_rates.daily.avg: coverage=0.27, types={'int': 13}, unique~=10
000650:   numeric[min=100.00, p50=650.00, max=6500.00, mean=1413.46]
000651:   examples=4000; 6500; 800
000652: - requires_tractor: coverage=0.25, types={'bool': 12}, unique~=1
000653:   examples=true
000654: - operator_included: coverage=0.23, types={'bool': 11}, unique~=1
000655:   examples=true
000656: - state_variations.Punjab: coverage=0.23, types={'dict': 11}, unique~=0
000657:   examples={"per_acre": 900, "daily": 3500}; {"per_acre": 450}; {"per_acre": 1200}
000658: - state_variations.Punjab.per_acre: coverage=0.23, types={'int': 11}, unique~=8
000659:   numeric[min=450.00, p50=1300.00, max=2000.00, mean=1259.09]
000660:   examples=900; 450; 1200
000661: - state_variations.Uttar Pradesh: coverage=0.23, types={'dict': 11}, unique~=0
000662:   examples={"per_acre": 800, "daily": 3000}; {"per_acre": 1500}; {"per_acre": 2000}
000663: - state_variations.Uttar Pradesh.per_acre: coverage=0.23, types={'int': 11}, unique~=6
000664:   numeric[min=600.00, p50=1500.00, max=5000.00, mean=1645.45]
000665:   examples=800; 1500; 2000
000666: - booking_advance_days: coverage=0.21, types={'int': 10}, unique~=5
000667:   numeric[min=1.00, p50=3.00, max=7.00, mean=3.60]
000668:   examples=1; 3; 5
000669: - fuel_cost_extra: coverage=0.21, types={'bool': 10}, unique~=2
000670:   examples=true; false
000671: Very sparse fields (<10% coverage):
000672: - popular_brands
000673: - state_rate
000674: - state_rate.per_acre
000675: - state_rate.daily
000676: - state_variations.Punjab.daily
000677: - state_variations.Haryana.daily
000678: - state_variations.Uttar Pradesh.daily
000679: - state_variations.Madhya Pradesh.daily
000680: - state_variations.Maharashtra.daily
000681: - state_variations.Karnataka.daily
000682: - state_variations.Tamil Nadu
000683: - state_variations.Tamil Nadu.per_acre
000684: - state_variations.Tamil Nadu.daily
000685: - state_variations.Rajasthan.daily
000686: - state_variations.Gujarat
000687: - state_variations.Gujarat.per_acre
000688: - state_variations.Gujarat.daily
000689: - state_variations.Andhra Pradesh
000690: - state_variations.Andhra Pradesh.per_acre
000691: - state_variations.Andhra Pradesh.daily
000692: - state_variations.Telangana
000693: - state_variations.Telangana.per_acre
000694: - state_variations.Telangana.daily
000695: - state_variations.West Bengal.daily
000696: - state_variations.Bihar
000697: - ... plus 24 more
000698: 
000699: --- equipment_bookings ---
000700: Total docs: 1
000701: Sample analyzed: 1
000702: Indexes:
000703: - _id_ | keys=SON([('_id', 1)]) | unique=False
000704: - ix_renter_created_desc | keys=SON([('renter_id', 1), ('created_at', -1)]) | unique=False
000705: - ix_owner_status_updated_desc | keys=SON([('owner_id', 1), ('status', 1), ('updated_at', -1)]) | unique=False
000706: - ix_equipment_status_start | keys=SON([('equipment_id', 1), ('status', 1), ('start_date', 1)]) | unique=False
000707: Quality findings:
000708: - created_at span: 0 days
000709: - updated_at span: 0 days
000710: Top 12 fields by coverage:
000711: - _id: coverage=1.00, types={'str': 1}, unique~=1
000712:   examples="booking_seed_01"
000713: - equipment_id: coverage=1.00, types={'str': 1}, unique~=1
000714:   examples="equipment_seed_farmer_01"
000715: - equipment_name: coverage=1.00, types={'str': 1}, unique~=1
000716:   examples="Tractor 45HP"
000717: - owner_id: coverage=1.00, types={'str': 1}, unique~=1
000718:   examples="seed_farmer_01"
000719: - renter_id: coverage=1.00, types={'str': 1}, unique~=1
000720:   examples="seed_farmer_02"
000721: - start_date: coverage=1.00, types={'str': 1}, unique~=1
000722:   datetime[min=2026-03-25T00:00:00+00:00, max=2026-03-25T00:00:00+00:00, span_days=0]
000723:   examples="2026-03-25"
000724: - end_date: coverage=1.00, types={'str': 1}, unique~=1
000725:   datetime[min=2026-03-27T00:00:00+00:00, max=2026-03-27T00:00:00+00:00, span_days=0]
000726:   examples="2026-03-27"
000727: - message: coverage=1.00, types={'str': 1}, unique~=1
000728:   examples="Need for pre-sowing field prep"
000729: - status: coverage=1.00, types={'str': 1}, unique~=1
000730:   examples="approved"
000731: - created_at: coverage=1.00, types={'str': 1}, unique~=1
000732:   datetime[min=2026-03-24T21:00:46.679447+00:00, max=2026-03-24T21:00:46.679447+00:00, span_days=0]
000733:   examples="2026-03-24T21:00:46.679447+00:00"
000734: - updated_at: coverage=1.00, types={'str': 1}, unique~=1
000735:   datetime[min=2026-03-24T21:00:46.679447+00:00, max=2026-03-24T21:00:46.679447+00:00, span_days=0]
000736:   examples="2026-03-24T21:00:46.679447+00:00"
000737: - is_seed_data: coverage=1.00, types={'bool': 1}, unique~=1
000738:   examples=true
000739: 
000740: --- farmer_profiles ---
000741: Total docs: 298
000742: Sample analyzed: 298
000743: Indexes:
000744: - _id_ | keys=SON([('_id', 1)]) | unique=False
000745: - ux_user_id | keys=SON([('user_id', 1)]) | unique=True
000746: - ix_created_at_desc | keys=SON([('created_at', -1)]) | unique=False
000747: - ix_state_district | keys=SON([('state', 1), ('district', 1)]) | unique=False
000748: Quality findings:
000749: - High sparsity: 6 fields under 20% coverage
000750: - created_at span: 8 days
000751: - updated_at span: 0 days
000752: Top 30 fields by coverage:
000753: - _id: coverage=1.00, types={'str': 298}, unique~=298
000754:   examples="profile_seed_farmer_02"; "profile_seed_farmer_03"; "profile_seed_farmer_04"
000755: - user_id: coverage=1.00, types={'str': 298}, unique~=298
000756:   examples="seed_farmer_02"; "seed_farmer_03"; "seed_farmer_04"
000757: - village: coverage=1.00, types={'str': 298}, unique~=292
000758:   examples="Andheri East"; "Hisar Kheda X"; "Visakhapatnam Kheda 1"
000759: - district: coverage=1.00, types={'str': 298}, unique~=140
000760:   examples="Visakhapatnam"; "Papum Pare"; "Jorhat"
000761: - state: coverage=1.00, types={'str': 298}, unique~=29
000762:   examples="Andhra Pradesh"; "Arunachal Pradesh"; "Assam"
000763: - pin_code: coverage=1.00, types={'str': 298}, unique~=146
000764:   examples="400069"; "125001"; "530001"
000765: - soil_type: coverage=1.00, types={'str': 298}, unique~=11
000766:   examples="black"; "red"; "loamy"
000767: - irrigation_type: coverage=1.00, types={'str': 298}, unique~=11
000768:   examples="canal"; "tube_well"; "sprinkler"
000769: - created_at: coverage=1.00, types={'str': 298}, unique~=9
000770:   datetime[min=2026-03-24T21:00:44.007359+00:00, max=2026-04-02T17:54:10.238772+00:00, span_days=8]
000771:   examples="2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"; "2026-03-24T21:00:44.533636+00:00"
000772: - updated_at: coverage=1.00, types={'str': 298}, unique~=3
000773:   datetime[min=2026-04-02T17:54:10.238772+00:00, max=2026-04-02T18:29:13.375586+00:00, span_days=0]
000774:   examples="2026-04-02T17:54:10.238772+00:00"; "2026-04-02T18:29:13.375586+00:00"; "2026-04-02T17:54:52.670704+00:00"
000775: - location_label: coverage=1.00, types={'str': 298}, unique~=298
000776:   examples="Andheri East, Visakhapatnam, Andhra Pradesh"; "Andheri East, Papum Pare, Arunachal Pradesh"; "Andheri East, Jorhat, Assam"
000777: - address_line_1: coverage=1.00, types={'str': 298}, unique~=298
000778:   examples="House 10, Visakhapatnam Kheda"; "House 10, Naharlagun Kheda"; "House 10, Jorhat Kheda"
000779: - address_line_2: coverage=1.00, types={'str': 298}, unique~=144
000780:   examples="Near Visakhapatnam APMC Yard"; "Near Naharlagun APMC Yard"; "Near Jorhat APMC Yard"
000781: - name: coverage=1.00, types={'str': 297}, unique~=207
000782:   examples="Seed Farmer 2"; "Seed Farmer 3"; "Seed Farmer 4"
000783: - phone: coverage=1.00, types={'str': 297}, unique~=297
000784:   examples="+919800000002"; "+919800000003"; "+919800000004"
000785: - farm_size: coverage=1.00, types={'float': 297}, unique~=296
000786:   numeric[min=0.80, p50=6.94, max=12.49, mean=6.80]
000787:   examples=3.3; 4.1; 4.9
000788: - farm_size_unit: coverage=1.00, types={'str': 297}, unique~=2
000789:   examples="acres"; "acre"
000790: - preferred_language: coverage=1.00, types={'str': 297}, unique~=13
000791:   examples="mr"; "en"; "ta"
000792: - is_seed_data: coverage=1.00, types={'bool': 297}, unique~=1
000793:   examples=true
000794: - saved_documents: coverage=0.98, types={'list': 291}, unique~=0
000795:   examples=[{"scheme_id": "MKKY", "scheme_name": "Mukhyamantri Kisan Kalyan Yojana (Madhya Pradesh)", "session_id": "ec5767cef83b45e69196dbc29f36ea65", "document_url": "http://127.0.0.1:80...; []
000796: - land_size_acres: coverage=0.98, types={'float': 291}, unique~=291
000797:   numeric[min=0.80, p50=6.96, max=12.49, mean=6.83]
000798:   examples=6.8; 0.8; 1.41
000799: - language: coverage=0.98, types={'str': 291}, unique~=13
000800:   examples="en"; "te"; "as"
000801: - aadhaar_number: coverage=0.97, types={'str': 290}, unique~=290
000802:   examples="311700000000"; "311800190007"; "311900380014"
000803: - alternate_mobile_number: coverage=0.97, types={'str': 290}, unique~=290
000804:   examples="9430000161"; "9440000198"; "9450000235"
000805: - bank_account_holder_name: coverage=0.97, types={'str': 290}, unique~=200
000806:   examples="Ramesh Patel"; "Suresh Sharma"; "Mahesh Singh"
000807: - bank_account_number: coverage=0.97, types={'str': 290}, unique~=290
000808:   examples="101000000000"; "101000009973"; "101000019946"
000809: - bank_ifsc: coverage=0.97, types={'str': 290}, unique~=290
000810:   examples="SBIN0100000"; "PUNB0100001"; "BARB0100002"
000811: - bank_name: coverage=0.97, types={'str': 290}, unique~=5
000812:   examples="State Bank of India"; "Punjab National Bank"; "Bank of Baroda"
000813: - block_or_tehsil: coverage=0.97, types={'str': 290}, unique~=285
000814:   examples="Visakhapatnam Tehsil 1"; "Krishna Tehsil 2"; "Guntur Tehsil 3"
000815: - category: coverage=0.97, types={'str': 290}, unique~=4
000816:   examples="General"; "OBC"; "SC"
000817: Very sparse fields (<10% coverage):
000818: - saved_documents[]
000819: - saved_documents[].scheme_id
000820: - saved_documents[].scheme_name
000821: - saved_documents[].session_id
000822: - saved_documents[].document_url
000823: - saved_documents[].generated_at
000824: 
000825: --- livestock ---
000826: Total docs: 8
000827: Sample analyzed: 8
000828: Indexes:
000829: - _id_ | keys=SON([('_id', 1)]) | unique=False
000830: - ix_farmer_updated_desc | keys=SON([('farmer_id', 1), ('updated_at', -1)]) | unique=False
000831: - ix_farmer_type | keys=SON([('farmer_id', 1), ('type', 1)]) | unique=False
000832: Quality findings:
000833: - created_at span: 0 days
000834: - updated_at span: 0 days
000835: Top 9 fields by coverage:
000836: - _id: coverage=1.00, types={'str': 8}, unique~=8
000837:   examples="livestock_seed_farmer_01"; "livestock_seed_farmer_02"; "livestock_seed_farmer_03"
000838: - farmer_id: coverage=1.00, types={'str': 8}, unique~=8
000839:   examples="seed_farmer_01"; "seed_farmer_02"; "seed_farmer_03"
000840: - type: coverage=1.00, types={'str': 8}, unique~=4
000841:   examples="cow"; "buffalo"; "goat"
000842: - breed: coverage=1.00, types={'str': 8}, unique~=4
000843:   examples="Sahiwal"; "Murrah"; "Jamunapari"
000844: - count: coverage=1.00, types={'int': 8}, unique~=4
000845:   numeric[min=3.00, p50=4.00, max=6.00, mean=4.50]
000846:   examples=3; 4; 5
000847: - health_status: coverage=1.00, types={'str': 8}, unique~=1
000848:   examples="healthy"
000849: - created_at: coverage=1.00, types={'str': 8}, unique~=8
000850:   datetime[min=2026-03-24T21:00:43.627707+00:00, max=2026-03-24T21:00:45.904026+00:00, span_days=0]
000851:   examples="2026-03-24T21:00:43.627707+00:00"; "2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"
000852: - updated_at: coverage=1.00, types={'str': 8}, unique~=8
000853:   datetime[min=2026-03-24T21:00:43.627707+00:00, max=2026-03-24T21:00:45.904026+00:00, span_days=0]
000854:   examples="2026-03-24T21:00:43.627707+00:00"; "2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"
000855: - is_seed_data: coverage=1.00, types={'bool': 8}, unique~=1
000856:   examples=true
000857: 
000858: --- market_prices ---
000859: Total docs: 30,217
000860: Sample analyzed: 3,000
000861: Indexes:
000862: - _id_ | keys=SON([('_id', 1)]) | unique=False
000863: - ix_state_district_crop_date_desc | keys=SON([('state', 1), ('district', 1), ('crop_name', 1), ('date_iso', -1)]) | unique=False
000864: - ix_crop_date_desc | keys=SON([('crop_name', 1), ('date_iso', -1)]) | unique=False
000865: - ix_state_district_commodity_date_desc | keys=SON([('state', 1), ('district', 1), ('commodity', 1), ('date_iso', -1)]) | unique=False
000866: Quality findings:
000867: - created_at span: 9 days
000868: Top 14 fields by coverage:
000869: - _id: coverage=1.00, types={'str': 3000}, unique~=3000
000870:   examples="b0e74d98b6e249eb848747bd12f54aa8"; "40515ff1d25d460fb21d60ddba543e4e"; "0d30da2468d2411fab680f810897799c"
000871: - crop_name: coverage=1.00, types={'str': 3000}, unique~=58
000872:   examples="Arecanut(Betelnut/Supari)"; "Elephant Yam (Suran)"; "Wheat"
000873: - variety: coverage=1.00, types={'str': 3000}, unique~=60
000874:   examples="New Variety"; "Other"; "Lokwan"
000875: - mandi_name: coverage=1.00, types={'str': 3000}, unique~=149
000876:   examples="Puttur"; "Kuttoor"; "Banapura"
000877: - state: coverage=1.00, types={'str': 3000}, unique~=14
000878:   examples="Karnataka"; "Kerala"; "Madhya Pradesh"
000879: - district: coverage=1.00, types={'str': 3000}, unique~=103
000880:   examples="Mangalore(Dakshin Kannad)"; "Pathanamthitta"; "Hoshangabad"
000881: - min_price: coverage=1.00, types={'float': 3000}, unique~=334
000882:   numeric[min=0.00, p50=1600.00, max=64925.00, mean=4231.95]
000883:   examples=10000.0; 1000.0; 956.0
000884: - max_price: coverage=1.00, types={'float': 3000}, unique~=388
000885:   numeric[min=0.00, p50=2000.00, max=79019.00, mean=5153.21]
000886:   examples=16500.0; 1500.0; 980.0
000887: - modal_price: coverage=1.00, types={'float': 3000}, unique~=411
000888:   numeric[min=250.00, p50=1900.00, max=70979.00, mean=4718.14]
000889:   examples=12800.0; 1200.0; 980.0
000890: - unit: coverage=1.00, types={'str': 3000}, unique~=1
000891:   examples="quintal"
000892: - date: coverage=1.00, types={'str': 3000}, unique~=1277
000893:   examples="24/02/2014"; "23/12/2009"; "14/08/2007"
000894: - source: coverage=1.00, types={'str': 3000}, unique~=1
000895:   examples="data.gov.in"
000896: - created_at: coverage=1.00, types={'str': 3000}, unique~=13
000897:   datetime[min=2026-03-25T13:16:53.956000+00:00, max=2026-04-03T20:48:09.964571+00:00, span_days=9]
000898:   examples="2026-04-01T15:01:06.676171+00:00"; "2026-04-01T15:47:05.397587+00:00"; "2026-03-25T13:20:40.997274+00:00"
000899: - date_iso: coverage=0.66, types={'str': 1984}, unique~=1079
000900:   datetime[min=2003-06-16T00:00:00+00:00, max=2017-12-31T00:00:00+00:00, span_days=5312]
000901:   examples="2007-08-14"; "2007-02-12"; "2015-05-02"
000902: 
000903: --- notification_preferences ---
000904: Total docs: 1
000905: Sample analyzed: 1
000906: Indexes:
000907: - _id_ | keys=SON([('_id', 1)]) | unique=False
000908: Quality findings:
000909: - updated_at span: 0 days
000910: Top 3 fields by coverage:
000911: - _id: coverage=1.00, types={'str': 1}, unique~=1
000912:   examples="seed_farmer_01"
000913: - updated_at: coverage=1.00, types={'str': 1}, unique~=1
000914:   datetime[min=2026-04-01T17:01:38.467157+00:00, max=2026-04-01T17:01:38.467157+00:00, span_days=0]
000915:   examples="2026-04-01T17:01:38.467157+00:00"
000916: - user_id: coverage=1.00, types={'str': 1}, unique~=1
000917:   examples="seed_farmer_01"
000918: 
000919: --- notifications ---
000920: Total docs: 32
000921: Sample analyzed: 32
000922: Indexes:
000923: - _id_ | keys=SON([('_id', 1)]) | unique=False
000924: Quality findings:
000925: - High sparsity: 3 fields under 20% coverage
000926: - created_at span: 13 days
000927: Top 17 fields by coverage:
000928: - _id: coverage=1.00, types={'str': 32}, unique~=32
000929:   examples="notif_seed_01"; "a03371753c2d4be3a98ce04eba05e04c"; "57d63cc6bb1149458bc11237818cb042"
000930: - user_id: coverage=1.00, types={'str': 32}, unique~=1
000931:   examples="seed_farmer_01"
000932: - title: coverage=1.00, types={'str': 32}, unique~=6
000933:   examples="Market Alert"; "Calendar task scheduled"; "Calendar tasks scheduled"
000934: - body: coverage=1.00, types={'str': 32}, unique~=12
000935:   examples="Wheat modal price increased in nearby mandi."; "E2E Calendar Task One on 2026-04-12 at 06:30."; "E2E Calendar Task Two. on 2026-04-12 at 17:00."
000936: - type: coverage=1.00, types={'str': 32}, unique~=2
000937:   examples="market"; "calendar"
000938: - is_read: coverage=1.00, types={'bool': 32}, unique~=2
000939:   examples=true; false
000940: - created_at: coverage=1.00, types={'str': 32}, unique~=32
000941:   datetime[min=2026-03-24T21:00:46.692638+00:00, max=2026-04-07T07:37:24.608493+00:00, span_days=13]
000942:   examples="2026-03-24T21:00:46.692638+00:00"; "2026-04-02T19:38:38.792020+00:00"; "2026-04-02T19:38:38.906305+00:00"
000943: - message: coverage=0.97, types={'str': 31}, unique~=11
000944:   examples="E2E Calendar Task One on 2026-04-12 at 06:30."; "E2E Calendar Task Two. on 2026-04-12 at 17:00."; "Scheduled 2 task(s). Reused 0 existing task(s)."
000945: - data: coverage=0.97, types={'dict': 31}, unique~=0
000946:   examples={"event_id": "f50fc03a3b104825a958ddd5f2530498", "action": "create"}; {"event_id": "bc8227f6b53a4a4cbc379fe27579a375", "action": "create"}; {"action": "batch_create", "created_count": 2, "reused_count": 0}
000947: - data.action: coverage=0.97, types={'str': 31}, unique~=5
000948:   examples="create"; "batch_create"; "update"
000949: - read: coverage=0.97, types={'bool': 31}, unique~=1
000950:   examples=false
000951: - data.event_id: coverage=0.69, types={'str': 22}, unique~=15
000952:   examples="f50fc03a3b104825a958ddd5f2530498"; "bc8227f6b53a4a4cbc379fe27579a375"; "af1536e6664a40e7bfaea3f210a6d4c4"
000953: - data.created_count: coverage=0.28, types={'int': 9}, unique~=2
000954:   numeric[min=1.00, p50=2.00, max=2.00, mean=1.67]
000955:   examples=2; 1
000956: - data.reused_count: coverage=0.28, types={'int': 9}, unique~=1
000957:   numeric[min=0.00, p50=0.00, max=0.00, mean=0.00]
000958:   examples=0
000959: - data.action_type: coverage=0.09, types={'str': 3}, unique~=2
000960:   examples="delete"; "update"
000961: - is_seed_data: coverage=0.03, types={'bool': 1}, unique~=1
000962:   examples=true
000963: - read_at: coverage=0.03, types={'str': 1}, unique~=1
000964:   datetime[min=2026-04-01T15:04:29.127676+00:00, max=2026-04-01T15:04:29.127676+00:00, span_days=0]
000965:   examples="2026-04-01T15:04:29.127676+00:00"
000966: Very sparse fields (<10% coverage):
000967: - is_seed_data
000968: - read_at
000969: - data.action_type
000970: 
000971: --- ref_cold_storage ---
000972: Total docs: 32
000973: Sample analyzed: 32
000974: Indexes:
000975: - _id_ | keys=SON([('_id', 1)]) | unique=False
000976: Top 7 fields by coverage:
000977: - _id: coverage=1.00, types={'str': 32}, unique~=32
000978:   examples="andhra_pradesh"; "arunachal_pradesh"; "assam"
000979: - _ingested_at: coverage=1.00, types={'str': 32}, unique~=1
000980:   datetime[min=2026-03-24T21:00:14.796022+00:00, max=2026-03-24T21:00:14.796022+00:00, span_days=0]
000981:   examples="2026-03-24T21:00:14.796022+00:00"
000982: - _source_resource_id: coverage=1.00, types={'str': 32}, unique~=1
000983:   examples="a75195de-8cd6-4ecf-a818-54c761dfa24a"
000984: - capacity_required_mt: coverage=1.00, types={'float': 32}, unique~=32
000985:   numeric[min=2271.00, p50=157709.00, max=35100664.00, mean=2193791.50]
000986:   examples=530925.0; 7508.0; 71996.0
000987: - resource_id: coverage=1.00, types={'str': 32}, unique~=1
000988:   examples="a75195de-8cd6-4ecf-a818-54c761dfa24a"
000989: - state: coverage=1.00, types={'str': 32}, unique~=32
000990:   examples="Andhra Pradesh"; "Arunachal Pradesh"; "Assam"
000991: - available_capacity_mt: coverage=0.97, types={'float': 31, 'null': 1}, unique~=31
000992:   numeric[min=2000.00, p50=217280.00, max=31823701.00, mean=2053142.00]
000993:   examples=1577828.0; 5000.0; 119652.0
000994: 
000995: --- ref_crop_varieties ---
000996: Total docs: 18
000997: Sample analyzed: 18
000998: Indexes:
000999: - _id_ | keys=SON([('_id', 1)]) | unique=False
001000: Top 7 fields by coverage:
001001: - _id: coverage=1.00, types={'str': 18}, unique~=18
001002:   examples="rice_kharif"; "rice_rabi"; "total_total"
001003: - _ingested_at: coverage=1.00, types={'str': 18}, unique~=1
001004:   datetime[min=2026-03-24T21:00:15.849534+00:00, max=2026-03-24T21:00:15.849534+00:00, span_days=0]
001005:   examples="2026-03-24T21:00:15.849534+00:00"
001006: - _source_resource_id: coverage=1.00, types={'str': 18}, unique~=1
001007:   examples="7b9f57f0-5f8a-4442-9759-352dacb9d71b"
001008: - crop: coverage=1.00, types={'str': 18}, unique~=12
001009:   examples="Rice"; "Total"; "Wheat"
001010: - production_target_2016_17: coverage=1.00, types={'str': 18}, unique~=17
001011:   examples="93"; "15.5"; "270.1"
001012: - resource_id: coverage=1.00, types={'str': 18}, unique~=1
001013:   examples="7b9f57f0-5f8a-4442-9759-352dacb9d71b"
001014: - season: coverage=1.00, types={'str': 18}, unique~=3
001015:   examples="Kharif"; "Rabi"; "Total"
001016: 
001017: --- ref_data_ingestion_meta ---
001018: Total docs: 26
001019: Sample analyzed: 26
001020: Indexes:
001021: - _id_ | keys=SON([('_id', 1)]) | unique=False
001022: Quality findings:
001023: - High sparsity: 13 fields under 20% coverage
001024: - timestamp span: 7 days
001025: Top 19 fields by coverage:
001026: - _id: coverage=1.00, types={'str': 26}, unique~=26
001027:   examples="seed_reference_data_ref_mandi_prices"; "seed_reference_data_ref_mandi_directory"; "seed_reference_data_ref_farmer_schemes"
001028: - status: coverage=0.96, types={'str': 25}, unique~=1
001029:   examples="success"
001030: - script: coverage=0.92, types={'str': 24}, unique~=5
001031:   examples="seed_reference_data"; "replace_schemes_from_json"; "replace_equipment_providers_from_json"
001032: - dataset: coverage=0.88, types={'str': 23}, unique~=23
001033:   examples="ref_mandi_prices"; "ref_mandi_directory"; "ref_farmer_schemes"
001034: - last_run_at: coverage=0.88, types={'str': 23}, unique~=4
001035:   datetime[min=2026-03-24T21:00:25.200470+00:00, max=2026-04-01T13:28:29.788870+00:00, span_days=7]
001036:   examples="2026-03-24T21:00:25.200470+00:00"; "2026-03-25T20:25:44.135842+00:00"; "2026-03-25T20:25:48.314031+00:00"
001037: - row_count: coverage=0.81, types={'int': 21}, unique~=19
001038:   numeric[min=0.00, p50=64.00, max=92407.00, mean=6337.33]
001039:   examples=92407; 1566; 743
001040: - input_file: coverage=0.19, types={'str': 5}, unique~=4
001041:   examples="scripts/reports/scheme.json"; "scripts/reports/equipment_rental_pan_india_2026.json"; "C:/Users/vinay/OneDrive/Desktop/google/google-agentic-ai/kisankiawaz-backend/scripts/reports/new_schemes_plus50.csv"
001042: - deleted_docs: coverage=0.12, types={'int': 3}, unique~=3
001043:   numeric[min=0.00, p50=155.00, max=1210.00, mean=455.00]
001044:   examples=155; 1210; 0
001045: - inserted_docs: coverage=0.12, types={'int': 3}, unique~=3
001046:   numeric[min=155.00, p50=1210.00, max=29040.00, mean=10135.00]
001047:   examples=155; 1210; 29040
001048: - timestamp: coverage=0.12, types={'str': 3}, unique~=3
001049:   datetime[min=2026-03-25T20:48:26.173577+00:00, max=2026-04-02T13:45:04.335896+00:00, span_days=7]
001050:   examples="2026-03-25T20:48:26.173577+00:00"; "2026-03-31T19:40:33.114342+00:00"; "2026-04-02T13:45:04.335896+00:00"
001051: - providers_count: coverage=0.08, types={'int': 2}, unique~=1
001052:   numeric[min=166.00, p50=166.00, max=166.00, mean=166.00]
001053:   examples=166
001054: - input_rows: coverage=0.08, types={'int': 2}, unique~=1
001055:   numeric[min=50.00, p50=50.00, max=50.00, mean=50.00]
001056:   examples=50
001057: - inserted: coverage=0.08, types={'int': 2}, unique~=1
001058:   numeric[min=0.00, p50=0.00, max=0.00, mean=0.00]
001059:   examples=0
001060: - invalid_rows: coverage=0.08, types={'int': 2}, unique~=1
001061:   numeric[min=0.00, p50=0.00, max=0.00, mean=0.00]
001062:   examples=0
001063: - normalized_rows: coverage=0.08, types={'int': 2}, unique~=1
001064:   numeric[min=50.00, p50=50.00, max=50.00, mean=50.00]
001065:   examples=50
001066: - reembed: coverage=0.08, types={'bool': 2}, unique~=1
001067:   examples=false
001068: - skipped_duplicate_in_db: coverage=0.08, types={'int': 2}, unique~=1
001069:   numeric[min=50.00, p50=50.00, max=50.00, mean=50.00]
001070:   examples=50
001071: - skipped_duplicate_in_file: coverage=0.08, types={'int': 2}, unique~=1
001072:   numeric[min=0.00, p50=0.00, max=0.00, mean=0.00]
001073:   examples=0
001074: - months: coverage=0.04, types={'int': 1}, unique~=1
001075:   numeric[min=24.00, p50=24.00, max=24.00, mean=24.00]
001076:   examples=24
001077: Very sparse fields (<10% coverage):
001078: - providers_count
001079: - input_rows
001080: - inserted
001081: - invalid_rows
001082: - normalized_rows
001083: - reembed
001084: - skipped_duplicate_in_db
001085: - skipped_duplicate_in_file
001086: - months
001087: 
001088: --- ref_equipment_providers ---
001089: Total docs: 1,210
001090: Sample analyzed: 1,210
001091: Indexes:
001092: - _id_ | keys=SON([('_id', 1)]) | unique=False
001093: - ix_active_state_district_category_source | keys=SON([('is_active', 1), ('state', 1), ('district', 1), ('category', 1), ('source_type', 1)]) | unique=False
001094: - ix_state_district_name | keys=SON([('state', 1), ('district', 1), ('name', 1)]) | unique=False
001095: - ix_provider_id | keys=SON([('provider_id', 1)]) | unique=False
001096: Quality findings:
001097: - High sparsity: 3 fields under 20% coverage
001098: Top 30 fields by coverage:
001099: - eligibility[]: coverage=4.00, types={'str': 4840}, unique~=4
001100:   examples="Valid mobile number"; "Farmer ID or Aadhaar"; "Advance booking token"
001101: - documents_required[]: coverage=3.00, types={'str': 3630}, unique~=3
001102:   examples="Aadhaar Card"; "Any farm proof (land record/tenant letter)"; "Mobile number"
001103: - booking_channels[]: coverage=3.00, types={'str': 3630}, unique~=3
001104:   examples="phone"; "whatsapp"; "centre_visit"
001105: - _id: coverage=1.00, types={'str': 1210}, unique~=1210
001106:   examples="prov-mahpun1--tractor-45-hp"; "prov-mahpun1--rotavator-7-feet"; "prov-mahpun1--seed-drill-9-row"
001107: - rental_id: coverage=1.00, types={'str': 1210}, unique~=1210
001108:   examples="prov-mahpun1--tractor-45-hp"; "prov-mahpun1--rotavator-7-feet"; "prov-mahpun1--seed-drill-9-row"
001109: - provider_id: coverage=1.00, types={'str': 1210}, unique~=166
001110:   examples="PROV-MAHPUN1"; "PROV-MAHNAS2"; "PROV-MAHNAG3"
001111: - provider_name: coverage=1.00, types={'str': 1210}, unique~=165
001112:   examples="Pune Agro Rental Centre"; "Nashik Agro Rental Centre"; "Nagpur Agro Rental Centre"
001113: - source_type: coverage=1.00, types={'str': 1210}, unique~=4
001114:   examples="CHC"; "State Agri Dept"; "FPO Network"
001115: - source_url: coverage=1.00, types={'str': 1210}, unique~=4
001116:   examples="https://agrimachinery.nic.in/CustomHiring"; "https://agriwelfare.gov.in/"; "https://sfacindia.com/"
001117: - source: coverage=1.00, types={'str': 1210}, unique~=1
001118:   examples="equipment_pan_india_curated_2026"
001119: - equipment_id: coverage=1.00, types={'str': 1210}, unique~=1160
001120:   examples="equip-tractor-45-hp-maharashtra-pune"; "equip-rotavator-7-feet-maharashtra-pune"; "equip-seed-drill-9-row-maharashtra-pune"
001121: - name: coverage=1.00, types={'str': 1210}, unique~=10
001122:   examples="Tractor 45 HP"; "Rotavator 7 feet"; "Seed Drill 9-row"
001123: - category: coverage=1.00, types={'str': 1210}, unique~=7
001124:   examples="land_preparation"; "sowing_planting"; "crop_protection"
001125: - state: coverage=1.00, types={'str': 1210}, unique~=29
001126:   examples="Maharashtra"; "Uttar Pradesh"; "Bihar"
001127: - district: coverage=1.00, types={'str': 1210}, unique~=115
001128:   examples="Pune"; "Nashik"; "Nagpur"
001129: - city: coverage=1.00, types={'str': 1210}, unique~=115
001130:   examples="Pune"; "Nashik"; "Nagpur"
001131: - pincode: coverage=1.00, types={'str': 1210}, unique~=116
001132:   examples="564995"; "844412"; "568760"
001133: - address: coverage=1.00, types={'str': 1210}, unique~=116
001134:   examples="Pune Mandi Road, Pune, Maharashtra"; "Nashik Mandi Road, Nashik, Maharashtra"; "Nagpur Mandi Road, Nagpur, Maharashtra"
001135: - contact_person: coverage=1.00, types={'str': 1210}, unique~=1
001136:   examples="Rental Manager"
001137: - provider_phone: coverage=1.00, types={'str': 1210}, unique~=116
001138:   examples="+918807527732"; "+918868553123"; "+918844857862"
001139: - alternate_phone: coverage=1.00, types={'str': 1210}, unique~=116
001140:   examples="+918807537833"; "+918868563224"; "+918844867963"
001141: - whatsapp: coverage=1.00, types={'str': 1210}, unique~=116
001142:   examples="+918807527732"; "+918868553123"; "+918844857862"
001143: - eligibility: coverage=1.00, types={'list': 1210}, unique~=0
001144:   examples=["Valid mobile number", "Farmer ID or Aadhaar", "Advance booking token", "Fuel charges extra where applicable"]
001145: - documents_required: coverage=1.00, types={'list': 1210}, unique~=0
001146:   examples=["Aadhaar Card", "Any farm proof (land record/tenant letter)", "Mobile number"]
001147: - security_deposit_policy: coverage=1.00, types={'str': 1210}, unique~=1
001148:   examples="Refundable deposit varies by equipment from Rs. 500 to Rs. 5000"
001149: - working_hours: coverage=1.00, types={'str': 1210}, unique~=1
001150:   examples="08:00-18:00"
001151: - booking_channels: coverage=1.00, types={'list': 1210}, unique~=0
001152:   examples=["phone", "whatsapp", "centre_visit"]
001153: - service_radius_km: coverage=1.00, types={'int': 1210}, unique~=2
001154:   numeric[min=35.00, p50=35.00, max=50.00, mean=42.50]
001155:   examples=35; 50
001156: - geo: coverage=1.00, types={'dict': 1210}, unique~=0
001157:   examples={"lat": null, "lng": null}; {}
001158: - rate_daily: coverage=1.00, types={'int': 1210}, unique~=620
001159:   numeric[min=1320.00, p50=2943.00, max=11597.00, mean=3738.96]
001160:   examples=4410; 3360; 2310
001161: Very sparse fields (<10% coverage):
001162: - geo.lat
001163: - geo.lng
001164: - rate_per_trip
001165: 
001166: --- ref_equipment_rate_history ---
001167: Total docs: 29,040
001168: Sample analyzed: 3,000
001169: Indexes:
001170: - _id_ | keys=SON([('_id', 1)]) | unique=False
001171: Quality findings:
001172: - created_at span: 0 days
001173: Top 13 fields by coverage:
001174: - _id: coverage=1.00, types={'str': 3000}, unique~=3000
001175:   examples="prov-madjab3--combine-harvester--madhya-pradesh--2024-06"; "prov-punpat3--boom-sprayer-400l--punjab--2024-12"; "prov-tamsal3--rotavator-7-feet--tamil-nadu--2025-10"
001176: - equipment_name: coverage=1.00, types={'str': 3000}, unique~=10
001177:   examples="Combine Harvester"; "Boom Sprayer 400L"; "Rotavator 7 feet"
001178: - category: coverage=1.00, types={'str': 3000}, unique~=7
001179:   examples="harvesting"; "crop_protection"; "land_preparation"
001180: - provider_id: coverage=1.00, types={'str': 3000}, unique~=160
001181:   examples="PROV-MADJAB3"; "PROV-PUNPAT3"; "PROV-TAMSAL3"
001182: - state: coverage=1.00, types={'str': 3000}, unique~=29
001183:   examples="Madhya Pradesh"; "Punjab"; "Tamil Nadu"
001184: - district: coverage=1.00, types={'str': 3000}, unique~=115
001185:   examples="Jabalpur"; "Patiala"; "Salem"
001186: - period: coverage=1.00, types={'str': 3000}, unique~=24
001187:   examples="2024-06"; "2024-12"; "2025-10"
001188: - rate_daily: coverage=1.00, types={'float': 3000}, unique~=2996
001189:   numeric[min=1202.29, p50=3278.35, max=13993.14, mean=4145.96]
001190:   examples=9736.37; 1713.78; 4075.95
001191: - rate_hourly: coverage=1.00, types={'float': 3000}, unique~=2935
001192:   numeric[min=169.60, p50=479.54, max=2294.98, mean=597.06]
001193:   examples=1265.31; 265.77; 636.48
001194: - source_note: coverage=1.00, types={'str': 3000}, unique~=1
001195:   examples="Generated monthly history from curated provider inventory v2026.03"
001196: - created_at: coverage=1.00, types={'str': 3000}, unique~=1
001197:   datetime[min=2026-04-02T13:45:04.335896+00:00, max=2026-04-02T13:45:04.335896+00:00, span_days=0]
001198:   examples="2026-04-02T13:45:04.335896+00:00"
001199: - _ingested_at: coverage=1.00, types={'str': 3000}, unique~=1
001200:   datetime[min=2026-04-02T13:45:04.335896+00:00, max=2026-04-02T13:45:04.335896+00:00, span_days=0]
001201:   examples="2026-04-02T13:45:04.335896+00:00"
001202: - rate_per_acre: coverage=0.90, types={'float': 2713, 'null': 287}, unique~=2687
001203:   numeric[min=352.53, p50=992.25, max=3239.48, mean=1128.89]
001204:   examples=2253.97; 428.45; 1146.12
001205: 
001206: --- ref_farmer_schemes ---
001207: Total docs: 155
001208: Sample analyzed: 155
001209: Indexes:
001210: - _id_ | keys=SON([('_id', 1)]) | unique=False
001211: - ix_scheme_id | keys=SON([('scheme_id', 1)]) | unique=False
001212: - ix_beneficiary_state | keys=SON([('beneficiary_state', 1)]) | unique=False
001213: - ix_categories | keys=SON([('categories', 1)]) | unique=False
001214: - ix_ministry_status | keys=SON([('ministry', 1), ('status', 1)]) | unique=False
001215: - ix_beneficiary_state_ingested_desc | keys=SON([('beneficiary_state', 1), ('_ingested_at', -1)]) | unique=False
001216: - ix_categories_ingested_desc | keys=SON([('categories', 1), ('_ingested_at', -1)]) | unique=False
001217: Quality findings:
001218: - High sparsity: 2 fields under 20% coverage
001219: Top 30 fields by coverage:
001220: - tags[]: coverage=6.39, types={'str': 991}, unique~=589
001221:   examples="income support"; "DBT"; "direct benefit transfer"
001222: - where_to_apply[]: coverage=3.00, types={'str': 465}, unique~=135
001223:   examples="Official portal: https://pmkisan.gov.in"; "Nearest CSC"; "District Agriculture Department Office"
001224: - required_documents[]: coverage=2.99, types={'str': 463, 'null': 50}, unique~=246
001225:   examples="Aadhaar Card (mandatory)"; "Land ownership document / Khasra-Khatauni / 7/12 extract"; "Bank account passbook with IFSC code"
001226: - eligibility[]: coverage=2.77, types={'str': 429, 'null': 50}, unique~=410
001227:   examples="Must be a landholding farmer family (husband, wife and minor children)"; "Must own cultivable agricultural land"; "Must be an Indian citizen"
001228: - application_process[]: coverage=2.48, types={'str': 385, 'null': 50}, unique~=385
001229:   examples="Step 1: Visit the official PM-KISAN portal Go to the homepage of pmkisan.gov.in (https://pmkisan.gov.in)"; "Step 2: Click on 'New Farmer Registration' under Farmers Corner Choose 'Rural Farmer Registration' or 'Urban Farmer Registration' (https://pmkisan.gov.in/RegistrationFormupdate...; "Step 3: Enter Aadhaar number, select state and captcha System checks if farmer is already registered"
001230: - conditions[]: coverage=2.48, types={'str': 385, 'null': 50}, unique~=381
001231:   examples="Institutional landholders not eligible"; "Farmer families holding constitutional posts excluded"; "Serving/retired officers of Central/State Government excluded (except Group D employees)"
001232: - benefits[]: coverage=2.08, types={'str': 323, 'null': 50}, unique~=308
001233:   examples="Rs. 6"; "000 per year (Rs. 2"; "000 per instalment every 4 months) directly deposited into Aadhaar-linked bank accounts via DBT. Reduces dependency on moneylenders."
001234: - categories[]: coverage=1.34, types={'str': 208}, unique~=83
001235:   examples="Income Support"; "Pension"; "Crop Insurance"
001236: - official_links[]: coverage=1.19, types={'str': 184}, unique~=155
001237:   examples="https://pmkisan.gov.in"; "https://pmkisan.gov.in/RegistrationFormupdated.aspx"; "https://maandhan.in"
001238: - _id: coverage=1.00, types={'str': 155}, unique~=155
001239:   examples="scheme_central-pm-kisan"; "scheme_central-pm-kmy"; "scheme_central-pmfby"
001240: - source: coverage=1.00, types={'str': 155}, unique~=1
001241:   examples="scheme_json_user_upload"
001242: - scheme_id: coverage=1.00, types={'str': 155}, unique~=155
001243:   examples="central-pm-kisan"; "central-pm-kmy"; "central-pmfby"
001244: - title: coverage=1.00, types={'str': 155}, unique~=154
001245:   examples="Pradhan Mantri Kisan Samman Nidhi"; "Pradhan Mantri Kisan Maandhan Yojana"; "Pradhan Mantri Fasal Bima Yojana"
001246: - summary: coverage=1.00, types={'str': 155}, unique~=155
001247:   examples="PM-KISAN is a 100% centrally funded scheme that provides income support of Rs. 6,000 per year to all landholding farmer families across India. The amount is disbursed in three ...; "PM-KMY is a voluntary and contributory pension scheme launched on September 12, 2019, providing old-age social security to small and marginal farmers. Life Insurance Corporatio...; "PMFBY provides comprehensive crop insurance from pre-sowing to post-harvest stages against natural calamities, pests and diseases. Launched in Kharif 2016, it replaced the Nati...
001248: - categories: coverage=1.00, types={'list': 155}, unique~=0
001249:   examples=["Income Support"]; ["Pension"]; ["Crop Insurance"]
001250: - beneficiary_state: coverage=1.00, types={'list': 155}, unique~=0
001251:   examples=["All"]; ["Maharashtra"]; ["Telangana"]
001252: - tags: coverage=1.00, types={'list': 155}, unique~=0
001253:   examples=["income support", "DBT", "direct benefit transfer", "small farmer", "marginal farmer", "PM-KISAN", "cash transfer"]; ["pension", "social security", "old age", "small farmer", "voluntary", "LIC"]; ["crop insurance", "natural calamity", "kharif", "rabi", "horticulture", "pest", "disease", "DBT"]
001254: - official_links: coverage=1.00, types={'list': 155}, unique~=0
001255:   examples=["https://pmkisan.gov.in", "https://pmkisan.gov.in/RegistrationFormupdated.aspx"]; ["https://maandhan.in", "https://maandhan.in/pmkmy"]; ["https://pmfby.gov.in", "https://pmfby.gov.in/farmerRegistrationForm"]
001256: - document_links: coverage=1.00, types={'list': 155}, unique~=0
001257:   examples=[]
001258: - contact_numbers: coverage=1.00, types={'list': 155}, unique~=0
001259:   examples=["155261 / 011-24300606", "1800-180-1551"]; ["1800-267-6888"]; ["14447", "1800-200-7710"]
001260: - contact_emails: coverage=1.00, types={'list': 155}, unique~=0
001261:   examples=["pmkisan-ict@gov.in"]; ["pmkmy-agri@gov.in"]; ["help.agri@gov.in"]
001262: - application_process: coverage=1.00, types={'list': 155}, unique~=0
001263:   examples=["Step 1: Visit the official PM-KISAN portal Go to the homepage of pmkisan.gov.in (https://pmkisan.gov.in)", "Step 2: Click on 'New Farmer Registration' under Farmers Corner Cho...; ["Step 1: Visit PM-KMY portal or nearest CSC Access the scheme via the official portal (https://maandhan.in)", "Step 2: Select 'Pradhan Mantri Kisan Maandhan Yojana' option Clic...; ["Step 1: Visit PMFBY portal Access official crop insurance portal (https://pmfby.gov.in)", "Step 2: Click on 'Farmer Application' > 'Guest Farmer' For new registration (https:/...
001264: - eligibility: coverage=1.00, types={'list': 155}, unique~=0
001265:   examples=["Must be a landholding farmer family (husband, wife and minor children)", "Must own cultivable agricultural land", "Must be an Indian citizen", "Bank account must be linked wit...; ["Small and Marginal Farmers (land holding upto 2 hectares)", "Age between 18 to 40 years at entry", "Must not be covered under NPS, ESIC, EPFO", "Must not be an income tax paye...; ["All farmers (loanee and non-loanee) growing notified crops in notified areas", "Loanee farmers: mandatory enrollment if crop loan availed for notified crops", "Non-loanee farm...
001266: - conditions: coverage=1.00, types={'list': 155}, unique~=0
001267:   examples=["Institutional landholders not eligible", "Farmer families holding constitutional posts excluded", "Serving/retired officers of Central/State Government excluded (except Group ...; ["Voluntary exit allowed after 10 years of contribution with interest", "Contribution amount depends on age of entry (younger = lower contribution)", "On exit before 60, corpus ...; ["Must be enrolled before cut-off date (10 days from Kharif sowing / 31 days for Rabi)", "Crop must be notified for the specific district/block", "Post-harvest losses covered fo...
001268: - required_documents: coverage=1.00, types={'list': 155}, unique~=0
001269:   examples=["Aadhaar Card (mandatory)", "Land ownership document / Khasra-Khatauni / 7/12 extract", "Bank account passbook with IFSC code", "Mobile number linked to Aadhaar", "Passport-siz...; ["Aadhaar Card", "Bank account passbook / IFSC code", "Land ownership documents (Khasra/Khatauni)", "Mobile number", "Self-declaration regarding land holding"]; ["Aadhaar Card", "Land records (7/12 extract or Khasra/Khatauni)", "Bank account passbook", "Sowing certificate from Patwari/VLW", "Loan documents (for loanee farmers)", "Tenant...
001270: - benefits: coverage=1.00, types={'list': 155}, unique~=0
001271:   examples=["Rs. 6", "000 per year (Rs. 2", "000 per instalment every 4 months) directly deposited into Aadhaar-linked bank accounts via DBT. Reduces dependency on moneylenders."]; ["Rs. 3", "000 per month pension after age 60. Central Government matches farmer's contribution on 50:50 basis. Spouse (widow/widower) gets Rs. 1", "500 per month on farmer's de...; ["Full sum insured coverage for crop loss. Very low farmer premium (2% Kharif", "1.5% Rabi", "5% horticulture). Balance premium paid by Government. Coverage for prevented sowing...
001272: - where_to_apply: coverage=1.00, types={'list': 155}, unique~=0
001273:   examples=["Official portal: https://pmkisan.gov.in", "Nearest CSC", "District Agriculture Department Office"]; ["Official portal: https://maandhan.in", "Nearest CSC", "District Agriculture Department Office"]; ["Official portal: https://pmfby.gov.in", "Nearest CSC", "District Agriculture Department Office"]
001274: - _ingested_at: coverage=1.00, types={'str': 155}, unique~=1
001275:   datetime[min=2026-03-25T20:48:26.173577+00:00, max=2026-03-25T20:48:26.173577+00:00, span_days=0]
001276:   examples="2026-03-25T20:48:26.173577+00:00"
001277: - contact_numbers[]: coverage=0.70, types={'str': 109, 'null': 50}, unique~=74
001278:   examples="155261 / 011-24300606"; "1800-180-1551"; "1800-267-6888"
001279: - objective: coverage=0.68, types={'str': 155}, unique~=106
001280:   examples="To supplement the financial needs of farmers in procuring agricultural inputs and meeting domestic needs, ensuring proper crop health and appropriate yield."; "To provide social security in the form of minimum pension of Rs. 3,000 per month to small and marginal farmers at the age of 60 years."; "To provide financial support to farmers suffering crop loss/damage due to unforeseen events (natural calamities, pests and diseases), stabilize farmer income and encourage mode...
001281: Very sparse fields (<10% coverage):
001282: - document_links[]
001283: - is_active
001284: 
001285: --- ref_fasal_data ---
001286: Total docs: 21
001287: Sample analyzed: 21
001288: Indexes:
001289: - _id_ | keys=SON([('_id', 1)]) | unique=False
001290: Top 10 fields by coverage:
001291: - _id: coverage=1.00, types={'str': 21}, unique~=21
001292:   examples="paddy_k_k_s"; "paddy_s_t_p"; "banana"
001293: - _ingested_at: coverage=1.00, types={'str': 21}, unique~=1
001294:   datetime[min=2026-03-24T21:00:20.867750+00:00, max=2026-03-24T21:00:20.867750+00:00, span_days=0]
001295:   examples="2026-03-24T21:00:20.867750+00:00"
001296: - _source_resource_id: coverage=1.00, types={'str': 21}, unique~=1
001297:   examples="14f6f0d0-311d-4b71-acfe-ac08bbecfd1c"
001298: - crop: coverage=1.00, types={'str': 21}, unique~=21
001299:   examples="Paddy K/K/S"; "Paddy S/T/P"; "Banana"
001300: - crop_cutting_experiments_firkas: coverage=1.00, types={'str': 21}, unique~=8
001301:   examples="NA"; "1560"; "60"
001302: - crop_cutting_experiments_villages: coverage=1.00, types={'str': 21}, unique~=14
001303:   examples="21872"; "47116"; "4316"
001304: - notified_firkas: coverage=1.00, types={'str': 21}, unique~=8
001305:   examples="NA"; "156"; "6"
001306: - notified_villages: coverage=1.00, types={'str': 21}, unique~=14
001307:   examples="5468"; "11779"; "1079"
001308: - resource_id: coverage=1.00, types={'str': 21}, unique~=1
001309:   examples="14f6f0d0-311d-4b71-acfe-ac08bbecfd1c"
001310: - sl_no: coverage=1.00, types={'str': 21}, unique~=21
001311:   examples="1"; "2"; "3"
001312: 
001313: --- ref_fertilizer_data ---
001314: Total docs: 200
001315: Sample analyzed: 200
001316: Indexes:
001317: - _id_ | keys=SON([('_id', 1)]) | unique=False
001318: Top 15 fields by coverage:
001319: - _id: coverage=1.00, types={'str': 200}, unique~=200
001320:   examples="fertilizer_0"; "fertilizer_1"; "fertilizer_2"
001321: - _ingested_at: coverage=1.00, types={'str': 200}, unique~=1
001322:   datetime[min=2026-03-24T21:00:16.434309+00:00, max=2026-03-24T21:00:16.434309+00:00, span_days=0]
001323:   examples="2026-03-24T21:00:16.434309+00:00"
001324: - _resource_id: coverage=1.00, types={'str': 200}, unique~=1
001325:   examples="5c2f62fe-5afa-4119-a499-fec9d604d5bd"
001326: - _source_resource_id: coverage=1.00, types={'str': 200}, unique~=1
001327:   examples="5c2f62fe-5afa-4119-a499-fec9d604d5bd"
001328: - circlename: coverage=1.00, types={'str': 200}, unique~=1
001329:   examples="Telangana Circle"
001330: - delivery: coverage=1.00, types={'str': 200}, unique~=2
001331:   examples="Delivery"; "Non Delivery"
001332: - district: coverage=1.00, types={'str': 200}, unique~=21
001333:   examples="KUMURAM BHEEM ASIFABAD"; "MANCHERIAL"; "HANUMAKONDA"
001334: - divisionname: coverage=1.00, types={'str': 200}, unique~=8
001335:   examples="Adilabad Division"; "Hanamkonda Division"; "Karimnagar Division"
001336: - officename: coverage=1.00, types={'str': 200}, unique~=194
001337:   examples="Kothimir B.O"; "Papanpet B.O"; "Kukuda B.O"
001338: - officetype: coverage=1.00, types={'str': 200}, unique~=1
001339:   examples="BO"
001340: - pincode: coverage=1.00, types={'str': 200}, unique~=98
001341:   examples="504273"; "504299"; "504296"
001342: - regionname: coverage=1.00, types={'str': 200}, unique~=2
001343:   examples="Hyderabad Region"; "Hyderabad City Region"
001344: - statename: coverage=1.00, types={'str': 200}, unique~=1
001345:   examples="TELANGANA"
001346: - latitude: coverage=0.99, types={'float': 198, 'null': 2}, unique~=196
001347:   numeric[min=14.36, p50=18.18, max=79.00, mean=18.38]
001348:   examples=19.3638689; 19.4764899; 19.3285752
001349: - longitude: coverage=0.99, types={'float': 198, 'null': 2}, unique~=196
001350:   numeric[min=17.00, p50=78.97, max=80.52, mean=78.33]
001351:   examples=79.5376658; 79.583923; 79.4760132
001352: 
001353: --- ref_mandi_directory ---
001354: Total docs: 976
001355: Sample analyzed: 976
001356: Indexes:
001357: - _id_ | keys=SON([('_id', 1)]) | unique=False
001358: Quality findings:
001359: - High sparsity: 1 fields under 20% coverage
001360: Top 9 fields by coverage:
001361: - _id: coverage=1.00, types={'str': 976}, unique~=976
001362:   examples="west_bengal_coochbehar_pundibari"; "west_bengal_coochbehar_toofanganj"; "west_bengal_hooghly_sheoraphuly"
001363: - _ingested_at: coverage=1.00, types={'str': 976}, unique~=1
001364:   datetime[min=2026-03-25T21:16:07.072428+00:00, max=2026-03-25T21:16:07.072428+00:00, span_days=0]
001365:   examples="2026-03-25T21:16:07.072428+00:00"
001366: - district: coverage=1.00, types={'str': 976}, unique~=356
001367:   examples="Coochbehar"; "Hooghly"; "Bulandshahar"
001368: - name: coverage=1.00, types={'str': 976}, unique~=967
001369:   examples="Pundibari"; "Toofanganj"; "Sheoraphuly"
001370: - source: coverage=1.00, types={'str': 976}, unique~=3
001371:   examples="data.gov.in_daily_prices"; "derived_data_gov"; "derived_from_market_records"
001372: - state: coverage=1.00, types={'str': 976}, unique~=28
001373:   examples="West Bengal"; "Uttar Pradesh"; "Gujarat"
001374: - latitude: coverage=0.40, types={'null': 587, 'float': 389}, unique~=168
001375:   numeric[min=-17.57, p50=25.29, max=45.15, mean=22.70]
001376:   examples=22.57688; 26.51667; 25.00447
001377: - longitude: coverage=0.40, types={'null': 587, 'float': 389}, unique~=168
001378:   numeric[min=-8.28, p50=76.97, max=94.26, mean=75.33]
001379:   examples=88.31857; 88.73333; 88.14573
001380: - geocode_quality: coverage=0.17, types={'str': 976}, unique~=7
001381:   examples=""; "PPL"; "PPLA2"
001382: 
001383: --- ref_mandi_prices ---
001384: Total docs: 75,391
001385: Sample analyzed: 3,000
001386: Indexes:
001387: - _id_ | keys=SON([('_id', 1)]) | unique=False
001388: - ix_state_district_commodity_arrival_desc | keys=SON([('state', 1), ('district', 1), ('commodity', 1), ('arrival_date_iso', -1)]) | unique=False
001389: - ix_commodity_arrival_desc | keys=SON([('commodity', 1), ('arrival_date_iso', -1)]) | unique=False
001390: Top 16 fields by coverage:
001391: - _id: coverage=1.00, types={'str': 3000}, unique~=3000
001392:   examples="tamil_nadu_erode_sathiyamagalam_uzhavar_sandhai_apmc_cauliflower_20_03_2026"; "maharashtra_kolhapur_kolhapur_laxmipuri_green_gram_dal_moong_dal_12_01_2010"; "punjab_ferozpur_zira_paddy_dhan_common_08_11_2010"
001393: - _ingested_at: coverage=1.00, types={'str': 3000}, unique~=1
001394:   datetime[min=2026-03-24T20:19:48.396062+00:00, max=2026-03-24T20:19:48.396062+00:00, span_days=0]
001395:   examples="2026-03-24T20:19:48.396062+00:00"
001396: - arrival_date: coverage=1.00, types={'str': 3000}, unique~=679
001397:   examples="20/03/2026"; "12/01/2010"; "08/11/2010"
001398: - commodity: coverage=1.00, types={'str': 3000}, unique~=119
001399:   examples="Cauliflower"; "Green Gram Dal (Moong Dal)"; "Paddy(Dhan)(Common)"
001400: - district: coverage=1.00, types={'str': 3000}, unique~=408
001401:   examples="Erode"; "Kolhapur"; "Ferozpur"
001402: - market: coverage=1.00, types={'str': 3000}, unique~=1106
001403:   examples="Sathiyamagalam(Uzhavar Sandhai ) APMC"; "Kolhapur(Laxmipuri)"; "Zira"
001404: - max_price: coverage=1.00, types={'int': 3000}, unique~=619
001405:   numeric[min=0.00, p50=1101.00, max=55000.00, mean=1962.86]
001406:   examples=3000; 8400; 1030
001407: - min_price: coverage=1.00, types={'int': 3000}, unique~=496
001408:   numeric[min=0.00, p50=1000.00, max=52000.00, mean=1675.62]
001409:   examples=2500; 8000; 1030
001410: - modal_price: coverage=1.00, types={'int': 3000}, unique~=656
001411:   numeric[min=6.00, p50=1080.00, max=53000.00, mean=1946.40]
001412:   examples=2750; 8200; 1030
001413: - resource_id: coverage=1.00, types={'str': 3000}, unique~=2
001414:   examples="9ef84268-d588-465a-a308-a864a43d0070"; "35985678-0d79-46b4-9ed6-6f13308a1d24"
001415: - state: coverage=1.00, types={'str': 3000}, unique~=29
001416:   examples="Tamil Nadu"; "Maharashtra"; "Punjab"
001417: - variety: coverage=1.00, types={'str': 3000}, unique~=179
001418:   examples="Ranchi"; "Green Gram Dal"; "Other"
001419: - arrival_date_iso: coverage=1.00, types={'str': 3000}, unique~=679
001420:   datetime[min=2002-09-13T00:00:00+00:00, max=2026-03-20T00:00:00+00:00, span_days=8589]
001421:   examples="2026-03-20"; "2010-01-12"; "2010-11-08"
001422: - grade: coverage=0.86, types={'str': 2575}, unique~=11
001423:   examples="Local"; "FAQ"; "Medium"
001424: - commodity_code: coverage=0.77, types={'str': 2575}, unique~=40
001425:   examples=""; "265"; "2"
001426: - _source_resource_id: coverage=0.48, types={'str': 3000}, unique~=3
001427:   examples="9ef84268-d588-465a-a308-a864a43d0070"; ""; "35985678-0d79-46b4-9ed6-6f13308a1d24"
001428: 
001429: --- ref_msp_prices ---
001430: Total docs: 10
001431: Sample analyzed: 10
001432: Indexes:
001433: - _id_ | keys=SON([('_id', 1)]) | unique=False
001434: Top 6 fields by coverage:
001435: - _id: coverage=1.00, types={'str': 10}, unique~=10
001436:   examples="groundnut"; "castor"; "sesame"
001437: - _ingested_at: coverage=1.00, types={'str': 10}, unique~=1
001438:   datetime[min=2026-03-24T21:00:16.276456+00:00, max=2026-03-24T21:00:16.276456+00:00, span_days=0]
001439:   examples="2026-03-24T21:00:16.276456+00:00"
001440: - _source_resource_id: coverage=1.00, types={'str': 10}, unique~=1
001441:   examples="5e6056c8-b644-40a8-a346-3da6b3d8e67e"
001442: - crop: coverage=1.00, types={'str': 10}, unique~=10
001443:   examples="Groundnut"; "Castor"; "Sesame"
001444: - oilseeds_production_lakh_tonnes: coverage=1.00, types={'float': 10}, unique~=10
001445:   numeric[min=0.39, p50=7.92, max=365.65, mean=73.13]
001446:   examples=101.19; 17.74; 7.92
001447: - resource_id: coverage=1.00, types={'str': 10}, unique~=1
001448:   examples="5e6056c8-b644-40a8-a346-3da6b3d8e67e"
001449: 
001450: --- ref_pesticide_advisory ---
001451: Total docs: 14
001452: Sample analyzed: 14
001453: Indexes:
001454: - _id_ | keys=SON([('_id', 1)]) | unique=False
001455: Top 6 fields by coverage:
001456: - _id: coverage=1.00, types={'str': 14}, unique~=14
001457:   examples="rice"; "bajra"; "maize"
001458: - _ingested_at: coverage=1.00, types={'str': 14}, unique~=1
001459:   datetime[min=2026-03-24T21:00:20.252527+00:00, max=2026-03-24T21:00:20.252527+00:00, span_days=0]
001460:   examples="2026-03-24T21:00:20.252527+00:00"
001461: - _source_resource_id: coverage=1.00, types={'str': 14}, unique~=1
001462:   examples="98a33686-715f-4076-97da-fa3dcf6bc61b"
001463: - crop: coverage=1.00, types={'str': 14}, unique~=14
001464:   examples="Rice"; "Bajra"; "Maize"
001465: - production_million_tonnes: coverage=1.00, types={'float': 14}, unique~=13
001466:   numeric[min=1.75, p50=10.09, max=465.05, mean=61.27]
001467:   examples=104.99; 9.75; 23.1
001468: - resource_id: coverage=1.00, types={'str': 14}, unique~=1
001469:   examples="98a33686-715f-4076-97da-fa3dcf6bc61b"
001470: 
001471: --- ref_pin_master ---
001472: Total docs: 2,726
001473: Sample analyzed: 2,726
001474: Indexes:
001475: - _id_ | keys=SON([('_id', 1)]) | unique=False
001476: Top 12 fields by coverage:
001477: - _id: coverage=1.00, types={'str': 2726}, unique~=2726
001478:   examples="847409_219990"; "488446_937938"; "483119_916287"
001479: - _ingested_at: coverage=1.00, types={'str': 2726}, unique~=1
001480:   datetime[min=2026-03-25T21:16:38.251018+00:00, max=2026-03-25T21:16:38.251018+00:00, span_days=0]
001481:   examples="2026-03-25T21:16:38.251018+00:00"
001482: - _source_resource_id: coverage=1.00, types={'str': 2726}, unique~=1
001483:   examples="f17a1608-5f10-4610-bb50-a63c80d83974"
001484: - district_code: coverage=1.00, types={'str': 2726}, unique~=104
001485:   examples="206"; "420"; "411"
001486: - district_name: coverage=1.00, types={'str': 2726}, unique~=104
001487:   examples="Madhubani"; "Panna"; "Jabalpur"
001488: - pincode: coverage=1.00, types={'str': 2726}, unique~=615
001489:   examples="847409"; "488446"; "483119"
001490: - state_code: coverage=1.00, types={'str': 2726}, unique~=18
001491:   examples="10"; "23"; "8"
001492: - state_name: coverage=1.00, types={'str': 2726}, unique~=18
001493:   examples="Bihar"; "Madhya Pradesh"; "Rajasthan"
001494: - subdistrict_code: coverage=1.00, types={'str': 2726}, unique~=370
001495:   examples="1085"; "3440"; "3629"
001496: - subdistrict_name: coverage=1.00, types={'str': 2726}, unique~=368
001497:   examples="Laukaha"; "Pawai"; "Patan"
001498: - village_code: coverage=1.00, types={'str': 2726}, unique~=2726
001499:   examples="219990"; "937938"; "916287"
001500: - village_name: coverage=1.00, types={'str': 2726}, unique~=2700
001501:   examples="Bagha Kusmar"; "Maheda"; "Karhaiyakhurd"
001502: 
001503: --- ref_pmfby_data ---
001504: Total docs: 6
001505: Sample analyzed: 6
001506: Indexes:
001507: - _id_ | keys=SON([('_id', 1)]) | unique=False
001508: Top 10 fields by coverage:
001509: - _id: coverage=1.00, types={'str': 6}, unique~=6
001510:   examples="pmfby_2016_17"; "pmfby_2017_18"; "pmfby_2018_19"
001511: - _ingested_at: coverage=1.00, types={'str': 6}, unique~=1
001512:   datetime[min=2026-03-24T21:00:16.185383+00:00, max=2026-03-24T21:00:16.185383+00:00, span_days=0]
001513:   examples="2026-03-24T21:00:16.185383+00:00"
001514: - _source_resource_id: coverage=1.00, types={'str': 6}, unique~=1
001515:   examples="a330e681-6562-4552-a94b-58f1df7eccf3"
001516: - claims_paid_crores: coverage=1.00, types={'float': 6}, unique~=6
001517:   numeric[min=14716.90, p50=20423.90, max=28651.80, mean=21669.20]
001518:   examples=16795.5; 22065.5; 28651.8
001519: - farmer_premium_crores: coverage=1.00, types={'float': 6}, unique~=6
001520:   numeric[min=3772.10, p50=4085.10, max=4695.70, mean=4208.63]
001521:   examples=4085.1; 4172.0; 4695.7
001522: - goi_premium_crores: coverage=1.00, types={'float': 6}, unique~=6
001523:   numeric[min=8648.70, p50=12316.70, max=13525.90, mean=11690.55]
001524:   examples=8648.7; 10055.9; 12316.7
001525: - resource_id: coverage=1.00, types={'str': 6}, unique~=1
001526:   examples="a330e681-6562-4552-a94b-58f1df7eccf3"
001527: - state_premium_crores: coverage=1.00, types={'float': 6}, unique~=6
001528:   numeric[min=8944.60, p50=12676.60, max=14620.50, mean=12455.42]
001529:   examples=8944.6; 10239.8; 12676.6
001530: - total_farmer_applications_lakhs: coverage=1.00, types={'float': 6}, unique~=6
001531:   numeric[min=531.80, p50=582.00, max=832.80, mean=627.95]
001532:   examples=581.7; 531.8; 582.0
001533: - year: coverage=1.00, types={'str': 6}, unique~=6
001534:   examples="2016-17"; "2017-18"; "2018-19"
001535: 
001536: --- ref_reservoir_data ---
001537: Total docs: 23
001538: Sample analyzed: 23
001539: Indexes:
001540: - _id_ | keys=SON([('_id', 1)]) | unique=False
001541: Quality findings:
001542: - High sparsity: 1 fields under 20% coverage
001543: Top 8 fields by coverage:
001544: - _id: coverage=1.00, types={'str': 23}, unique~=23
001545:   examples="andhra_pradesh_and_telengana_srisailam"; "andhra_pradesh_donkarayi"; "telengana_priyadarshini_jurala"
001546: - _ingested_at: coverage=1.00, types={'str': 23}, unique~=1
001547:   datetime[min=2026-04-01T13:00:59.269846+00:00, max=2026-04-01T13:00:59.269846+00:00, span_days=0]
001548:   examples="2026-04-01T13:00:59.269846+00:00"
001549: - _source_resource_id: coverage=1.00, types={'str': 23}, unique~=1
001550:   examples="247146af-5216-47ff-80f6-ddea261f1139"
001551: - current_storage_pct_of_normal: coverage=1.00, types={'float': 23}, unique~=18
001552:   numeric[min=0.00, p50=66.00, max=80.00, mean=58.57]
001553:   examples=76.0; 80.0; 56.0
001554: - project_name: coverage=1.00, types={'str': 23}, unique~=23
001555:   examples="Srisailam"; "Donkarayi"; "Priyadarshini Jurala"
001556: - resource_id: coverage=1.00, types={'str': 23}, unique~=1
001557:   examples="247146af-5216-47ff-80f6-ddea261f1139"
001558: - state: coverage=1.00, types={'str': 23}, unique~=14
001559:   examples="Andhra Pradesh and Telangana"; "Andhra Pradesh"; "Telangana"
001560: - projects_deficiency_pct: coverage=0.00, types={'null': 23}, unique~=0
001561: Very sparse fields (<10% coverage):
001562: - projects_deficiency_pct
001563: 
001564: --- ref_soil_health ---
001565: Total docs: 4,454
001566: Sample analyzed: 3,000
001567: Indexes:
001568: - _id_ | keys=SON([('_id', 1)]) | unique=False
001569: - ix_state_district_date_desc | keys=SON([('state', 1), ('district', 1), ('date_iso', -1)]) | unique=False
001570: - ix_state_district_block_date_desc | keys=SON([('state', 1), ('district', 1), ('block', 1), ('date_iso', -1)]) | unique=False
001571: Quality findings:
001572: - High sparsity: 1 fields under 20% coverage
001573: Top 12 fields by coverage:
001574: - _id: coverage=1.00, types={'str': 3000}, unique~=3000
001575:   examples="bihar_saran_2019_11"; "assam_tinsukia_2018_08"; "uttar_pradesh_gonda_2020_02"
001576: - _ingested_at: coverage=1.00, types={'str': 3000}, unique~=1
001577:   datetime[min=2026-03-24T20:51:29.493084+00:00, max=2026-03-24T20:51:29.493084+00:00, span_days=0]
001578:   examples="2026-03-24T20:51:29.493084+00:00"
001579: - agency_name: coverage=1.00, types={'str': 3000}, unique~=1
001580:   examples="NRSC VIC MODEL"
001581: - avg_smlvl_at15cm: coverage=1.00, types={'float': 3000}, unique~=2998
001582:   numeric[min=0.00, p50=20.62, max=38.51, mean=20.70]
001583:   examples=10.5752567; 32.6260353; 19.0116973
001584: - date: coverage=1.00, types={'str': 3000}, unique~=290
001585:   datetime[min=2018-07-24T00:00:00+00:00, max=2020-12-31T00:00:00+00:00, span_days=891]
001586:   examples="2019-11-16"; "2018-08-29"; "2020-02-28"
001587: - district: coverage=1.00, types={'str': 3000}, unique~=729
001588:   examples="Saran"; "Tinsukia"; "Gonda"
001589: - month: coverage=1.00, types={'int': 3000}, unique~=10
001590:   numeric[min=1.00, p50=9.00, max=12.00, mean=8.90]
001591:   examples=11; 8; 2
001592: - resource_id: coverage=1.00, types={'str': 3000}, unique~=1
001593:   examples="4554a3c8-74e3-4f93-8727-8fd92161e345"
001594: - state: coverage=1.00, types={'str': 3000}, unique~=36
001595:   examples="Bihar"; "Assam"; "Uttar Pradesh"
001596: - year: coverage=1.00, types={'int': 3000}, unique~=3
001597:   numeric[min=2018.00, p50=2019.00, max=2020.00, mean=2018.73]
001598:   examples=2019; 2018; 2020
001599: - date_iso: coverage=1.00, types={'str': 3000}, unique~=290
001600:   datetime[min=2018-07-24T00:00:00+00:00, max=2020-12-31T00:00:00+00:00, span_days=891]
001601:   examples="2019-11-16"; "2018-08-29"; "2020-02-28"
001602: - _source_resource_id: coverage=0.01, types={'str': 3000}, unique~=2
001603:   examples=""; "4554a3c8-74e3-4f93-8727-8fd92161e345"
001604: Very sparse fields (<10% coverage):
001605: - _source_resource_id
001606: 
001607: --- users ---
001608: Total docs: 303
001609: Sample analyzed: 303
001610: Indexes:
001611: - _id_ | keys=SON([('_id', 1)]) | unique=False
001612: Quality findings:
001613: - High sparsity: 1 fields under 20% coverage
001614: - created_at span: 8 days
001615: - updated_at span: 1 days
001616: Top 14 fields by coverage:
001617: - _id: coverage=1.00, types={'str': 303}, unique~=303
001618:   examples="seed_farmer_01"; "seed_farmer_02"; "seed_farmer_03"
001619: - phone: coverage=1.00, types={'str': 303}, unique~=303
001620:   examples="+919800000001"; "+919800000002"; "+919800000003"
001621: - password_hash: coverage=1.00, types={'str': 303}, unique~=14
001622:   examples="$2b$12$ghiEe7Rg8AAdnRIHTGx4Lefcf8G0DkSt.j5cKSbgXmrH1psCgwpim"; "$2b$12$hK0zJkJWyGJYuwz1Mpf.N.cRXg8q/.XNk93XuCT0xoN8Xqezp2f0y"; "$2b$12$2SPyIgY0rYVp0VDhkwevQe3Wn3HkoqS.J7vlpmIw0.6Ae5oAnjmEa"
001623: - name: coverage=1.00, types={'str': 303}, unique~=209
001624:   examples="Seed Farmer 1"; "Seed Farmer 2"; "Seed Farmer 3"
001625: - role: coverage=1.00, types={'str': 303}, unique~=1
001626:   examples="farmer"
001627: - language: coverage=1.00, types={'str': 303}, unique~=13
001628:   examples="en"; "mr"; "ta"
001629: - is_active: coverage=1.00, types={'bool': 303}, unique~=1
001630:   examples=true
001631: - created_at: coverage=1.00, types={'str': 303}, unique~=14
001632:   datetime[min=2026-03-24T21:00:43.627707+00:00, max=2026-04-02T17:54:10.238772+00:00, span_days=8]
001633:   examples="2026-03-24T21:00:43.627707+00:00"; "2026-03-24T21:00:44.007359+00:00"; "2026-03-24T21:00:44.283882+00:00"
001634: - updated_at: coverage=1.00, types={'str': 303}, unique~=6
001635:   datetime[min=2026-04-01T15:07:52.300966+00:00, max=2026-04-02T17:54:10.238772+00:00, span_days=1]
001636:   examples="2026-04-02T17:54:10.238772+00:00"; "2026-04-01T23:24:51.736377+00:00"; "2026-04-01T15:07:52.300966+00:00"
001637: - is_seed_data: coverage=0.98, types={'bool': 298}, unique~=1
001638:   examples=true
001639: - district: coverage=0.98, types={'str': 298}, unique~=140
001640:   examples="Hisar"; "Visakhapatnam"; "Papum Pare"
001641: - state: coverage=0.98, types={'str': 298}, unique~=29
001642:   examples="Haryana"; "Andhra Pradesh"; "Arunachal Pradesh"
001643: - village: coverage=0.98, types={'str': 298}, unique~=292
001644:   examples="Hisar Kheda X"; "Andheri East"; "Visakhapatnam Kheda 1"
001645: - email: coverage=0.00, types={'null': 5}, unique~=0
001646: Very sparse fields (<10% coverage):
001647: - email
001648: 
001649: === STRATEGIC RECOMMENDATIONS ===
001650: 1. Improve analytics engagement by increasing write frequency to low-volume operational collections.
001651: 2. Add stricter validation for sparse high-impact fields and normalize timestamp storage to ISO UTC.
001652: 3. Backfill missing relations where relationship coverage is low (users/profile/booking links).
001653: 4. Create daily materialized analytics snapshots for trend charts when event volumes are low.
001654: 5. Add ingestion freshness monitoring and alerts using ref_data_ingestion_meta and updated_at spans.
```

## DB Analysis JSON Snapshot (Curated Head 3500 lines)

Note: Large JSON snapshot truncated to first 3500 lines for prompt efficiency while preserving wide data context.

### Source: kisankiawaz-backend/data_analysis/reports/db_analysis_20260407_211829.json

```text
000001: {
000002:   "generated_at": "2026-04-07T15:48:29.130151+00:00",
000003:   "summary": {
000004:     "db_name": "farmer",
000005:     "total_collections": 35,
000006:     "total_documents": 146521,
000007:     "top_collections_by_size": [
000008:       [
000009:         "ref_mandi_prices",
000010:         75391
000011:       ],
000012:       [
000013:         "market_prices",
000014:         30217
000015:       ],
000016:       [
000017:         "ref_equipment_rate_history",
000018:         29040
000019:       ],
000020:       [
000021:         "ref_soil_health",
000022:         4454
000023:       ],
000024:       [
000025:         "ref_pin_master",
000026:         2726
000027:       ],
000028:       [
000029:         "ref_equipment_providers",
000030:         1210
000031:       ],
000032:       [
000033:         "ref_mandi_directory",
000034:         976
000035:       ],
000036:       [
000037:         "agent_session_messages",
000038:         922
000039:       ],
000040:       [
000041:         "users",
000042:         303
000043:       ],
000044:       [
000045:         "agent_sessions",
000046:         301
000047:       ]
000048:     ]
000049:   },
000050:   "activity": {
000051:     "key_collection_sizes": {
000052:       "users": 303,
000053:       "farmer_profiles": 298,
000054:       "crops": 8,
000055:       "market_prices": 30217,
000056:       "equipment_bookings": 1,
000057:       "notifications": 32,
000058:       "agent_sessions": 301,
000059:       "agent_session_messages": 922,
000060:       "calendar_events": 18
000061:     },
000062:     "empty_key_collections": [],
000063:     "low_volume_key_collections": [
000064:       "crops",
000065:       "equipment_bookings",
000066:       "notifications",
000067:       "calendar_events"
000068:     ]
000069:   },
000070:   "relations": [
000071:     {
000072:       "source": "farmer_profiles",
000073:       "source_field": "user_id",
000074:       "target": "users",
000075:       "source_distinct": 298,
000076:       "matched": 298,
000077:       "coverage_ratio": 1.0
000078:     },
000079:     {
000080:       "source": "notifications",
000081:       "source_field": "user_id",
000082:       "target": "users",
000083:       "source_distinct": 1,
000084:       "matched": 1,
000085:       "coverage_ratio": 1.0
000086:     },
000087:     {
000088:       "source": "notification_preferences",
000089:       "source_field": "user_id",
000090:       "target": "users",
000091:       "source_distinct": 1,
000092:       "matched": 1,
000093:       "coverage_ratio": 1.0
000094:     },
000095:     {
000096:       "source": "equipment_bookings",
000097:       "source_field": "equipment_id",
000098:       "target": "equipment",
000099:       "source_distinct": 1,
000100:       "matched": 1,
000101:       "coverage_ratio": 1.0
000102:     }
000103:   ],
000104:   "collections": [
000105:     {
000106:       "collection": "admin_audit_logs",
000107:       "total_docs": 28,
000108:       "sampled_docs": 28,
000109:       "indexes": [
000110:         {
000111:           "name": "_id_",
000112:           "keys": {
000113:             "_id": 1
000114:           },
000115:           "unique": false
000116:         }
000117:       ],
000118:       "fields": {
000119:         "_id": {
000120:           "seen": 28,
000121:           "non_null": 28,
000122:           "coverage_ratio": 1.0,
000123:           "types": {
000124:             "str": 28
000125:           },
000126:           "examples": [
000127:             "\"a443f80f6a084dfaaff715e342a65282\"",
000128:             "\"2b96762e2fd14d0f9125403be82c9ea2\"",
000129:             "\"4d642393c7e0403495af6fe7d0f9a7e7\"",
000130:             "\"9464d667641341fa8d8b1a80dc5081b7\"",
000131:             "\"4c1dc7b88d6b465ea60e9fde4da2927a\""
000132:           ],
000133:           "unique_count_tracked": 28,
000134:           "unique_overflow": false,
000135:           "numeric_summary": null,
000136:           "string_len_avg": 32.0,
000137:           "datetime_summary": null
000138:         },
000139:         "admin_id": {
000140:           "seen": 28,
000141:           "non_null": 28,
000142:           "coverage_ratio": 1.0,
000143:           "types": {
000144:             "str": 28
000145:           },
000146:           "examples": [
000147:             "\"admin_admin\""
000148:           ],
000149:           "unique_count_tracked": 1,
000150:           "unique_overflow": false,
000151:           "numeric_summary": null,
000152:           "string_len_avg": 11.0,
000153:           "datetime_summary": null
000154:         },
000155:         "action": {
000156:           "seen": 28,
000157:           "non_null": 28,
000158:           "coverage_ratio": 1.0,
000159:           "types": {
000160:             "str": 28
000161:           },
000162:           "examples": [
000163:             "\"UPDATE_FARMER_STATUS\"",
000164:             "\"UPDATE_EQUIPMENT_PROVIDER\"",
000165:             "\"SOFT_DELETE_EQUIPMENT_PROVIDER\""
000166:           ],
000167:           "unique_count_tracked": 3,
000168:           "unique_overflow": false,
000169:           "numeric_summary": null,
000170:           "string_len_avg": 20.54,
000171:           "datetime_summary": null
000172:         },
000173:         "target_collection": {
000174:           "seen": 28,
000175:           "non_null": 28,
000176:           "coverage_ratio": 1.0,
000177:           "types": {
000178:             "str": 28
000179:           },
000180:           "examples": [
000181:             "\"users\"",
000182:             "\"ref_equipment_providers\""
000183:           ],
000184:           "unique_count_tracked": 2,
000185:           "unique_overflow": false,
000186:           "numeric_summary": null,
000187:           "string_len_avg": 6.29,
000188:           "datetime_summary": null
000189:         },
000190:         "target_doc_id": {
000191:           "seen": 28,
000192:           "non_null": 28,
000193:           "coverage_ratio": 1.0,
000194:           "types": {
000195:             "str": 28
000196:           },
000197:           "examples": [
000198:             "\"seed_farmer_01\"",
000199:             "\"seed_farmer_03\"",
000200:             "\"rental_prov_test_api_test_seeder_maharashtra_pune\"",
000201:             "\"d1e82f32-f819-4c7c-acc1-ecf182bfce2f\"",
000202:             "\"seed_farmer_08\""
000203:           ],
000204:           "unique_count_tracked": 10,
000205:           "unique_overflow": false,
000206:           "numeric_summary": null,
000207:           "string_len_avg": 18.07,
000208:           "datetime_summary": null
000209:         },
000210:         "payload_summary": {
000211:           "seen": 28,
000212:           "non_null": 28,
000213:           "coverage_ratio": 1.0,
000214:           "types": {
000215:             "str": 28
000216:           },
000217:           "examples": [
000218:             "\"is_active=False\"",
000219:             "\"is_active=True\"",
000220:             "\"fields=contact_phone,documents_required,eligibility,provider_phone,rate_daily,rental_id,updated_at\""
000221:           ],
000222:           "unique_count_tracked": 3,
000223:           "unique_overflow": false,
000224:           "numeric_summary": null,
000225:           "string_len_avg": 17.5,
000226:           "datetime_summary": null
000227:         },
000228:         "timestamp": {
000229:           "seen": 28,
000230:           "non_null": 28,
000231:           "coverage_ratio": 1.0,
000232:           "types": {
000233:             "str": 28
000234:           },
000235:           "examples": [
000236:             "\"2026-03-30T09:34:07.378687+00:00\"",
000237:             "\"2026-03-30T09:34:11.735877+00:00\"",
000238:             "\"2026-03-30T09:34:15.297149+00:00\"",
000239:             "\"2026-03-30T09:34:16.363085+00:00\"",
000240:             "\"2026-03-30T09:34:17.388295+00:00\""
000241:           ],
000242:           "unique_count_tracked": 28,
000243:           "unique_overflow": false,
000244:           "numeric_summary": null,
000245:           "string_len_avg": 32.0,
000246:           "datetime_summary": {
000247:             "min": "2026-03-30T09:34:07.378687+00:00",
000248:             "max": "2026-04-01T23:31:07.041409+00:00",
000249:             "span_days": 2
000250:           }
000251:         }
000252:       },
000253:       "likely_time_fields": [
000254:         "timestamp"
000255:       ],
000256:       "quality_findings": [
000257:         "timestamp span: 2 days"
000258:       ]
000259:     },
000260:     {
000261:       "collection": "admin_users",
000262:       "total_docs": 2,
000263:       "sampled_docs": 2,
000264:       "indexes": [
000265:         {
000266:           "name": "_id_",
000267:           "keys": {
000268:             "_id": 1
000269:           },
000270:           "unique": false
000271:         }
000272:       ],
000273:       "fields": {
000274:         "_id": {
000275:           "seen": 2,
000276:           "non_null": 2,
000277:           "coverage_ratio": 1.0,
000278:           "types": {
000279:             "str": 2
000280:           },
000281:           "examples": [
000282:             "\"admin_superadmin\"",
000283:             "\"admin_admin\""
000284:           ],
000285:           "unique_count_tracked": 2,
000286:           "unique_overflow": false,
000287:           "numeric_summary": null,
000288:           "string_len_avg": 13.5,
000289:           "datetime_summary": null
000290:         },
000291:         "admin_id": {
000292:           "seen": 2,
000293:           "non_null": 2,
000294:           "coverage_ratio": 1.0,
000295:           "types": {
000296:             "str": 2
000297:           },
000298:           "examples": [
000299:             "\"admin_superadmin\"",
000300:             "\"admin_admin\""
000301:           ],
000302:           "unique_count_tracked": 2,
000303:           "unique_overflow": false,
000304:           "numeric_summary": null,
000305:           "string_len_avg": 13.5,
000306:           "datetime_summary": null
000307:         },
000308:         "email": {
000309:           "seen": 2,
000310:           "non_null": 2,
000311:           "coverage_ratio": 1.0,
000312:           "types": {
000313:             "str": 2
000314:           },
000315:           "examples": [
000316:             "\"superadmin@kisankiawaz.in\"",
000317:             "\"admin@kisankiawaz.in\""
000318:           ],
000319:           "unique_count_tracked": 2,
000320:           "unique_overflow": false,
000321:           "numeric_summary": null,
000322:           "string_len_avg": 22.5,
000323:           "datetime_summary": null
000324:         },
000325:         "password_hash": {
000326:           "seen": 2,
000327:           "non_null": 2,
000328:           "coverage_ratio": 1.0,
000329:           "types": {
000330:             "str": 2
000331:           },
000332:           "examples": [
000333:             "\"$2b$12$TOisPuaLK9ajJ95ITUXwJ.2vjM6nWojAOuYF2RZ3gHoiNfzexQJf2\"",
000334:             "\"$2b$12$NRZPYUd00KNhPtmgHy5Bj.bGY7wGuPapKJkhQu.BNlpJGrKi9G4aq\""
000335:           ],
000336:           "unique_count_tracked": 2,
000337:           "unique_overflow": false,
000338:           "numeric_summary": null,
000339:           "string_len_avg": 60.0,
000340:           "datetime_summary": null
000341:         },
000342:         "name": {
000343:           "seen": 2,
000344:           "non_null": 2,
000345:           "coverage_ratio": 1.0,
000346:           "types": {
000347:             "str": 2
000348:           },
000349:           "examples": [
000350:             "\"Super Admin\"",
000351:             "\"Admin User\""
000352:           ],
000353:           "unique_count_tracked": 2,
000354:           "unique_overflow": false,
000355:           "numeric_summary": null,
000356:           "string_len_avg": 10.5,
000357:           "datetime_summary": null
000358:         },
000359:         "role": {
000360:           "seen": 2,
000361:           "non_null": 2,
000362:           "coverage_ratio": 1.0,
000363:           "types": {
000364:             "str": 2
000365:           },
000366:           "examples": [
000367:             "\"super_admin\"",
000368:             "\"admin\""
000369:           ],
000370:           "unique_count_tracked": 2,
000371:           "unique_overflow": false,
000372:           "numeric_summary": null,
000373:           "string_len_avg": 8.0,
000374:           "datetime_summary": null
000375:         },
000376:         "is_active": {
000377:           "seen": 2,
000378:           "non_null": 2,
000379:           "coverage_ratio": 1.0,
000380:           "types": {
000381:             "bool": 2
000382:           },
000383:           "examples": [
000384:             "true"
000385:           ],
000386:           "unique_count_tracked": 1,
000387:           "unique_overflow": false,
000388:           "numeric_summary": null,
000389:           "string_len_avg": null,
000390:           "datetime_summary": null
000391:         },
000392:         "created_at": {
000393:           "seen": 2,
000394:           "non_null": 2,
000395:           "coverage_ratio": 1.0,
000396:           "types": {
000397:             "str": 2
000398:           },
000399:           "examples": [
000400:             "\"2026-03-26T20:03:54.744538+00:00\""
000401:           ],
000402:           "unique_count_tracked": 1,
000403:           "unique_overflow": false,
000404:           "numeric_summary": null,
000405:           "string_len_avg": 32.0,
000406:           "datetime_summary": {
000407:             "min": "2026-03-26T20:03:54.744538+00:00",
000408:             "max": "2026-03-26T20:03:54.744538+00:00",
000409:             "span_days": 0
000410:           }
000411:         },
000412:         "last_login_at": {
000413:           "seen": 2,
000414:           "non_null": 2,
000415:           "coverage_ratio": 1.0,
000416:           "types": {
000417:             "str": 2
000418:           },
000419:           "examples": [
000420:             "\"2026-03-31T15:16:19.240125+00:00\"",
000421:             "\"2026-04-07T14:52:01.020537+00:00\""
000422:           ],
000423:           "unique_count_tracked": 2,
000424:           "unique_overflow": false,
000425:           "numeric_summary": null,
000426:           "string_len_avg": 32.0,
000427:           "datetime_summary": {
000428:             "min": "2026-03-31T15:16:19.240125+00:00",
000429:             "max": "2026-04-07T14:52:01.020537+00:00",
000430:             "span_days": 6
000431:           }
000432:         },
000433:         "created_by": {
000434:           "seen": 2,
000435:           "non_null": 2,
000436:           "coverage_ratio": 1.0,
000437:           "types": {
000438:             "str": 2
000439:           },
000440:           "examples": [
000441:             "\"seed_script\""
000442:           ],
000443:           "unique_count_tracked": 1,
000444:           "unique_overflow": false,
000445:           "numeric_summary": null,
000446:           "string_len_avg": 11.0,
000447:           "datetime_summary": null
000448:         }
000449:       },
000450:       "likely_time_fields": [
000451:         "created_at",
000452:         "last_login_at"
000453:       ],
000454:       "quality_findings": [
000455:         "created_at span: 0 days"
000456:       ]
000457:     },
000458:     {
000459:       "collection": "agent_session_messages",
000460:       "total_docs": 922,
000461:       "sampled_docs": 922,
000462:       "indexes": [
000463:         {
000464:           "name": "_id_",
000465:           "keys": {
000466:             "_id": 1
000467:           },
000468:           "unique": false
000469:         }
000470:       ],
000471:       "fields": {
000472:         "_id": {
000473:           "seen": 922,
000474:           "non_null": 922,
000475:           "coverage_ratio": 1.0,
000476:           "types": {
000477:             "str": 922
000478:           },
000479:           "examples": [
000480:             "\"e0be650552644d4aa122d88c3c20ced1\"",
000481:             "\"e2f3a1943326480b81b1c8acb4580388\"",
000482:             "\"10e9d4055a8048f18e57ca0e417d21b0\"",
000483:             "\"35c632495b9048f49ba2f19be18a6902\"",
000484:             "\"87cd225a82ca45eb88f7d155d3b932b1\""
000485:           ],
000486:           "unique_count_tracked": 922,
000487:           "unique_overflow": false,
000488:           "numeric_summary": null,
000489:           "string_len_avg": 32.0,
000490:           "datetime_summary": null
000491:         },
000492:         "session_id": {
000493:           "seen": 922,
000494:           "non_null": 922,
000495:           "coverage_ratio": 1.0,
000496:           "types": {
000497:             "str": 922
000498:           },
000499:           "examples": [
000500:             "\"176215d6-a19b-4531-b840-0ac5ddc0e034\"",
000501:             "\"18c51337-aeff-4223-9b04-ff48cc4f59d7\"",
000502:             "\"50f9d0ca-f4b4-49a6-a226-5f54bfc2bc19\"",
000503:             "\"7a09caf7-2e80-4d87-88c9-8123e4f4e4fc\"",
000504:             "\"8d56415d-b595-46e5-b701-11aba1d3b7c8\""
000505:           ],
000506:           "unique_count_tracked": 297,
000507:           "unique_overflow": false,
000508:           "numeric_summary": null,
000509:           "string_len_avg": 36.0,
000510:           "datetime_summary": null
000511:         },
000512:         "user_id": {
000513:           "seen": 922,
000514:           "non_null": 922,
000515:           "coverage_ratio": 1.0,
000516:           "types": {
000517:             "str": 922
000518:           },
000519:           "examples": [
000520:             "\"seed_farmer_01\""
000521:           ],
000522:           "unique_count_tracked": 1,
000523:           "unique_overflow": false,
000524:           "numeric_summary": null,
000525:           "string_len_avg": 14.0,
000526:           "datetime_summary": null
000527:         },
000528:         "role": {
000529:           "seen": 922,
000530:           "non_null": 922,
000531:           "coverage_ratio": 1.0,
000532:           "types": {
000533:             "str": 922
000534:           },
000535:           "examples": [
000536:             "\"user\"",
000537:             "\"assistant\""
000538:           ],
000539:           "unique_count_tracked": 2,
000540:           "unique_overflow": false,
000541:           "numeric_summary": null,
000542:           "string_len_avg": 6.5,
000543:           "datetime_summary": null
000544:         },
000545:         "content": {
000546:           "seen": 922,
000547:           "non_null": 922,
000548:           "coverage_ratio": 1.0,
000549:           "types": {
000550:             "str": 922
000551:           },
000552:           "examples": [
000553:             "\"Will it rain tomorrow in my area and is evening spray safe?\"",
000554:             "\"Here's the weather update and advice for your area (Pune):\\n\\n*   **Data Now (Source: OpenWeatherMap, retrieved 2026-04-01 11:04 UTC):**\\n    *   **Tonight (April 1st):** Expec...",
000555:             "\"PM-KISAN eligibility, required documents, and exact apply process for a Maharashtra farmer.\"",
000556:             "\"Kisan ke liye yojana vivaran (sidhe upyog yogy):\\n1. Namo Shetkari Maha Samman Nidhi Yojana\\n   Benefits: Rs. 6,000 per year additional income support in 3 instalments of Rs. 2...",
000557:             "\"Need tractor rental options near Pune with practical booking steps.\""
000558:           ],
000559:           "unique_count_tracked": 614,
000560:           "unique_overflow": false,
000561:           "numeric_summary": null,
000562:           "string_len_avg": 639.52,
000563:           "datetime_summary": null
000564:         },
000565:         "timestamp": {
000566:           "seen": 922,
000567:           "non_null": 922,
000568:           "coverage_ratio": 1.0,
000569:           "types": {
000570:             "str": 922
000571:           },
000572:           "examples": [
000573:             "\"2026-04-01T11:04:20.816271+00:00\"",
000574:             "\"2026-04-01T11:04:23.332189+00:00\"",
000575:             "\"2026-04-01T11:04:24.504013+00:00\"",
000576:             "\"2026-04-01T11:04:52.554343+00:00\"",
000577:             "\"2026-04-01T11:09:19.305746+00:00\""
000578:           ],
000579:           "unique_count_tracked": 461,
000580:           "unique_overflow": false,
000581:           "numeric_summary": null,
000582:           "string_len_avg": 32.0,
000583:           "datetime_summary": {
000584:             "min": "2026-04-01T11:04:20.816271+00:00",
000585:             "max": "2026-04-07T14:34:09.744321+00:00",
000586:             "span_days": 6
000587:           }
000588:         },
000589:         "agent": {
000590:           "seen": 461,
000591:           "non_null": 461,
000592:           "coverage_ratio": 0.5,
000593:           "types": {
000594:             "str": 461
000595:           },
000596:           "examples": [
000597:             "\"WeatherAgent\"",
000598:             "\"scheme_direct\"",
000599:             "\"equipment_direct\"",
000600:             "\"MarketAgent\"",
000601:             "\"CropAgent\""
000602:           ],
000603:           "unique_count_tracked": 11,
000604:           "unique_overflow": false,
000605:           "numeric_summary": null,
000606:           "string_len_avg": 12.03,
000607:           "datetime_summary": null
000608:         }
000609:       },
000610:       "likely_time_fields": [
000611:         "timestamp"
000612:       ],
000613:       "quality_findings": [
000614:         "timestamp span: 6 days"
000615:       ]
000616:     },
000617:     {
000618:       "collection": "agent_sessions",
000619:       "total_docs": 301,
000620:       "sampled_docs": 301,
000621:       "indexes": [
000622:         {
000623:           "name": "_id_",
000624:           "keys": {
000625:             "_id": 1
000626:           },
000627:           "unique": false
000628:         }
000629:       ],
000630:       "fields": {
000631:         "_id": {
000632:           "seen": 301,
000633:           "non_null": 301,
000634:           "coverage_ratio": 1.0,
000635:           "types": {
000636:             "str": 301
000637:           },
000638:           "examples": [
000639:             "\"f7c968a8-994c-4e0d-9a18-14a1cec70c8a\"",
000640:             "\"6e7eb3d7-365d-4d6c-956c-118bcdbad259\"",
000641:             "\"08b703dd-f895-4d1c-a541-a566fb9eed48\"",
000642:             "\"a6710319-9f64-4f61-a4dd-6b2089ebc23f\"",
000643:             "\"176215d6-a19b-4531-b840-0ac5ddc0e034\""
000644:           ],
000645:           "unique_count_tracked": 301,
000646:           "unique_overflow": false,
000647:           "numeric_summary": null,
000648:           "string_len_avg": 36.0,
000649:           "datetime_summary": null
000650:         },
000651:         "language": {
000652:           "seen": 301,
000653:           "non_null": 301,
000654:           "coverage_ratio": 1.0,
000655:           "types": {
000656:             "str": 301
000657:           },
000658:           "examples": [
000659:             "\"en\"",
000660:             "\"hinglish\"",
000661:             "\"hi\"",
000662:             "\"auto\"",
000663:             "\"auto-latin\""
000664:           ],
000665:           "unique_count_tracked": 13,
000666:           "unique_overflow": false,
000667:           "numeric_summary": null,
000668:           "string_len_avg": 4.15,
000669:           "datetime_summary": null
000670:         },
000671:         "updated_at": {
000672:           "seen": 301,
000673:           "non_null": 301,
000674:           "coverage_ratio": 1.0,
000675:           "types": {
000676:             "str": 301
000677:           },
000678:           "examples": [
000679:             "\"2026-04-01T10:19:24.130824+00:00\"",
000680:             "\"2026-04-01T10:29:23.943562+00:00\"",
000681:             "\"2026-04-01T10:36:42.361084+00:00\"",
000682:             "\"2026-04-01T10:59:03.585187+00:00\"",
000683:             "\"2026-04-01T11:04:52.723815+00:00\""
000684:           ],
000685:           "unique_count_tracked": 301,
000686:           "unique_overflow": false,
000687:           "numeric_summary": null,
000688:           "string_len_avg": 32.0,
000689:           "datetime_summary": {
000690:             "min": "2026-04-01T10:19:24.130824+00:00",
000691:             "max": "2026-04-07T14:34:09.799856+00:00",
000692:             "span_days": 6
000693:           }
000694:         },
000695:         "user_id": {
000696:           "seen": 301,
000697:           "non_null": 301,
000698:           "coverage_ratio": 1.0,
000699:           "types": {
000700:             "str": 301
000701:           },
000702:           "examples": [
000703:             "\"seed_farmer_01\""
000704:           ],
000705:           "unique_count_tracked": 1,
000706:           "unique_overflow": false,
000707:           "numeric_summary": null,
000708:           "string_len_avg": 14.0,
000709:           "datetime_summary": null
000710:         },
000711:         "farmer_facts": {
000712:           "seen": 301,
000713:           "non_null": 301,
000714:           "coverage_ratio": 1.0,
000715:           "types": {
000716:             "list": 301
000717:           },
000718:           "examples": [
000719:             "[\"topics=weather\"]",
000720:             "[]",
000721:             "[\"crops_of_interest=rice\"]",
000722:             "[\"location_hint=Pune\", \"crops_of_interest=rice\", \"topics=mandi\", \"topics=pm-kisan\", \"topics=rental,tractor\", \"location_hint=Maharashtra with risk tips\", \"crops_of_interest=soybe...",
000723:             "[\"profile_state=Maharashtra\", \"profile_district=Pune\", \"profile_village=Shirur\", \"profile_pin_code=412210\", \"topics=pm-kisan\", \"topics=rental,tractor\"]"
000724:           ],
000725:           "unique_count_tracked": 0,
000726:           "unique_overflow": false,
000727:           "numeric_summary": null,
000728:           "string_len_avg": null,
000729:           "datetime_summary": null
000730:         },
000731:         "farmer_facts[]": {
000732:           "seen": 2315,
000733:           "non_null": 2306,
000734:           "coverage_ratio": 7.6611,
000735:           "types": {
000736:             "str": 2306,
000737:             "null": 9
000738:           },
000739:           "examples": [
000740:             "\"topics=weather\"",
000741:             "\"crops_of_interest=rice\"",
000742:             "\"location_hint=Pune\"",
000743:             "\"topics=mandi\"",
000744:             "\"topics=pm-kisan\""
000745:           ],
000746:           "unique_count_tracked": 45,
000747:           "unique_overflow": false,
000748:           "numeric_summary": null,
000749:           "string_len_avg": 24.96,
000750:           "datetime_summary": null
000751:         },
000752:         "summary": {
000753:           "seen": 301,
000754:           "non_null": 301,
000755:           "coverage_ratio": 1.0,
000756:           "types": {
000757:             "str": 301
000758:           },
000759:           "examples": [
000760:             "\"[2026-04-01T10:18:29.926236+00:00] User intent: hi what's the weather right now | Assistant response gist: Here's the current weather update for Pune, India, as of April 1, 202...",
000761:             "\"[2026-04-01T10:29:23.943562+00:00] User intent: Give one concise daily farming recommendation in 1-2 sentences for calendar planning. Upcoming tasks: Market Alert on Mar 24 at ...",
000762:             "\"[2026-04-01T10:35:29.891561+00:00] User intent: hi what's the price of tomat9 | Assistant response gist: Exact local match is limited in current records, so here is the closest...",
000763:             "\"[2026-04-01T10:57:43.736360+00:00] User intent: What is today's tomato mandi price in Pune, Maharashtra? Give nearest mandi and action. | Assistant response gist: Namaste Kisan...",
000764:             "\"[2026-04-01T11:04:20.945998+00:00] User intent: Will it rain tomorrow in my area and is evening spray safe? | Assistant response gist: Here's the weather update and advice for ..."
000765:           ],
000766:           "unique_count_tracked": 301,
000767:           "unique_overflow": false,
000768:           "numeric_summary": null,
000769:           "string_len_avg": 651.16,
000770:           "datetime_summary": null
000771:         },
000772:         "agent_type": {
000773:           "seen": 297,
000774:           "non_null": 297,
000775:           "coverage_ratio": 0.9867,
000776:           "types": {
000777:             "str": 297
000778:           },
000779:           "examples": [
000780:             "\"weather\"",
000781:             "\"market\"",
000782:             "\"scheme\"",
000783:             "\"crop\"",
000784:             "\"cattle\""
000785:           ],
000786:           "unique_count_tracked": 6,
000787:           "unique_overflow": false,
000788:           "numeric_summary": null,
000789:           "string_len_avg": 6.38,
000790:           "datetime_summary": null
000791:         },
000792:         "created_at": {
000793:           "seen": 297,
000794:           "non_null": 297,
000795:           "coverage_ratio": 0.9867,
000796:           "types": {
000797:             "str": 297
000798:           },
000799:           "examples": [
000800:             "\"2026-04-01T11:04:20.816271+00:00\"",
000801:             "\"2026-04-01T11:09:19.305746+00:00\"",
000802:             "\"2026-04-01T11:13:18.094915+00:00\"",
000803:             "\"2026-04-01T11:29:01.743052+00:00\"",
000804:             "\"2026-04-01T11:29:02.973199+00:00\""
000805:           ],
000806:           "unique_count_tracked": 297,
000807:           "unique_overflow": false,
000808:           "numeric_summary": null,
000809:           "string_len_avg": 32.0,
000810:           "datetime_summary": {
000811:             "min": "2026-04-01T11:04:20.816271+00:00",
000812:             "max": "2026-04-07T14:34:09.744321+00:00",
000813:             "span_days": 6
000814:           }
000815:         },
000816:         "farmer_id": {
000817:           "seen": 297,
000818:           "non_null": 297,
000819:           "coverage_ratio": 0.9867,
000820:           "types": {
000821:             "str": 297
000822:           },
000823:           "examples": [
000824:             "\"seed_farmer_01\""
000825:           ],
000826:           "unique_count_tracked": 1,
000827:           "unique_overflow": false,
000828:           "numeric_summary": null,
000829:           "string_len_avg": 14.0,
000830:           "datetime_summary": null
000831:         },
000832:         "last_activity": {
000833:           "seen": 297,
000834:           "non_null": 297,
000835:           "coverage_ratio": 0.9867,
000836:           "types": {
000837:             "str": 297
000838:           },
000839:           "examples": [
000840:             "\"2026-04-01T11:04:52.554343+00:00\"",
000841:             "\"2026-04-01T11:11:03.087646+00:00\"",
000842:             "\"2026-04-01T11:14:48.097985+00:00\"",
000843:             "\"2026-04-01T11:29:01.743052+00:00\"",
000844:             "\"2026-04-01T11:29:02.973199+00:00\""
000845:           ],
000846:           "unique_count_tracked": 297,
000847:           "unique_overflow": false,
000848:           "numeric_summary": null,
000849:           "string_len_avg": 32.0,
000850:           "datetime_summary": {
000851:             "min": "2026-04-01T11:04:52.554343+00:00",
000852:             "max": "2026-04-07T14:34:09.744321+00:00",
000853:             "span_days": 6
000854:           }
000855:         },
000856:         "message_count": {
000857:           "seen": 297,
000858:           "non_null": 297,
000859:           "coverage_ratio": 0.9867,
000860:           "types": {
000861:             "int": 297
000862:           },
000863:           "examples": [
000864:             "8",
000865:             "16",
000866:             "18",
000867:             "2",
000868:             "10"
000869:           ],
000870:           "unique_count_tracked": 9,
000871:           "unique_overflow": false,
000872:           "numeric_summary": {
000873:             "count": 297.0,
000874:             "min": 2.0,
000875:             "p25": 2.0,
000876:             "p50": 2.0,
000877:             "p75": 2.0,
000878:             "max": 18.0,
000879:             "mean": 3.1043771043771042
000880:           },
000881:           "string_len_avg": null,
000882:           "datetime_summary": null
000883:         },
000884:         "session_id": {
000885:           "seen": 297,
000886:           "non_null": 297,
000887:           "coverage_ratio": 0.9867,
000888:           "types": {
000889:             "str": 297
000890:           },
000891:           "examples": [
000892:             "\"176215d6-a19b-4531-b840-0ac5ddc0e034\"",
000893:             "\"18c51337-aeff-4223-9b04-ff48cc4f59d7\"",
000894:             "\"50f9d0ca-f4b4-49a6-a226-5f54bfc2bc19\"",
000895:             "\"7a09caf7-2e80-4d87-88c9-8123e4f4e4fc\"",
000896:             "\"8d56415d-b595-46e5-b701-11aba1d3b7c8\""
000897:           ],
000898:           "unique_count_tracked": 297,
000899:           "unique_overflow": false,
000900:           "numeric_summary": null,
000901:           "string_len_avg": 36.0,
000902:           "datetime_summary": null
000903:         }
000904:       },
000905:       "likely_time_fields": [
000906:         "updated_at",
000907:         "created_at"
000908:       ],
000909:       "quality_findings": [
000910:         "created_at span: 6 days",
000911:         "updated_at span: 6 days"
000912:       ]
000913:     },
000914:     {
000915:       "collection": "analytics_snapshots",
000916:       "total_docs": 3,
000917:       "sampled_docs": 3,
000918:       "indexes": [
000919:         {
000920:           "name": "_id_",
000921:           "keys": {
000922:             "_id": 1
000923:           },
000924:           "unique": false
000925:         }
000926:       ],
000927:       "fields": {
000928:         "_id": {
000929:           "seen": 3,
000930:           "non_null": 3,
000931:           "coverage_ratio": 1.0,
000932:           "types": {
000933:             "str": 3
000934:           },
000935:           "examples": [
000936:             "\"2026-03-26\"",
000937:             "\"2026-03-30\"",
000938:             "\"2026-04-01\""
000939:           ],
000940:           "unique_count_tracked": 3,
000941:           "unique_overflow": false,
000942:           "numeric_summary": null,
000943:           "string_len_avg": 10.0,
000944:           "datetime_summary": {
000945:             "min": "2026-03-26T00:00:00+00:00",
000946:             "max": "2026-04-01T00:00:00+00:00",
000947:             "span_days": 6
000948:           }
000949:         },
000950:         "date": {
000951:           "seen": 3,
000952:           "non_null": 3,
000953:           "coverage_ratio": 1.0,
000954:           "types": {
000955:             "str": 3
000956:           },
000957:           "examples": [
000958:             "\"2026-03-26\"",
000959:             "\"2026-03-30\"",
000960:             "\"2026-04-01\""
000961:           ],
000962:           "unique_count_tracked": 3,
000963:           "unique_overflow": false,
000964:           "numeric_summary": null,
000965:           "string_len_avg": 10.0,
000966:           "datetime_summary": {
000967:             "min": "2026-03-26T00:00:00+00:00",
000968:             "max": "2026-04-01T00:00:00+00:00",
000969:             "span_days": 6
000970:           }
000971:         },
000972:         "window_days": {
000973:           "seen": 3,
000974:           "non_null": 3,
000975:           "coverage_ratio": 1.0,
000976:           "types": {
000977:             "int": 3
000978:           },
000979:           "examples": [
000980:             "30",
000981:             "90"
000982:           ],
000983:           "unique_count_tracked": 2,
000984:           "unique_overflow": false,
000985:           "numeric_summary": {
000986:             "count": 3.0,
000987:             "min": 30.0,
000988:             "p25": 30.0,
000989:             "p50": 30.0,
000990:             "p75": 30.0,
000991:             "max": 90.0,
000992:             "mean": 50.0
000993:           },
000994:           "string_len_avg": null,
000995:           "datetime_summary": null
000996:         },
000997:         "insights": {
000998:           "seen": 3,
000999:           "non_null": 3,
001000:           "coverage_ratio": 1.0,
001001:           "types": {
001002:             "dict": 3
001003:           },
001004:           "examples": [
001005:             "{\"window_days\": 30, \"generated_at\": \"2026-03-26T22:39:27.786498+00:00\", \"scorecard\": [{\"title\": \"Total Farmers\", \"value\": 8, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farme...",
001006:             "{\"window_days\": 90, \"generated_at\": \"2026-03-30T15:19:00.610096+00:00\", \"scorecard\": [{\"title\": \"Total Farmers\", \"value\": 8, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farme...",
001007:             "{\"window_days\": 30, \"generated_at\": \"2026-04-01T20:16:25.579058+00:00\", \"scorecard\": [{\"title\": \"Total Farmers\", \"value\": 13, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farm..."
001008:           ],
001009:           "unique_count_tracked": 0,
001010:           "unique_overflow": false,
001011:           "numeric_summary": null,
001012:           "string_len_avg": null,
001013:           "datetime_summary": null
001014:         },
001015:         "insights.window_days": {
001016:           "seen": 3,
001017:           "non_null": 3,
001018:           "coverage_ratio": 1.0,
001019:           "types": {
001020:             "int": 3
001021:           },
001022:           "examples": [
001023:             "30",
001024:             "90"
001025:           ],
001026:           "unique_count_tracked": 2,
001027:           "unique_overflow": false,
001028:           "numeric_summary": {
001029:             "count": 3.0,
001030:             "min": 30.0,
001031:             "p25": 30.0,
001032:             "p50": 30.0,
001033:             "p75": 30.0,
001034:             "max": 90.0,
001035:             "mean": 50.0
001036:           },
001037:           "string_len_avg": null,
001038:           "datetime_summary": null
001039:         },
001040:         "insights.generated_at": {
001041:           "seen": 3,
001042:           "non_null": 3,
001043:           "coverage_ratio": 1.0,
001044:           "types": {
001045:             "str": 3
001046:           },
001047:           "examples": [
001048:             "\"2026-03-26T22:39:27.786498+00:00\"",
001049:             "\"2026-03-30T15:19:00.610096+00:00\"",
001050:             "\"2026-04-01T20:16:25.579058+00:00\""
001051:           ],
001052:           "unique_count_tracked": 3,
001053:           "unique_overflow": false,
001054:           "numeric_summary": null,
001055:           "string_len_avg": 32.0,
001056:           "datetime_summary": {
001057:             "min": "2026-03-26T22:39:27.786498+00:00",
001058:             "max": "2026-04-01T20:16:25.579058+00:00",
001059:             "span_days": 5
001060:           }
001061:         },
001062:         "insights.scorecard": {
001063:           "seen": 3,
001064:           "non_null": 3,
001065:           "coverage_ratio": 1.0,
001066:           "types": {
001067:             "list": 3
001068:           },
001069:           "examples": [
001070:             "[{\"title\": \"Total Farmers\", \"value\": 8, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farmers in last 30 days: 8\"}, {\"title\": \"Active Farmers\", \"value\": 1, \"delta\": 12.5, \"tren...",
001071:             "[{\"title\": \"Total Farmers\", \"value\": 8, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farmers in last 90 days: 8\"}, {\"title\": \"Active Farmers\", \"value\": 1, \"delta\": 12.5, \"tren...",
001072:             "[{\"title\": \"Total Farmers\", \"value\": 13, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farmers in last 30 days: 13\"}, {\"title\": \"Active Farmers\", \"value\": 1, \"delta\": 7.69, \"tr..."
001073:           ],
001074:           "unique_count_tracked": 0,
001075:           "unique_overflow": false,
001076:           "numeric_summary": null,
001077:           "string_len_avg": null,
001078:           "datetime_summary": null
001079:         },
001080:         "insights.scorecard[]": {
001081:           "seen": 12,
001082:           "non_null": 12,
001083:           "coverage_ratio": 4.0,
001084:           "types": {
001085:             "dict": 12
001086:           },
001087:           "examples": [
001088:             "{\"title\": \"Total Farmers\", \"value\": 8, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farmers in last 30 days: 8\"}",
001089:             "{\"title\": \"Active Farmers\", \"value\": 1, \"delta\": 12.5, \"trend\": \"neutral\", \"context\": \"Activation rate in 30 days: 12.5%\"}",
001090:             "{\"title\": \"Conversations\", \"value\": 0, \"delta\": 0.0, \"trend\": \"down\", \"context\": \"Agent usage intensity over current window\"}",
001091:             "{\"title\": \"Equipment Demand\", \"value\": 1, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"Bookings created in current window\"}",
001092:             "{\"title\": \"Total Farmers\", \"value\": 8, \"delta\": 100.0, \"trend\": \"up\", \"context\": \"New farmers in last 90 days: 8\"}"
001093:           ],
001094:           "unique_count_tracked": 0,
001095:           "unique_overflow": false,
001096:           "numeric_summary": null,
001097:           "string_len_avg": null,
001098:           "datetime_summary": null
001099:         },
001100:         "insights.scorecard[].title": {
001101:           "seen": 12,
001102:           "non_null": 12,
001103:           "coverage_ratio": 4.0,
001104:           "types": {
001105:             "str": 12
001106:           },
001107:           "examples": [
001108:             "\"Total Farmers\"",
001109:             "\"Active Farmers\"",
001110:             "\"Conversations\"",
001111:             "\"Equipment Demand\""
001112:           ],
001113:           "unique_count_tracked": 4,
001114:           "unique_overflow": false,
001115:           "numeric_summary": null,
001116:           "string_len_avg": 14.0,
001117:           "datetime_summary": null
001118:         },
001119:         "insights.scorecard[].value": {
001120:           "seen": 12,
001121:           "non_null": 12,
001122:           "coverage_ratio": 4.0,
001123:           "types": {
001124:             "int": 12
001125:           },
001126:           "examples": [
001127:             "8",
001128:             "1",
001129:             "0",
001130:             "13"
001131:           ],
001132:           "unique_count_tracked": 4,
001133:           "unique_overflow": false,
001134:           "numeric_summary": {
001135:             "count": 12.0,
001136:             "min": 0.0,
001137:             "p25": 0.0,
001138:             "p50": 1.0,
001139:             "p75": 1.0,
001140:             "max": 13.0,
001141:             "mean": 2.9166666666666665
001142:           },
001143:           "string_len_avg": null,
001144:           "datetime_summary": null
001145:         },
001146:         "insights.scorecard[].delta": {
001147:           "seen": 12,
001148:           "non_null": 12,
001149:           "coverage_ratio": 4.0,
001150:           "types": {
001151:             "float": 12
001152:           },
001153:           "examples": [
001154:             "100.0",
001155:             "12.5",
001156:             "0.0",
001157:             "7.69"
001158:           ],
001159:           "unique_count_tracked": 4,
001160:           "unique_overflow": false,
001161:           "numeric_summary": {
001162:             "count": 12.0,
001163:             "min": 0.0,
001164:             "p25": 0.0,
001165:             "p50": 12.5,
001166:             "p75": 100.0,
001167:             "max": 100.0,
001168:             "mean": 52.72416666666667
001169:           },
001170:           "string_len_avg": null,
001171:           "datetime_summary": null
001172:         },
001173:         "insights.scorecard[].trend": {
001174:           "seen": 12,
001175:           "non_null": 12,
001176:           "coverage_ratio": 4.0,
001177:           "types": {
001178:             "str": 12
001179:           },
001180:           "examples": [
001181:             "\"up\"",
001182:             "\"neutral\"",
001183:             "\"down\""
001184:           ],
001185:           "unique_count_tracked": 3,
001186:           "unique_overflow": false,
001187:           "numeric_summary": null,
001188:           "string_len_avg": 3.75,
001189:           "datetime_summary": null
001190:         },
001191:         "insights.scorecard[].context": {
001192:           "seen": 12,
001193:           "non_null": 12,
001194:           "coverage_ratio": 4.0,
001195:           "types": {
001196:             "str": 12
001197:           },
001198:           "examples": [
001199:             "\"New farmers in last 30 days: 8\"",
001200:             "\"Activation rate in 30 days: 12.5%\"",
001201:             "\"Agent usage intensity over current window\"",
001202:             "\"Bookings created in current window\"",
001203:             "\"New farmers in last 90 days: 8\""
001204:           ],
001205:           "unique_count_tracked": 8,
001206:           "unique_overflow": false,
001207:           "numeric_summary": null,
001208:           "string_len_avg": 34.58,
001209:           "datetime_summary": null
001210:         },
001211:         "insights.growth_trends": {
001212:           "seen": 3,
001213:           "non_null": 3,
001214:           "coverage_ratio": 1.0,
001215:           "types": {
001216:             "dict": 3
001217:           },
001218:           "examples": [
001219:             "{\"farmers\": [{\"date\": \"2026-02-25\", \"value\": 0}, {\"date\": \"2026-02-26\", \"value\": 0}, {\"date\": \"2026-02-27\", \"value\": 0}, {\"date\": \"2026-02-28\", \"value\": 0}, {\"date\": \"2026-03-01...",
001220:             "{\"farmers\": [{\"date\": \"2025-12-31\", \"value\": 0}, {\"date\": \"2026-01-01\", \"value\": 0}, {\"date\": \"2026-01-02\", \"value\": 0}, {\"date\": \"2026-01-03\", \"value\": 0}, {\"date\": \"2026-01-04...",
001221:             "{\"farmers\": [{\"date\": \"2026-03-03\", \"value\": 0}, {\"date\": \"2026-03-04\", \"value\": 0}, {\"date\": \"2026-03-05\", \"value\": 0}, {\"date\": \"2026-03-06\", \"value\": 0}, {\"date\": \"2026-03-07..."
001222:           ],
001223:           "unique_count_tracked": 0,
001224:           "unique_overflow": false,
001225:           "numeric_summary": null,
001226:           "string_len_avg": null,
001227:           "datetime_summary": null
001228:         },
001229:         "insights.growth_trends.farmers": {
001230:           "seen": 3,
001231:           "non_null": 3,
001232:           "coverage_ratio": 1.0,
001233:           "types": {
001234:             "list": 3
001235:           },
001236:           "examples": [
001237:             "[{\"date\": \"2026-02-25\", \"value\": 0}, {\"date\": \"2026-02-26\", \"value\": 0}, {\"date\": \"2026-02-27\", \"value\": 0}, {\"date\": \"2026-02-28\", \"value\": 0}, {\"date\": \"2026-03-01\", \"value\": ...",
001238:             "[{\"date\": \"2025-12-31\", \"value\": 0}, {\"date\": \"2026-01-01\", \"value\": 0}, {\"date\": \"2026-01-02\", \"value\": 0}, {\"date\": \"2026-01-03\", \"value\": 0}, {\"date\": \"2026-01-04\", \"value\": ...",
001239:             "[{\"date\": \"2026-03-03\", \"value\": 0}, {\"date\": \"2026-03-04\", \"value\": 0}, {\"date\": \"2026-03-05\", \"value\": 0}, {\"date\": \"2026-03-06\", \"value\": 0}, {\"date\": \"2026-03-07\", \"value\": ..."
001240:           ],
001241:           "unique_count_tracked": 0,
001242:           "unique_overflow": false,
001243:           "numeric_summary": null,
001244:           "string_len_avg": null,
001245:           "datetime_summary": null
001246:         },
001247:         "insights.growth_trends.farmers[]": {
001248:           "seen": 90,
001249:           "non_null": 90,
001250:           "coverage_ratio": 30.0,
001251:           "types": {
001252:             "dict": 90
001253:           },
001254:           "examples": [
001255:             "{\"date\": \"2026-02-25\", \"value\": 0}",
001256:             "{\"date\": \"2026-02-26\", \"value\": 0}",
001257:             "{\"date\": \"2026-02-27\", \"value\": 0}",
001258:             "{\"date\": \"2026-02-28\", \"value\": 0}",
001259:             "{\"date\": \"2026-03-01\", \"value\": 0}"
001260:           ],
001261:           "unique_count_tracked": 0,
001262:           "unique_overflow": false,
001263:           "numeric_summary": null,
001264:           "string_len_avg": null,
001265:           "datetime_summary": null
001266:         },
001267:         "insights.growth_trends.farmers[].date": {
001268:           "seen": 90,
001269:           "non_null": 90,
001270:           "coverage_ratio": 30.0,
001271:           "types": {
001272:             "str": 90
001273:           },
001274:           "examples": [
001275:             "\"2026-02-25\"",
001276:             "\"2026-02-26\"",
001277:             "\"2026-02-27\"",
001278:             "\"2026-02-28\"",
001279:             "\"2026-03-01\""
001280:           ],
001281:           "unique_count_tracked": 66,
001282:           "unique_overflow": false,
001283:           "numeric_summary": null,
001284:           "string_len_avg": 10.0,
001285:           "datetime_summary": {
001286:             "min": "2025-12-31T00:00:00+00:00",
001287:             "max": "2026-04-01T00:00:00+00:00",
001288:             "span_days": 91
001289:           }
001290:         },
001291:         "insights.growth_trends.farmers[].value": {
001292:           "seen": 90,
001293:           "non_null": 90,
001294:           "coverage_ratio": 30.0,
001295:           "types": {
001296:             "int": 90
001297:           },
001298:           "examples": [
001299:             "0",
001300:             "8",
001301:             "5"
001302:           ],
001303:           "unique_count_tracked": 3,
001304:           "unique_overflow": false,
001305:           "numeric_summary": {
001306:             "count": 90.0,
001307:             "min": 0.0,
001308:             "p25": 0.0,
001309:             "p50": 0.0,
001310:             "p75": 0.0,
001311:             "max": 8.0,
001312:             "mean": 0.23333333333333334
001313:           },
001314:           "string_len_avg": null,
001315:           "datetime_summary": null
001316:         },
001317:         "insights.growth_trends.conversations": {
001318:           "seen": 3,
001319:           "non_null": 3,
001320:           "coverage_ratio": 1.0,
001321:           "types": {
001322:             "list": 3
001323:           },
001324:           "examples": [
001325:             "[{\"date\": \"2026-02-25\", \"value\": 0}, {\"date\": \"2026-02-26\", \"value\": 0}, {\"date\": \"2026-02-27\", \"value\": 0}, {\"date\": \"2026-02-28\", \"value\": 0}, {\"date\": \"2026-03-01\", \"value\": ...",
001326:             "[{\"date\": \"2025-12-31\", \"value\": 0}, {\"date\": \"2026-01-01\", \"value\": 0}, {\"date\": \"2026-01-02\", \"value\": 0}, {\"date\": \"2026-01-03\", \"value\": 0}, {\"date\": \"2026-01-04\", \"value\": ...",
001327:             "[{\"date\": \"2026-03-03\", \"value\": 0}, {\"date\": \"2026-03-04\", \"value\": 0}, {\"date\": \"2026-03-05\", \"value\": 0}, {\"date\": \"2026-03-06\", \"value\": 0}, {\"date\": \"2026-03-07\", \"value\": ..."
001328:           ],
001329:           "unique_count_tracked": 0,
001330:           "unique_overflow": false,
001331:           "numeric_summary": null,
001332:           "string_len_avg": null,
001333:           "datetime_summary": null
001334:         },
001335:         "insights.growth_trends.conversations[]": {
001336:           "seen": 90,
001337:           "non_null": 90,
001338:           "coverage_ratio": 30.0,
001339:           "types": {
001340:             "dict": 90
001341:           },
001342:           "examples": [
001343:             "{\"date\": \"2026-02-25\", \"value\": 0}",
001344:             "{\"date\": \"2026-02-26\", \"value\": 0}",
001345:             "{\"date\": \"2026-02-27\", \"value\": 0}",
001346:             "{\"date\": \"2026-02-28\", \"value\": 0}",
001347:             "{\"date\": \"2026-03-01\", \"value\": 0}"
001348:           ],
001349:           "unique_count_tracked": 0,
001350:           "unique_overflow": false,
001351:           "numeric_summary": null,
001352:           "string_len_avg": null,
001353:           "datetime_summary": null
001354:         },
001355:         "insights.growth_trends.conversations[].date": {
001356:           "seen": 90,
001357:           "non_null": 90,
001358:           "coverage_ratio": 30.0,
001359:           "types": {
001360:             "str": 90
001361:           },
001362:           "examples": [
001363:             "\"2026-02-25\"",
001364:             "\"2026-02-26\"",
001365:             "\"2026-02-27\"",
001366:             "\"2026-02-28\"",
001367:             "\"2026-03-01\""
001368:           ],
001369:           "unique_count_tracked": 66,
001370:           "unique_overflow": false,
001371:           "numeric_summary": null,
001372:           "string_len_avg": 10.0,
001373:           "datetime_summary": {
001374:             "min": "2025-12-31T00:00:00+00:00",
001375:             "max": "2026-04-01T00:00:00+00:00",
001376:             "span_days": 91
001377:           }
001378:         },
001379:         "insights.growth_trends.conversations[].value": {
001380:           "seen": 90,
001381:           "non_null": 90,
001382:           "coverage_ratio": 30.0,
001383:           "types": {
001384:             "int": 90
001385:           },
001386:           "examples": [
001387:             "0"
001388:           ],
001389:           "unique_count_tracked": 1,
001390:           "unique_overflow": false,
001391:           "numeric_summary": {
001392:             "count": 90.0,
001393:             "min": 0.0,
001394:             "p25": 0.0,
001395:             "p50": 0.0,
001396:             "p75": 0.0,
001397:             "max": 0.0,
001398:             "mean": 0.0
001399:           },
001400:           "string_len_avg": null,
001401:           "datetime_summary": null
001402:         },
001403:         "insights.growth_trends.bookings": {
001404:           "seen": 3,
001405:           "non_null": 3,
001406:           "coverage_ratio": 1.0,
001407:           "types": {
001408:             "list": 3
001409:           },
001410:           "examples": [
001411:             "[{\"date\": \"2026-02-25\", \"value\": 0}, {\"date\": \"2026-02-26\", \"value\": 0}, {\"date\": \"2026-02-27\", \"value\": 0}, {\"date\": \"2026-02-28\", \"value\": 0}, {\"date\": \"2026-03-01\", \"value\": ...",
001412:             "[{\"date\": \"2025-12-31\", \"value\": 0}, {\"date\": \"2026-01-01\", \"value\": 0}, {\"date\": \"2026-01-02\", \"value\": 0}, {\"date\": \"2026-01-03\", \"value\": 0}, {\"date\": \"2026-01-04\", \"value\": ...",
001413:             "[{\"date\": \"2026-03-03\", \"value\": 0}, {\"date\": \"2026-03-04\", \"value\": 0}, {\"date\": \"2026-03-05\", \"value\": 0}, {\"date\": \"2026-03-06\", \"value\": 0}, {\"date\": \"2026-03-07\", \"value\": ..."
001414:           ],
001415:           "unique_count_tracked": 0,
001416:           "unique_overflow": false,
001417:           "numeric_summary": null,
001418:           "string_len_avg": null,
001419:           "datetime_summary": null
001420:         },
001421:         "insights.growth_trends.bookings[]": {
001422:           "seen": 90,
001423:           "non_null": 90,
001424:           "coverage_ratio": 30.0,
001425:           "types": {
001426:             "dict": 90
001427:           },
001428:           "examples": [
001429:             "{\"date\": \"2026-02-25\", \"value\": 0}",
001430:             "{\"date\": \"2026-02-26\", \"value\": 0}",
001431:             "{\"date\": \"2026-02-27\", \"value\": 0}",
001432:             "{\"date\": \"2026-02-28\", \"value\": 0}",
001433:             "{\"date\": \"2026-03-01\", \"value\": 0}"
001434:           ],
001435:           "unique_count_tracked": 0,
001436:           "unique_overflow": false,
001437:           "numeric_summary": null,
001438:           "string_len_avg": null,
001439:           "datetime_summary": null
001440:         },
001441:         "insights.growth_trends.bookings[].date": {
001442:           "seen": 90,
001443:           "non_null": 90,
001444:           "coverage_ratio": 30.0,
001445:           "types": {
001446:             "str": 90
001447:           },
001448:           "examples": [
001449:             "\"2026-02-25\"",
001450:             "\"2026-02-26\"",
001451:             "\"2026-02-27\"",
001452:             "\"2026-02-28\"",
001453:             "\"2026-03-01\""
001454:           ],
001455:           "unique_count_tracked": 66,
001456:           "unique_overflow": false,
001457:           "numeric_summary": null,
001458:           "string_len_avg": 10.0,
001459:           "datetime_summary": {
001460:             "min": "2025-12-31T00:00:00+00:00",
001461:             "max": "2026-04-01T00:00:00+00:00",
001462:             "span_days": 91
001463:           }
001464:         },
001465:         "insights.growth_trends.bookings[].value": {
001466:           "seen": 90,
001467:           "non_null": 90,
001468:           "coverage_ratio": 30.0,
001469:           "types": {
001470:             "int": 90
001471:           },
001472:           "examples": [
001473:             "0",
001474:             "1"
001475:           ],
001476:           "unique_count_tracked": 2,
001477:           "unique_overflow": false,
001478:           "numeric_summary": {
001479:             "count": 90.0,
001480:             "min": 0.0,
001481:             "p25": 0.0,
001482:             "p50": 0.0,
001483:             "p75": 0.0,
001484:             "max": 1.0,
001485:             "mean": 0.022222222222222223
001486:           },
001487:           "string_len_avg": null,
001488:           "datetime_summary": null
001489:         },
001490:         "insights.engagement": {
001491:           "seen": 3,
001492:           "non_null": 3,
001493:           "coverage_ratio": 1.0,
001494:           "types": {
001495:             "dict": 3
001496:           },
001497:           "examples": [
001498:             "{\"active_farmers\": 1, \"activation_rate_pct\": 12.5, \"retention_risk_pct\": 87.5, \"conversation_per_active_farmer\": 0.0, \"voice_sessions_window\": 0}",
001499:             "{\"active_farmers\": 1, \"activation_rate_pct\": 7.69, \"retention_risk_pct\": 92.31, \"conversation_per_active_farmer\": 0.0, \"voice_sessions_window\": 0}"
001500:           ],
001501:           "unique_count_tracked": 0,
001502:           "unique_overflow": false,
001503:           "numeric_summary": null,
001504:           "string_len_avg": null,
001505:           "datetime_summary": null
001506:         },
001507:         "insights.engagement.active_farmers": {
001508:           "seen": 3,
001509:           "non_null": 3,
001510:           "coverage_ratio": 1.0,
001511:           "types": {
001512:             "int": 3
001513:           },
001514:           "examples": [
001515:             "1"
001516:           ],
001517:           "unique_count_tracked": 1,
001518:           "unique_overflow": false,
001519:           "numeric_summary": {
001520:             "count": 3.0,
001521:             "min": 1.0,
001522:             "p25": 1.0,
001523:             "p50": 1.0,
001524:             "p75": 1.0,
001525:             "max": 1.0,
001526:             "mean": 1.0
001527:           },
001528:           "string_len_avg": null,
001529:           "datetime_summary": null
001530:         },
001531:         "insights.engagement.activation_rate_pct": {
001532:           "seen": 3,
001533:           "non_null": 3,
001534:           "coverage_ratio": 1.0,
001535:           "types": {
001536:             "float": 3
001537:           },
001538:           "examples": [
001539:             "12.5",
001540:             "7.69"
001541:           ],
001542:           "unique_count_tracked": 2,
001543:           "unique_overflow": false,
001544:           "numeric_summary": {
001545:             "count": 3.0,
001546:             "min": 7.69,
001547:             "p25": 7.69,
001548:             "p50": 12.5,
001549:             "p75": 12.5,
001550:             "max": 12.5,
001551:             "mean": 10.896666666666667
001552:           },
001553:           "string_len_avg": null,
001554:           "datetime_summary": null
001555:         },
001556:         "insights.engagement.retention_risk_pct": {
001557:           "seen": 3,
001558:           "non_null": 3,
001559:           "coverage_ratio": 1.0,
001560:           "types": {
001561:             "float": 3
001562:           },
001563:           "examples": [
001564:             "87.5",
001565:             "92.31"
001566:           ],
001567:           "unique_count_tracked": 2,
001568:           "unique_overflow": false,
001569:           "numeric_summary": {
001570:             "count": 3.0,
001571:             "min": 87.5,
001572:             "p25": 87.5,
001573:             "p50": 87.5,
001574:             "p75": 87.5,
001575:             "max": 92.31,
001576:             "mean": 89.10333333333334
001577:           },
001578:           "string_len_avg": null,
001579:           "datetime_summary": null
001580:         },
001581:         "insights.engagement.conversation_per_active_farmer": {
001582:           "seen": 3,
001583:           "non_null": 3,
001584:           "coverage_ratio": 1.0,
001585:           "types": {
001586:             "float": 3
001587:           },
001588:           "examples": [
001589:             "0.0"
001590:           ],
001591:           "unique_count_tracked": 1,
001592:           "unique_overflow": false,
001593:           "numeric_summary": {
001594:             "count": 3.0,
001595:             "min": 0.0,
001596:             "p25": 0.0,
001597:             "p50": 0.0,
001598:             "p75": 0.0,
001599:             "max": 0.0,
001600:             "mean": 0.0
001601:           },
001602:           "string_len_avg": null,
001603:           "datetime_summary": null
001604:         },
001605:         "insights.engagement.voice_sessions_window": {
001606:           "seen": 3,
001607:           "non_null": 3,
001608:           "coverage_ratio": 1.0,
001609:           "types": {
001610:             "int": 3
001611:           },
001612:           "examples": [
001613:             "0"
001614:           ],
001615:           "unique_count_tracked": 1,
001616:           "unique_overflow": false,
001617:           "numeric_summary": {
001618:             "count": 3.0,
001619:             "min": 0.0,
001620:             "p25": 0.0,
001621:             "p50": 0.0,
001622:             "p75": 0.0,
001623:             "max": 0.0,
001624:             "mean": 0.0
001625:           },
001626:           "string_len_avg": null,
001627:           "datetime_summary": null
001628:         },
001629:         "insights.operational_health": {
001630:           "seen": 3,
001631:           "non_null": 3,
001632:           "coverage_ratio": 1.0,
001633:           "types": {
001634:             "dict": 3
001635:           },
001636:           "examples": [
001637:             "{\"profile_completeness_pct\": 0.0, \"unread_notifications\": 1, \"avg_data_freshness_lag_days\": 1.95, \"top_states\": [{\"state\": \"maharashtra\", \"farmers\": 1}, {\"state\": \"punjab\", \"far...",
001638:             "{\"profile_completeness_pct\": 0.0, \"unread_notifications\": 1, \"avg_data_freshness_lag_days\": 5.65, \"top_states\": [{\"state\": \"maharashtra\", \"farmers\": 8}], \"system_health_score\": ...",
001639:             "{\"profile_completeness_pct\": 0.0, \"unread_notifications\": 0, \"avg_data_freshness_lag_days\": 5.88, \"top_states\": [{\"state\": \"maharashtra\", \"farmers\": 7}], \"system_health_score\": ..."
001640:           ],
001641:           "unique_count_tracked": 0,
001642:           "unique_overflow": false,
001643:           "numeric_summary": null,
001644:           "string_len_avg": null,
001645:           "datetime_summary": null
001646:         },
001647:         "insights.operational_health.profile_completeness_pct": {
001648:           "seen": 3,
001649:           "non_null": 3,
001650:           "coverage_ratio": 1.0,
001651:           "types": {
001652:             "float": 3
001653:           },
001654:           "examples": [
001655:             "0.0"
001656:           ],
001657:           "unique_count_tracked": 1,
001658:           "unique_overflow": false,
001659:           "numeric_summary": {
001660:             "count": 3.0,
001661:             "min": 0.0,
001662:             "p25": 0.0,
001663:             "p50": 0.0,
001664:             "p75": 0.0,
001665:             "max": 0.0,
001666:             "mean": 0.0
001667:           },
001668:           "string_len_avg": null,
001669:           "datetime_summary": null
001670:         },
001671:         "insights.operational_health.unread_notifications": {
001672:           "seen": 3,
001673:           "non_null": 3,
001674:           "coverage_ratio": 1.0,
001675:           "types": {
001676:             "int": 3
001677:           },
001678:           "examples": [
001679:             "1",
001680:             "0"
001681:           ],
001682:           "unique_count_tracked": 2,
001683:           "unique_overflow": false,
001684:           "numeric_summary": {
001685:             "count": 3.0,
001686:             "min": 0.0,
001687:             "p25": 0.0,
001688:             "p50": 1.0,
001689:             "p75": 1.0,
001690:             "max": 1.0,
001691:             "mean": 0.6666666666666666
001692:           },
001693:           "string_len_avg": null,
001694:           "datetime_summary": null
001695:         },
001696:         "insights.operational_health.avg_data_freshness_lag_days": {
001697:           "seen": 3,
001698:           "non_null": 3,
001699:           "coverage_ratio": 1.0,
001700:           "types": {
001701:             "float": 3
001702:           },
001703:           "examples": [
001704:             "1.95",
001705:             "5.65",
001706:             "5.88"
001707:           ],
001708:           "unique_count_tracked": 3,
001709:           "unique_overflow": false,
001710:           "numeric_summary": {
001711:             "count": 3.0,
001712:             "min": 1.95,
001713:             "p25": 1.95,
001714:             "p50": 5.65,
001715:             "p75": 5.65,
001716:             "max": 5.88,
001717:             "mean": 4.493333333333333
001718:           },
001719:           "string_len_avg": null,
001720:           "datetime_summary": null
001721:         },
001722:         "insights.operational_health.top_states": {
001723:           "seen": 3,
001724:           "non_null": 3,
001725:           "coverage_ratio": 1.0,
001726:           "types": {
001727:             "list": 3
001728:           },
001729:           "examples": [
001730:             "[{\"state\": \"maharashtra\", \"farmers\": 1}, {\"state\": \"punjab\", \"farmers\": 1}, {\"state\": \"uttar pradesh\", \"farmers\": 1}, {\"state\": \"karnataka\", \"farmers\": 1}, {\"state\": \"tamil nadu...",
001731:             "[{\"state\": \"maharashtra\", \"farmers\": 8}]",
001732:             "[{\"state\": \"maharashtra\", \"farmers\": 7}]"
001733:           ],
001734:           "unique_count_tracked": 0,
001735:           "unique_overflow": false,
001736:           "numeric_summary": null,
001737:           "string_len_avg": null,
001738:           "datetime_summary": null
001739:         },
001740:         "insights.operational_health.top_states[]": {
001741:           "seen": 10,
001742:           "non_null": 10,
001743:           "coverage_ratio": 3.3333,
001744:           "types": {
001745:             "dict": 10
001746:           },
001747:           "examples": [
001748:             "{\"state\": \"maharashtra\", \"farmers\": 1}",
001749:             "{\"state\": \"punjab\", \"farmers\": 1}",
001750:             "{\"state\": \"uttar pradesh\", \"farmers\": 1}",
001751:             "{\"state\": \"karnataka\", \"farmers\": 1}",
001752:             "{\"state\": \"tamil nadu\", \"farmers\": 1}"
001753:           ],
001754:           "unique_count_tracked": 0,
001755:           "unique_overflow": false,
001756:           "numeric_summary": null,
001757:           "string_len_avg": null,
001758:           "datetime_summary": null
001759:         },
001760:         "insights.operational_health.top_states[].state": {
001761:           "seen": 10,
001762:           "non_null": 10,
001763:           "coverage_ratio": 3.3333,
001764:           "types": {
001765:             "str": 10
001766:           },
001767:           "examples": [
001768:             "\"maharashtra\"",
001769:             "\"punjab\"",
001770:             "\"uttar pradesh\"",
001771:             "\"karnataka\"",
001772:             "\"tamil nadu\""
001773:           ],
001774:           "unique_count_tracked": 8,
001775:           "unique_overflow": false,
001776:           "numeric_summary": null,
001777:           "string_len_avg": 9.7,
001778:           "datetime_summary": null
001779:         },
001780:         "insights.operational_health.top_states[].farmers": {
001781:           "seen": 10,
001782:           "non_null": 10,
001783:           "coverage_ratio": 3.3333,
001784:           "types": {
001785:             "int": 10
001786:           },
001787:           "examples": [
001788:             "1",
001789:             "8",
001790:             "7"
001791:           ],
001792:           "unique_count_tracked": 3,
001793:           "unique_overflow": false,
001794:           "numeric_summary": {
001795:             "count": 10.0,
001796:             "min": 1.0,
001797:             "p25": 1.0,
001798:             "p50": 1.0,
001799:             "p75": 1.0,
001800:             "max": 8.0,
001801:             "mean": 2.3
001802:           },
001803:           "string_len_avg": null,
001804:           "datetime_summary": null
001805:         },
001806:         "insights.operational_health.system_health_score": {
001807:           "seen": 3,
001808:           "non_null": 3,
001809:           "coverage_ratio": 1.0,
001810:           "types": {
001811:             "float": 3
001812:           },
001813:           "examples": [
001814:             "31.0",
001815:             "18.67",
001816:             "16.3"
001817:           ],
001818:           "unique_count_tracked": 3,
001819:           "unique_overflow": false,
001820:           "numeric_summary": {
001821:             "count": 3.0,
001822:             "min": 16.3,
001823:             "p25": 16.3,
001824:             "p50": 18.67,
001825:             "p75": 18.67,
001826:             "max": 31.0,
001827:             "mean": 21.99
001828:           },
001829:           "string_len_avg": null,
001830:           "datetime_summary": null
001831:         },
001832:         "insights.market_intelligence": {
001833:           "seen": 3,
001834:           "non_null": 3,
001835:           "coverage_ratio": 1.0,
001836:           "types": {
001837:             "dict": 3
001838:           },
001839:           "examples": [
001840:             "{\"top_commodities\": [], \"tracked_commodities\": 0, \"records_window\": 0}"
001841:           ],
001842:           "unique_count_tracked": 0,
001843:           "unique_overflow": false,
001844:           "numeric_summary": null,
001845:           "string_len_avg": null,
001846:           "datetime_summary": null
001847:         },
001848:         "insights.market_intelligence.top_commodities": {
001849:           "seen": 3,
001850:           "non_null": 3,
001851:           "coverage_ratio": 1.0,
001852:           "types": {
001853:             "list": 3
001854:           },
001855:           "examples": [
001856:             "[]"
001857:           ],
001858:           "unique_count_tracked": 0,
001859:           "unique_overflow": false,
001860:           "numeric_summary": null,
001861:           "string_len_avg": null,
001862:           "datetime_summary": null
001863:         },
001864:         "insights.market_intelligence.top_commodities[]": {
001865:           "seen": 3,
001866:           "non_null": 0,
001867:           "coverage_ratio": 0.0,
001868:           "types": {
001869:             "null": 3
001870:           },
001871:           "examples": [],
001872:           "unique_count_tracked": 0,
001873:           "unique_overflow": false,
001874:           "numeric_summary": null,
001875:           "string_len_avg": null,
001876:           "datetime_summary": null
001877:         },
001878:         "insights.market_intelligence.tracked_commodities": {
001879:           "seen": 3,
001880:           "non_null": 3,
001881:           "coverage_ratio": 1.0,
001882:           "types": {
001883:             "int": 3
001884:           },
001885:           "examples": [
001886:             "0"
001887:           ],
001888:           "unique_count_tracked": 1,
001889:           "unique_overflow": false,
001890:           "numeric_summary": {
001891:             "count": 3.0,
001892:             "min": 0.0,
001893:             "p25": 0.0,
001894:             "p50": 0.0,
001895:             "p75": 0.0,
001896:             "max": 0.0,
001897:             "mean": 0.0
001898:           },
001899:           "string_len_avg": null,
001900:           "datetime_summary": null
001901:         },
001902:         "insights.market_intelligence.records_window": {
001903:           "seen": 3,
001904:           "non_null": 3,
001905:           "coverage_ratio": 1.0,
001906:           "types": {
001907:             "int": 3
001908:           },
001909:           "examples": [
001910:             "0"
001911:           ],
001912:           "unique_count_tracked": 1,
001913:           "unique_overflow": false,
001914:           "numeric_summary": {
001915:             "count": 3.0,
001916:             "min": 0.0,
001917:             "p25": 0.0,
001918:             "p50": 0.0,
001919:             "p75": 0.0,
001920:             "max": 0.0,
001921:             "mean": 0.0
001922:           },
001923:           "string_len_avg": null,
001924:           "datetime_summary": null
001925:         },
001926:         "insights.opportunities": {
001927:           "seen": 3,
001928:           "non_null": 3,
001929:           "coverage_ratio": 1.0,
001930:           "types": {
001931:             "dict": 3
001932:           },
001933:           "examples": [
001934:             "{\"farmers_without_crops\": 0, \"inactive_farmers\": 7, \"district_coverage_gaps\": 0}",
001935:             "{\"farmers_without_crops\": 5, \"inactive_farmers\": 12, \"district_coverage_gaps\": 6}"
001936:           ],
001937:           "unique_count_tracked": 0,
001938:           "unique_overflow": false,
001939:           "numeric_summary": null,
001940:           "string_len_avg": null,
001941:           "datetime_summary": null
001942:         },
001943:         "insights.opportunities.farmers_without_crops": {
001944:           "seen": 3,
001945:           "non_null": 3,
001946:           "coverage_ratio": 1.0,
001947:           "types": {
001948:             "int": 3
001949:           },
001950:           "examples": [
001951:             "0",
001952:             "5"
001953:           ],
001954:           "unique_count_tracked": 2,
001955:           "unique_overflow": false,
001956:           "numeric_summary": {
001957:             "count": 3.0,
001958:             "min": 0.0,
001959:             "p25": 0.0,
001960:             "p50": 0.0,
001961:             "p75": 0.0,
001962:             "max": 5.0,
001963:             "mean": 1.6666666666666667
001964:           },
001965:           "string_len_avg": null,
001966:           "datetime_summary": null
001967:         },
001968:         "insights.opportunities.inactive_farmers": {
001969:           "seen": 3,
001970:           "non_null": 3,
001971:           "coverage_ratio": 1.0,
001972:           "types": {
001973:             "int": 3
001974:           },
001975:           "examples": [
001976:             "7",
001977:             "12"
001978:           ],
001979:           "unique_count_tracked": 2,
001980:           "unique_overflow": false,
001981:           "numeric_summary": {
001982:             "count": 3.0,
001983:             "min": 7.0,
001984:             "p25": 7.0,
001985:             "p50": 7.0,
001986:             "p75": 7.0,
001987:             "max": 12.0,
001988:             "mean": 8.666666666666666
001989:           },
001990:           "string_len_avg": null,
001991:           "datetime_summary": null
001992:         },
001993:         "insights.opportunities.district_coverage_gaps": {
001994:           "seen": 3,
001995:           "non_null": 3,
001996:           "coverage_ratio": 1.0,
001997:           "types": {
001998:             "int": 3
001999:           },
002000:           "examples": [
002001:             "0",
002002:             "6"
002003:           ],
002004:           "unique_count_tracked": 2,
002005:           "unique_overflow": false,
002006:           "numeric_summary": {
002007:             "count": 3.0,
002008:             "min": 0.0,
002009:             "p25": 0.0,
002010:             "p50": 0.0,
002011:             "p75": 0.0,
002012:             "max": 6.0,
002013:             "mean": 2.0
002014:           },
002015:           "string_len_avg": null,
002016:           "datetime_summary": null
002017:         },
002018:         "insights.recommendations": {
002019:           "seen": 3,
002020:           "non_null": 3,
002021:           "coverage_ratio": 1.0,
002022:           "types": {
002023:             "list": 3
002024:           },
002025:           "examples": [
002026:             "[\"Run a 14-day onboarding nudging campaign for new farmers to improve activation.\", \"Prioritize at-risk farmers with targeted notifications and local language outreach.\", \"Launc..."
002027:           ],
002028:           "unique_count_tracked": 0,
002029:           "unique_overflow": false,
002030:           "numeric_summary": null,
002031:           "string_len_avg": null,
002032:           "datetime_summary": null
002033:         },
002034:         "insights.recommendations[]": {
002035:           "seen": 10,
002036:           "non_null": 10,
002037:           "coverage_ratio": 3.3333,
002038:           "types": {
002039:             "str": 10
002040:           },
002041:           "examples": [
002042:             "\"Run a 14-day onboarding nudging campaign for new farmers to improve activation.\"",
002043:             "\"Prioritize at-risk farmers with targeted notifications and local language outreach.\"",
002044:             "\"Launch profile completion prompts; missing profile data is blocking insight precision.\"",
002045:             "\"Promote crop setup flows to farmers with zero crop records to boost downstream engagement.\""
002046:           ],
002047:           "unique_count_tracked": 4,
002048:           "unique_overflow": false,
002049:           "numeric_summary": null,
002050:           "string_len_avg": 83.4,
002051:           "datetime_summary": null
002052:         },
002053:         "generated_at": {
002054:           "seen": 3,
002055:           "non_null": 3,
002056:           "coverage_ratio": 1.0,
002057:           "types": {
002058:             "str": 3
002059:           },
002060:           "examples": [
002061:             "\"2026-03-26T22:39:27.801871+00:00\"",
002062:             "\"2026-03-30T15:19:00.617884+00:00\"",
002063:             "\"2026-04-01T20:16:25.586995+00:00\""
002064:           ],
002065:           "unique_count_tracked": 3,
002066:           "unique_overflow": false,
002067:           "numeric_summary": null,
002068:           "string_len_avg": 32.0,
002069:           "datetime_summary": {
002070:             "min": "2026-03-26T22:39:27.801871+00:00",
002071:             "max": "2026-04-01T20:16:25.586995+00:00",
002072:             "span_days": 5
002073:           }
002074:         }
002075:       },
002076:       "likely_time_fields": [
002077:         "date",
002078:         "insights.generated_at",
002079:         "insights.growth_trends.farmers[].date",
002080:         "insights.growth_trends.conversations[].date",
002081:         "insights.growth_trends.bookings[].date",
002082:         "generated_at"
002083:       ],
002084:       "quality_findings": [
002085:         "High sparsity: 1 fields under 20% coverage"
002086:       ]
002087:     },
002088:     {
002089:       "collection": "app_config",
002090:       "total_docs": 1,
002091:       "sampled_docs": 1,
002092:       "indexes": [
002093:         {
002094:           "name": "_id_",
002095:           "keys": {
002096:             "_id": 1
002097:           },
002098:           "unique": false
002099:         }
002100:       ],
002101:       "fields": {
002102:         "_id": {
002103:           "seen": 1,
002104:           "non_null": 1,
002105:           "coverage_ratio": 1.0,
002106:           "types": {
002107:             "str": 1
002108:           },
002109:           "examples": [
002110:             "\"global\""
002111:           ],
002112:           "unique_count_tracked": 1,
002113:           "unique_overflow": false,
002114:           "numeric_summary": null,
002115:           "string_len_avg": 6.0,
002116:           "datetime_summary": null
002117:         },
002118:         "agent_enabled": {
002119:           "seen": 1,
002120:           "non_null": 1,
002121:           "coverage_ratio": 1.0,
002122:           "types": {
002123:             "bool": 1
002124:           },
002125:           "examples": [
002126:             "true"
002127:           ],
002128:           "unique_count_tracked": 1,
002129:           "unique_overflow": false,
002130:           "numeric_summary": null,
002131:           "string_len_avg": null,
002132:           "datetime_summary": null
002133:         },
002134:         "data_gov_api_keys": {
002135:           "seen": 1,
002136:           "non_null": 1,
002137:           "coverage_ratio": 1.0,
002138:           "types": {
002139:             "list": 1
002140:           },
002141:           "examples": [
002142:             "[]"
002143:           ],
002144:           "unique_count_tracked": 0,
002145:           "unique_overflow": false,
002146:           "numeric_summary": null,
002147:           "string_len_avg": null,
002148:           "datetime_summary": null
002149:         },
002150:         "data_gov_api_keys[]": {
002151:           "seen": 1,
002152:           "non_null": 0,
002153:           "coverage_ratio": 0.0,
002154:           "types": {
002155:             "null": 1
002156:           },
002157:           "examples": [],
002158:           "unique_count_tracked": 0,
002159:           "unique_overflow": false,
002160:           "numeric_summary": null,
002161:           "string_len_avg": null,
002162:           "datetime_summary": null
002163:         },
002164:         "feature_flags": {
002165:           "seen": 1,
002166:           "non_null": 1,
002167:           "coverage_ratio": 1.0,
002168:           "types": {
002169:             "dict": 1
002170:           },
002171:           "examples": [
002172:             "{\"schemes_search\": true, \"voice_streaming\": true, \"price_alerts\": true, \"admin_dashboard\": true}"
002173:           ],
002174:           "unique_count_tracked": 0,
002175:           "unique_overflow": false,
002176:           "numeric_summary": null,
002177:           "string_len_avg": null,
002178:           "datetime_summary": null
002179:         },
002180:         "feature_flags.schemes_search": {
002181:           "seen": 1,
002182:           "non_null": 1,
002183:           "coverage_ratio": 1.0,
002184:           "types": {
002185:             "bool": 1
002186:           },
002187:           "examples": [
002188:             "true"
002189:           ],
002190:           "unique_count_tracked": 1,
002191:           "unique_overflow": false,
002192:           "numeric_summary": null,
002193:           "string_len_avg": null,
002194:           "datetime_summary": null
002195:         },
002196:         "feature_flags.voice_streaming": {
002197:           "seen": 1,
002198:           "non_null": 1,
002199:           "coverage_ratio": 1.0,
002200:           "types": {
002201:             "bool": 1
002202:           },
002203:           "examples": [
002204:             "true"
002205:           ],
002206:           "unique_count_tracked": 1,
002207:           "unique_overflow": false,
002208:           "numeric_summary": null,
002209:           "string_len_avg": null,
002210:           "datetime_summary": null
002211:         },
002212:         "feature_flags.price_alerts": {
002213:           "seen": 1,
002214:           "non_null": 1,
002215:           "coverage_ratio": 1.0,
002216:           "types": {
002217:             "bool": 1
002218:           },
002219:           "examples": [
002220:             "true"
002221:           ],
002222:           "unique_count_tracked": 1,
002223:           "unique_overflow": false,
002224:           "numeric_summary": null,
002225:           "string_len_avg": null,
002226:           "datetime_summary": null
002227:         },
002228:         "feature_flags.admin_dashboard": {
002229:           "seen": 1,
002230:           "non_null": 1,
002231:           "coverage_ratio": 1.0,
002232:           "types": {
002233:             "bool": 1
002234:           },
002235:           "examples": [
002236:             "true"
002237:           ],
002238:           "unique_count_tracked": 1,
002239:           "unique_overflow": false,
002240:           "numeric_summary": null,
002241:           "string_len_avg": null,
002242:           "datetime_summary": null
002243:         },
002244:         "maintenance_mode": {
002245:           "seen": 1,
002246:           "non_null": 1,
002247:           "coverage_ratio": 1.0,
002248:           "types": {
002249:             "bool": 1
002250:           },
002251:           "examples": [
002252:             "false"
002253:           ],
002254:           "unique_count_tracked": 1,
002255:           "unique_overflow": false,
002256:           "numeric_summary": null,
002257:           "string_len_avg": null,
002258:           "datetime_summary": null
002259:         },
002260:         "max_price_alert_per_user": {
002261:           "seen": 1,
002262:           "non_null": 1,
002263:           "coverage_ratio": 1.0,
002264:           "types": {
002265:             "int": 1
002266:           },
002267:           "examples": [
002268:             "10"
002269:           ],
002270:           "unique_count_tracked": 1,
002271:           "unique_overflow": false,
002272:           "numeric_summary": {
002273:             "count": 1.0,
002274:             "min": 10.0,
002275:             "p25": 10.0,
002276:             "p50": 10.0,
002277:             "p75": 10.0,
002278:             "max": 10.0,
002279:             "mean": 10.0
002280:           },
002281:           "string_len_avg": null,
002282:           "datetime_summary": null
002283:         },
002284:         "updated_at": {
002285:           "seen": 1,
002286:           "non_null": 1,
002287:           "coverage_ratio": 1.0,
002288:           "types": {
002289:             "str": 1
002290:           },
002291:           "examples": [
002292:             "\"2026-03-24T21:00:25.151136+00:00\""
002293:           ],
002294:           "unique_count_tracked": 1,
002295:           "unique_overflow": false,
002296:           "numeric_summary": null,
002297:           "string_len_avg": 32.0,
002298:           "datetime_summary": {
002299:             "min": "2026-03-24T21:00:25.151136+00:00",
002300:             "max": "2026-03-24T21:00:25.151136+00:00",
002301:             "span_days": 0
002302:           }
002303:         },
002304:         "updated_by": {
002305:           "seen": 1,
002306:           "non_null": 1,
002307:           "coverage_ratio": 1.0,
002308:           "types": {
002309:             "str": 1
002310:           },
002311:           "examples": [
002312:             "\"seed_script\""
002313:           ],
002314:           "unique_count_tracked": 1,
002315:           "unique_overflow": false,
002316:           "numeric_summary": null,
002317:           "string_len_avg": 11.0,
002318:           "datetime_summary": null
002319:         },
002320:         "voice_enabled": {
002321:           "seen": 1,
002322:           "non_null": 1,
002323:           "coverage_ratio": 1.0,
002324:           "types": {
002325:             "bool": 1
002326:           },
002327:           "examples": [
002328:             "true"
002329:           ],
002330:           "unique_count_tracked": 1,
002331:           "unique_overflow": false,
002332:           "numeric_summary": null,
002333:           "string_len_avg": null,
002334:           "datetime_summary": null
002335:         }
002336:       },
002337:       "likely_time_fields": [
002338:         "updated_at",
002339:         "updated_by"
002340:       ],
002341:       "quality_findings": [
002342:         "High sparsity: 1 fields under 20% coverage",
002343:         "updated_at span: 0 days"
002344:       ]
002345:     },
002346:     {
002347:       "collection": "calendar_action_logs",
002348:       "total_docs": 13,
002349:       "sampled_docs": 13,
002350:       "indexes": [
002351:         {
002352:           "name": "_id_",
002353:           "keys": {
002354:             "_id": 1
002355:           },
002356:           "unique": false
002357:         }
002358:       ],
002359:       "fields": {
002360:         "_id": {
002361:           "seen": 13,
002362:           "non_null": 13,
002363:           "coverage_ratio": 1.0,
002364:           "types": {
002365:             "str": 13
002366:           },
002367:           "examples": [
002368:             "\"83a5bb5ff6f54224a22488386011db27\"",
002369:             "\"b5a15bebf2fc4e15b97fdf089513c4d7\"",
002370:             "\"77969ec2e83a42eab88cab5f7a0e5338\"",
002371:             "\"6fdfc28941c3464680f5edede33c5a76\"",
002372:             "\"d142a9dc9a374774b87c8c91bc6615d0\""
002373:           ],
002374:           "unique_count_tracked": 13,
002375:           "unique_overflow": false,
002376:           "numeric_summary": null,
002377:           "string_len_avg": 32.0,
002378:           "datetime_summary": null
002379:         },
002380:         "user_id": {
002381:           "seen": 13,
002382:           "non_null": 13,
002383:           "coverage_ratio": 1.0,
002384:           "types": {
002385:             "str": 13
002386:           },
002387:           "examples": [
002388:             "\"seed_farmer_01\""
002389:           ],
002390:           "unique_count_tracked": 1,
002391:           "unique_overflow": false,
002392:           "numeric_summary": null,
002393:           "string_len_avg": 14.0,
002394:           "datetime_summary": null
002395:         },
002396:         "action_type": {
002397:           "seen": 13,
002398:           "non_null": 13,
002399:           "coverage_ratio": 1.0,
002400:           "types": {
002401:             "str": 13
002402:           },
002403:           "examples": [
002404:             "\"batch_create\"",
002405:             "\"update\"",
002406:             "\"delete\""
002407:           ],
002408:           "unique_count_tracked": 3,
002409:           "unique_overflow": false,
002410:           "numeric_summary": null,
002411:           "string_len_avg": 10.15,
002412:           "datetime_summary": null
002413:         },
002414:         "payload": {
002415:           "seen": 13,
002416:           "non_null": 13,
002417:           "coverage_ratio": 1.0,
002418:           "types": {
002419:             "dict": 13
002420:           },
002421:           "examples": [
002422:             "{\"event_ids\": [\"f50fc03a3b104825a958ddd5f2530498\", \"bc8227f6b53a4a4cbc379fe27579a375\"], \"request_text\": \"Please schedule and verify these events in my calendar: 2026-04-12 06:30...",
002423:             "{\"before\": {\"id\": \"f50fc03a3b104825a958ddd5f2530498\", \"title\": \"E2E Calendar Task One\", \"event_date\": \"2026-04-12\", \"event_time\": \"06:30\", \"status\": \"planned\", \"details\": \"Sched...",
002424:             "{\"deleted\": {\"id\": \"bc8227f6b53a4a4cbc379fe27579a375\", \"user_id\": \"seed_farmer_01\", \"title\": \"E2E Calendar Task Two.\", \"details\": \"Scheduled from chat request\", \"event_date\": \"2...",
002425:             "{\"event_ids\": [\"af1536e6664a40e7bfaea3f210a6d4c4\", \"20d64fbbb4ae4d88b77845ae938c7776\"], \"request_text\": \"Please schedule and verify these events in my calendar: 2026-04-12 06:30...",
002426:             "{\"event_ids\": [\"f1a4b88b632a4952ba3d4af595e66726\", \"79e4cb7a65b94d44908ab69c71eee6f9\"], \"request_text\": \"Please schedule and verify these events in my calendar: 2026-04-12 06:30..."
002427:           ],
002428:           "unique_count_tracked": 0,
002429:           "unique_overflow": false,
002430:           "numeric_summary": null,
002431:           "string_len_avg": null,
002432:           "datetime_summary": null
002433:         },
002434:         "payload.event_ids": {
002435:           "seen": 9,
002436:           "non_null": 9,
002437:           "coverage_ratio": 0.6923,
002438:           "types": {
002439:             "list": 9
002440:           },
002441:           "examples": [
002442:             "[\"f50fc03a3b104825a958ddd5f2530498\", \"bc8227f6b53a4a4cbc379fe27579a375\"]",
002443:             "[\"af1536e6664a40e7bfaea3f210a6d4c4\", \"20d64fbbb4ae4d88b77845ae938c7776\"]",
002444:             "[\"f1a4b88b632a4952ba3d4af595e66726\", \"79e4cb7a65b94d44908ab69c71eee6f9\"]",
002445:             "[\"bd1bf9f0733d4b1aac7323d094b4d5f5\", \"810235c3739c484a9940bb8c1b09343d\"]",
002446:             "[\"b4ff0f23daf5404988c1dd6d6c769765\", \"4dbdfa068a2840c2af1cac18f0cf44f4\"]"
002447:           ],
002448:           "unique_count_tracked": 0,
002449:           "unique_overflow": false,
002450:           "numeric_summary": null,
002451:           "string_len_avg": null,
002452:           "datetime_summary": null
002453:         },
002454:         "payload.event_ids[]": {
002455:           "seen": 15,
002456:           "non_null": 15,
002457:           "coverage_ratio": 1.1538,
002458:           "types": {
002459:             "str": 15
002460:           },
002461:           "examples": [
002462:             "\"f50fc03a3b104825a958ddd5f2530498\"",
002463:             "\"bc8227f6b53a4a4cbc379fe27579a375\"",
002464:             "\"af1536e6664a40e7bfaea3f210a6d4c4\"",
002465:             "\"20d64fbbb4ae4d88b77845ae938c7776\"",
002466:             "\"f1a4b88b632a4952ba3d4af595e66726\""
002467:           ],
002468:           "unique_count_tracked": 15,
002469:           "unique_overflow": false,
002470:           "numeric_summary": null,
002471:           "string_len_avg": 32.0,
002472:           "datetime_summary": null
002473:         },
002474:         "payload.request_text": {
002475:           "seen": 9,
002476:           "non_null": 9,
002477:           "coverage_ratio": 0.6923,
002478:           "types": {
002479:             "str": 9
002480:           },
002481:           "examples": [
002482:             "\"Please schedule and verify these events in my calendar: 2026-04-12 06:30 - E2E Calendar Task One; 2026-04-12 17:00 - E2E Calendar Task Two. Also provide weather risk, tomato pr...",
002483:             "\"Schedule tomato spray reminder tomorrow at 7 a.m. and also suggest best subsidy for sprayer rental.\"",
002484:             "\"Is there any event scheduled in my calendar today?\"",
002485:             "\"Give one concise daily farming recommendation in 1-2 sentences for calendar planning. Upcoming tasks: Calendar tasks scheduled on Apr 03 at 9:00 AM; Calendar task scheduled on ..."
002486:           ],
002487:           "unique_count_tracked": 4,
002488:           "unique_overflow": false,
002489:           "numeric_summary": null,
002490:           "string_len_avg": 189.33,
002491:           "datetime_summary": null
002492:         },
002493:         "created_at": {
002494:           "seen": 13,
002495:           "non_null": 13,
002496:           "coverage_ratio": 1.0,
002497:           "types": {
002498:             "str": 13
002499:           },
002500:           "examples": [
002501:             "\"2026-04-02T19:38:38.946159+00:00\"",
002502:             "\"2026-04-02T19:39:20.218435+00:00\"",
002503:             "\"2026-04-02T19:39:22.806800+00:00\"",
002504:             "\"2026-04-02T19:52:36.804615+00:00\"",
002505:             "\"2026-04-02T19:54:15.140869+00:00\""
002506:           ],
002507:           "unique_count_tracked": 13,
002508:           "unique_overflow": false,
002509:           "numeric_summary": null,
002510:           "string_len_avg": 32.0,
002511:           "datetime_summary": {
002512:             "min": "2026-04-02T19:38:38.946159+00:00",
002513:             "max": "2026-04-07T07:37:24.558511+00:00",
002514:             "span_days": 4
002515:           }
002516:         },
002517:         "undone": {
002518:           "seen": 13,
002519:           "non_null": 13,
002520:           "coverage_ratio": 1.0,
002521:           "types": {
002522:             "bool": 13
002523:           },
002524:           "examples": [
002525:             "false",
002526:             "true"
002527:           ],
002528:           "unique_count_tracked": 2,
002529:           "unique_overflow": false,
002530:           "numeric_summary": null,
002531:           "string_len_avg": null,
002532:           "datetime_summary": null
002533:         },
002534:         "payload.before": {
002535:           "seen": 2,
002536:           "non_null": 2,
002537:           "coverage_ratio": 0.1538,
002538:           "types": {
002539:             "dict": 2
002540:           },
002541:           "examples": [
002542:             "{\"id\": \"f50fc03a3b104825a958ddd5f2530498\", \"title\": \"E2E Calendar Task One\", \"event_date\": \"2026-04-12\", \"event_time\": \"06:30\", \"status\": \"planned\", \"details\": \"Scheduled from c...",
002543:             "{\"id\": \"9b6f78b49b63497db5348d4ee08e696c\", \"title\": \"E2E Calendar Task One\", \"event_date\": \"2026-04-12\", \"event_time\": \"06:30\", \"status\": \"planned\", \"details\": \"Scheduled from c..."
002544:           ],
002545:           "unique_count_tracked": 0,
002546:           "unique_overflow": false,
002547:           "numeric_summary": null,
002548:           "string_len_avg": null,
002549:           "datetime_summary": null
002550:         },
002551:         "payload.before.id": {
002552:           "seen": 2,
002553:           "non_null": 2,
002554:           "coverage_ratio": 0.1538,
002555:           "types": {
002556:             "str": 2
002557:           },
002558:           "examples": [
002559:             "\"f50fc03a3b104825a958ddd5f2530498\"",
002560:             "\"9b6f78b49b63497db5348d4ee08e696c\""
002561:           ],
002562:           "unique_count_tracked": 2,
002563:           "unique_overflow": false,
002564:           "numeric_summary": null,
002565:           "string_len_avg": 32.0,
002566:           "datetime_summary": null
002567:         },
002568:         "payload.before.title": {
002569:           "seen": 2,
002570:           "non_null": 2,
002571:           "coverage_ratio": 0.1538,
002572:           "types": {
002573:             "str": 2
002574:           },
002575:           "examples": [
002576:             "\"E2E Calendar Task One\""
002577:           ],
002578:           "unique_count_tracked": 1,
002579:           "unique_overflow": false,
002580:           "numeric_summary": null,
002581:           "string_len_avg": 21.0,
002582:           "datetime_summary": null
002583:         },
002584:         "payload.before.event_date": {
002585:           "seen": 2,
002586:           "non_null": 2,
002587:           "coverage_ratio": 0.1538,
002588:           "types": {
002589:             "str": 2
002590:           },
002591:           "examples": [
002592:             "\"2026-04-12\""
002593:           ],
002594:           "unique_count_tracked": 1,
002595:           "unique_overflow": false,
002596:           "numeric_summary": null,
002597:           "string_len_avg": 10.0,
002598:           "datetime_summary": {
002599:             "min": "2026-04-12T00:00:00+00:00",
002600:             "max": "2026-04-12T00:00:00+00:00",
002601:             "span_days": 0
002602:           }
002603:         },
002604:         "payload.before.event_time": {
002605:           "seen": 2,
002606:           "non_null": 2,
002607:           "coverage_ratio": 0.1538,
002608:           "types": {
002609:             "str": 2
002610:           },
002611:           "examples": [
002612:             "\"06:30\""
002613:           ],
002614:           "unique_count_tracked": 1,
002615:           "unique_overflow": false,
002616:           "numeric_summary": null,
002617:           "string_len_avg": 5.0,
002618:           "datetime_summary": null
002619:         },
002620:         "payload.before.status": {
002621:           "seen": 2,
002622:           "non_null": 2,
002623:           "coverage_ratio": 0.1538,
002624:           "types": {
002625:             "str": 2
002626:           },
002627:           "examples": [
002628:             "\"planned\""
002629:           ],
002630:           "unique_count_tracked": 1,
002631:           "unique_overflow": false,
002632:           "numeric_summary": null,
002633:           "string_len_avg": 7.0,
002634:           "datetime_summary": null
002635:         },
002636:         "payload.before.details": {
002637:           "seen": 2,
002638:           "non_null": 2,
002639:           "coverage_ratio": 0.1538,
002640:           "types": {
002641:             "str": 2
002642:           },
002643:           "examples": [
002644:             "\"Scheduled from chat request\""
002645:           ],
002646:           "unique_count_tracked": 1,
002647:           "unique_overflow": false,
002648:           "numeric_summary": null,
002649:           "string_len_avg": 27.0,
002650:           "datetime_summary": null
002651:         },
002652:         "payload.after": {
002653:           "seen": 2,
002654:           "non_null": 2,
002655:           "coverage_ratio": 0.1538,
002656:           "types": {
002657:             "dict": 2
002658:           },
002659:           "examples": [
002660:             "{\"id\": \"f50fc03a3b104825a958ddd5f2530498\", \"title\": \"E2E Calendar Task One\", \"event_date\": \"2026-04-12\", \"event_time\": \"07:10\", \"status\": \"planned\"}",
002661:             "{\"id\": \"9b6f78b49b63497db5348d4ee08e696c\", \"title\": \"E2E Calendar Task One\", \"event_date\": \"2026-04-12\", \"event_time\": \"07:10\", \"status\": \"planned\"}"
002662:           ],
002663:           "unique_count_tracked": 0,
002664:           "unique_overflow": false,
002665:           "numeric_summary": null,
002666:           "string_len_avg": null,
002667:           "datetime_summary": null
002668:         },
002669:         "payload.after.id": {
002670:           "seen": 2,
002671:           "non_null": 2,
002672:           "coverage_ratio": 0.1538,
002673:           "types": {
002674:             "str": 2
002675:           },
002676:           "examples": [
002677:             "\"f50fc03a3b104825a958ddd5f2530498\"",
002678:             "\"9b6f78b49b63497db5348d4ee08e696c\""
002679:           ],
002680:           "unique_count_tracked": 2,
002681:           "unique_overflow": false,
002682:           "numeric_summary": null,
002683:           "string_len_avg": 32.0,
002684:           "datetime_summary": null
002685:         },
002686:         "payload.after.title": {
002687:           "seen": 2,
002688:           "non_null": 2,
002689:           "coverage_ratio": 0.1538,
002690:           "types": {
002691:             "str": 2
002692:           },
002693:           "examples": [
002694:             "\"E2E Calendar Task One\""
002695:           ],
002696:           "unique_count_tracked": 1,
002697:           "unique_overflow": false,
002698:           "numeric_summary": null,
002699:           "string_len_avg": 21.0,
002700:           "datetime_summary": null
002701:         },
002702:         "payload.after.event_date": {
002703:           "seen": 2,
002704:           "non_null": 2,
002705:           "coverage_ratio": 0.1538,
002706:           "types": {
002707:             "str": 2
002708:           },
002709:           "examples": [
002710:             "\"2026-04-12\""
002711:           ],
002712:           "unique_count_tracked": 1,
002713:           "unique_overflow": false,
002714:           "numeric_summary": null,
002715:           "string_len_avg": 10.0,
002716:           "datetime_summary": {
002717:             "min": "2026-04-12T00:00:00+00:00",
002718:             "max": "2026-04-12T00:00:00+00:00",
002719:             "span_days": 0
002720:           }
002721:         },
002722:         "payload.after.event_time": {
002723:           "seen": 2,
002724:           "non_null": 2,
002725:           "coverage_ratio": 0.1538,
002726:           "types": {
002727:             "str": 2
002728:           },
002729:           "examples": [
002730:             "\"07:10\""
002731:           ],
002732:           "unique_count_tracked": 1,
002733:           "unique_overflow": false,
002734:           "numeric_summary": null,
002735:           "string_len_avg": 5.0,
002736:           "datetime_summary": null
002737:         },
002738:         "payload.after.status": {
002739:           "seen": 2,
002740:           "non_null": 2,
002741:           "coverage_ratio": 0.1538,
002742:           "types": {
002743:             "str": 2
002744:           },
002745:           "examples": [
002746:             "\"planned\""
002747:           ],
002748:           "unique_count_tracked": 1,
002749:           "unique_overflow": false,
002750:           "numeric_summary": null,
002751:           "string_len_avg": 7.0,
002752:           "datetime_summary": null
002753:         },
002754:         "payload.deleted": {
002755:           "seen": 2,
002756:           "non_null": 2,
002757:           "coverage_ratio": 0.1538,
002758:           "types": {
002759:             "dict": 2
002760:           },
002761:           "examples": [
002762:             "{\"id\": \"bc8227f6b53a4a4cbc379fe27579a375\", \"user_id\": \"seed_farmer_01\", \"title\": \"E2E Calendar Task Two.\", \"details\": \"Scheduled from chat request\", \"event_date\": \"2026-04-12\", ...",
002763:             "{\"id\": \"9a182ee6f9074808bcb3031f9f8ecc84\", \"user_id\": \"seed_farmer_01\", \"title\": \"E2E Calendar Task Two.\", \"details\": \"Scheduled from chat request\", \"event_date\": \"2026-04-12\", ..."
002764:           ],
002765:           "unique_count_tracked": 0,
002766:           "unique_overflow": false,
002767:           "numeric_summary": null,
002768:           "string_len_avg": null,
002769:           "datetime_summary": null
002770:         },
002771:         "payload.deleted.id": {
002772:           "seen": 2,
002773:           "non_null": 2,
002774:           "coverage_ratio": 0.1538,
002775:           "types": {
002776:             "str": 2
002777:           },
002778:           "examples": [
002779:             "\"bc8227f6b53a4a4cbc379fe27579a375\"",
002780:             "\"9a182ee6f9074808bcb3031f9f8ecc84\""
002781:           ],
002782:           "unique_count_tracked": 2,
002783:           "unique_overflow": false,
002784:           "numeric_summary": null,
002785:           "string_len_avg": 32.0,
002786:           "datetime_summary": null
002787:         },
002788:         "payload.deleted.user_id": {
002789:           "seen": 2,
002790:           "non_null": 2,
002791:           "coverage_ratio": 0.1538,
002792:           "types": {
002793:             "str": 2
002794:           },
002795:           "examples": [
002796:             "\"seed_farmer_01\""
002797:           ],
002798:           "unique_count_tracked": 1,
002799:           "unique_overflow": false,
002800:           "numeric_summary": null,
002801:           "string_len_avg": 14.0,
002802:           "datetime_summary": null
002803:         },
002804:         "payload.deleted.title": {
002805:           "seen": 2,
002806:           "non_null": 2,
002807:           "coverage_ratio": 0.1538,
002808:           "types": {
002809:             "str": 2
002810:           },
002811:           "examples": [
002812:             "\"E2E Calendar Task Two.\""
002813:           ],
002814:           "unique_count_tracked": 1,
002815:           "unique_overflow": false,
002816:           "numeric_summary": null,
002817:           "string_len_avg": 22.0,
002818:           "datetime_summary": null
002819:         },
002820:         "payload.deleted.details": {
002821:           "seen": 2,
002822:           "non_null": 2,
002823:           "coverage_ratio": 0.1538,
002824:           "types": {
002825:             "str": 2
002826:           },
002827:           "examples": [
002828:             "\"Scheduled from chat request\""
002829:           ],
002830:           "unique_count_tracked": 1,
002831:           "unique_overflow": false,
002832:           "numeric_summary": null,
002833:           "string_len_avg": 27.0,
002834:           "datetime_summary": null
002835:         },
002836:         "payload.deleted.event_date": {
002837:           "seen": 2,
002838:           "non_null": 2,
002839:           "coverage_ratio": 0.1538,
002840:           "types": {
002841:             "str": 2
002842:           },
002843:           "examples": [
002844:             "\"2026-04-12\""
002845:           ],
002846:           "unique_count_tracked": 1,
002847:           "unique_overflow": false,
002848:           "numeric_summary": null,
002849:           "string_len_avg": 10.0,
002850:           "datetime_summary": {
002851:             "min": "2026-04-12T00:00:00+00:00",
002852:             "max": "2026-04-12T00:00:00+00:00",
002853:             "span_days": 0
002854:           }
002855:         },
002856:         "payload.deleted.event_time": {
002857:           "seen": 2,
002858:           "non_null": 2,
002859:           "coverage_ratio": 0.1538,
002860:           "types": {
002861:             "str": 2
002862:           },
002863:           "examples": [
002864:             "\"17:00\""
002865:           ],
002866:           "unique_count_tracked": 1,
002867:           "unique_overflow": false,
002868:           "numeric_summary": null,
002869:           "string_len_avg": 5.0,
002870:           "datetime_summary": null
002871:         },
002872:         "payload.deleted.status": {
002873:           "seen": 2,
002874:           "non_null": 2,
002875:           "coverage_ratio": 0.1538,
002876:           "types": {
002877:             "str": 2
002878:           },
002879:           "examples": [
002880:             "\"planned\""
002881:           ],
002882:           "unique_count_tracked": 1,
002883:           "unique_overflow": false,
002884:           "numeric_summary": null,
002885:           "string_len_avg": 7.0,
002886:           "datetime_summary": null
002887:         },
002888:         "payload.deleted.source": {
002889:           "seen": 2,
002890:           "non_null": 2,
002891:           "coverage_ratio": 0.1538,
002892:           "types": {
002893:             "str": 2
002894:           },
002895:           "examples": [
002896:             "\"agent_chat\""
002897:           ],
002898:           "unique_count_tracked": 1,
002899:           "unique_overflow": false,
002900:           "numeric_summary": null,
002901:           "string_len_avg": 10.0,
002902:           "datetime_summary": null
002903:         },
002904:         "payload.deleted.metadata": {
002905:           "seen": 2,
002906:           "non_null": 2,
002907:           "coverage_ratio": 0.1538,
002908:           "types": {
002909:             "dict": 2
002910:           },
002911:           "examples": [
002912:             "{\"request_text\": \"Please schedule and verify these events in my calendar: 2026-04-12 06:30 - E2E Calendar Task One; 2026-04-12 17:00 - E2E Calendar Task Two. Also provide weathe..."
002913:           ],
002914:           "unique_count_tracked": 0,
002915:           "unique_overflow": false,
002916:           "numeric_summary": null,
002917:           "string_len_avg": null,
002918:           "datetime_summary": null
002919:         },
002920:         "payload.deleted.metadata.request_text": {
002921:           "seen": 2,
002922:           "non_null": 2,
002923:           "coverage_ratio": 0.1538,
002924:           "types": {
002925:             "str": 2
002926:           },
002927:           "examples": [
002928:             "\"Please schedule and verify these events in my calendar: 2026-04-12 06:30 - E2E Calendar Task One; 2026-04-12 17:00 - E2E Calendar Task Two. Also provide weather risk, tomato pr..."
002929:           ],
002930:           "unique_count_tracked": 1,
002931:           "unique_overflow": false,
002932:           "numeric_summary": null,
002933:           "string_len_avg": 219.0,
002934:           "datetime_summary": null
002935:         },
002936:         "payload.deleted.metadata.route_context": {
002937:           "seen": 2,
002938:           "non_null": 2,
002939:           "coverage_ratio": 0.1538,
002940:           "types": {
002941:             "dict": 2
002942:           },
002943:           "examples": [
002944:             "{\"generated_at_utc\": \"2026-04-02T19:38:38.238993+00:00\", \"market_prices\": {\"found\": true, \"source\": \"ref_mandi_prices\", \"count\": 10, \"as_of_latest_arrival_date\": \"20/03/2026\", \"...",
002945:             "{\"generated_at_utc\": \"2026-04-02T19:57:26.645161+00:00\", \"market_prices\": {\"found\": true, \"source\": \"ref_mandi_prices\", \"count\": 10, \"as_of_latest_arrival_date\": \"20/03/2026\", \"..."
002946:           ],
002947:           "unique_count_tracked": 0,
002948:           "unique_overflow": false,
002949:           "numeric_summary": null,
002950:           "string_len_avg": null,
002951:           "datetime_summary": null
002952:         },
002953:         "payload.deleted.metadata.route_context.generated_at_utc": {
002954:           "seen": 2,
002955:           "non_null": 2,
002956:           "coverage_ratio": 0.1538,
002957:           "types": {
002958:             "str": 2
002959:           },
002960:           "examples": [
002961:             "\"2026-04-02T19:38:38.238993+00:00\"",
002962:             "\"2026-04-02T19:57:26.645161+00:00\""
002963:           ],
002964:           "unique_count_tracked": 2,
002965:           "unique_overflow": false,
002966:           "numeric_summary": null,
002967:           "string_len_avg": 32.0,
002968:           "datetime_summary": {
002969:             "min": "2026-04-02T19:38:38.238993+00:00",
002970:             "max": "2026-04-02T19:57:26.645161+00:00",
002971:             "span_days": 0
002972:           }
002973:         },
002974:         "payload.deleted.metadata.route_context.market_prices": {
002975:           "seen": 2,
002976:           "non_null": 2,
002977:           "coverage_ratio": 0.1538,
002978:           "types": {
002979:             "dict": 2
002980:           },
002981:           "examples": [
002982:             "{\"found\": true, \"source\": \"ref_mandi_prices\", \"count\": 10, \"as_of_latest_arrival_date\": \"20/03/2026\", \"data_last_ingested_at\": \"2026-03-24T20:19:48.396062+00:00\", \"prices\": [{\"m..."
002983:           ],
002984:           "unique_count_tracked": 0,
002985:           "unique_overflow": false,
002986:           "numeric_summary": null,
002987:           "string_len_avg": null,
002988:           "datetime_summary": null
002989:         },
002990:         "payload.deleted.metadata.route_context.market_prices.found": {
002991:           "seen": 2,
002992:           "non_null": 2,
002993:           "coverage_ratio": 0.1538,
002994:           "types": {
002995:             "bool": 2
002996:           },
002997:           "examples": [
002998:             "true"
002999:           ],
003000:           "unique_count_tracked": 1,
003001:           "unique_overflow": false,
003002:           "numeric_summary": null,
003003:           "string_len_avg": null,
003004:           "datetime_summary": null
003005:         },
003006:         "payload.deleted.metadata.route_context.market_prices.source": {
003007:           "seen": 2,
003008:           "non_null": 2,
003009:           "coverage_ratio": 0.1538,
003010:           "types": {
003011:             "str": 2
003012:           },
003013:           "examples": [
003014:             "\"ref_mandi_prices\""
003015:           ],
003016:           "unique_count_tracked": 1,
003017:           "unique_overflow": false,
003018:           "numeric_summary": null,
003019:           "string_len_avg": 16.0,
003020:           "datetime_summary": null
003021:         },
003022:         "payload.deleted.metadata.route_context.market_prices.count": {
003023:           "seen": 2,
003024:           "non_null": 2,
003025:           "coverage_ratio": 0.1538,
003026:           "types": {
003027:             "int": 2
003028:           },
003029:           "examples": [
003030:             "10"
003031:           ],
003032:           "unique_count_tracked": 1,
003033:           "unique_overflow": false,
003034:           "numeric_summary": {
003035:             "count": 2.0,
003036:             "min": 10.0,
003037:             "p25": 10.0,
003038:             "p50": 10.0,
003039:             "p75": 10.0,
003040:             "max": 10.0,
003041:             "mean": 10.0
003042:           },
003043:           "string_len_avg": null,
003044:           "datetime_summary": null
003045:         },
003046:         "payload.deleted.metadata.route_context.market_prices.as_of_latest_arrival_date": {
003047:           "seen": 2,
003048:           "non_null": 2,
003049:           "coverage_ratio": 0.1538,
003050:           "types": {
003051:             "str": 2
003052:           },
003053:           "examples": [
003054:             "\"20/03/2026\""
003055:           ],
003056:           "unique_count_tracked": 1,
003057:           "unique_overflow": false,
003058:           "numeric_summary": null,
003059:           "string_len_avg": 10.0,
003060:           "datetime_summary": null
003061:         },
003062:         "payload.deleted.metadata.route_context.market_prices.data_last_ingested_at": {
003063:           "seen": 2,
003064:           "non_null": 2,
003065:           "coverage_ratio": 0.1538,
003066:           "types": {
003067:             "str": 2
003068:           },
003069:           "examples": [
003070:             "\"2026-03-24T20:19:48.396062+00:00\""
003071:           ],
003072:           "unique_count_tracked": 1,
003073:           "unique_overflow": false,
003074:           "numeric_summary": null,
003075:           "string_len_avg": 32.0,
003076:           "datetime_summary": {
003077:             "min": "2026-03-24T20:19:48.396062+00:00",
003078:             "max": "2026-03-24T20:19:48.396062+00:00",
003079:             "span_days": 0
003080:           }
003081:         },
003082:         "payload.deleted.metadata.route_context.market_prices.prices": {
003083:           "seen": 2,
003084:           "non_null": 2,
003085:           "coverage_ratio": 0.1538,
003086:           "types": {
003087:             "list": 2
003088:           },
003089:           "examples": [
003090:             "[{\"market\": \"Kharar APMC\", \"state\": \"Punjab\", \"district\": \"Mohali\", \"commodity\": \"Tomato\", \"variety\": \"Tomato\", \"modal_price\": 2000, \"min_price\": 1500, \"max_price\": 2500, \"arriv..."
003091:           ],
003092:           "unique_count_tracked": 0,
003093:           "unique_overflow": false,
003094:           "numeric_summary": null,
003095:           "string_len_avg": null,
003096:           "datetime_summary": null
003097:         },
003098:         "payload.deleted.metadata.route_context.market_prices.prices[]": {
003099:           "seen": 20,
003100:           "non_null": 20,
003101:           "coverage_ratio": 1.5385,
003102:           "types": {
003103:             "dict": 20
003104:           },
003105:           "examples": [
003106:             "{\"market\": \"Kharar APMC\", \"state\": \"Punjab\", \"district\": \"Mohali\", \"commodity\": \"Tomato\", \"variety\": \"Tomato\", \"modal_price\": 2000, \"min_price\": 1500, \"max_price\": 2500, \"arriva...",
003107:             "{\"market\": \"Pallikonda(Uzhavar Sandhai)\", \"state\": \"Tamil Nadu\", \"district\": \"Vellore\", \"commodity\": \"Tomato\", \"variety\": \"Deshi\", \"modal_price\": 1650, \"min_price\": 1500, \"max_p...",
003108:             "{\"market\": \"Peravurani(Uzhavar Sandhai)\", \"state\": \"Tamil Nadu\", \"district\": \"Thanjavur\", \"commodity\": \"Tomato\", \"variety\": \"Deshi\", \"modal_price\": 2000, \"min_price\": 2000, \"max...",
003109:             "{\"market\": \"Gandhigramam(Uzhavar Sandhai)\", \"state\": \"Tamil Nadu\", \"district\": \"Karur\", \"commodity\": \"Tomato\", \"variety\": \"Other\", \"modal_price\": 1700, \"min_price\": 1600, \"max_p...",
003110:             "{\"market\": \"Bhusaval APMC\", \"state\": \"Maharashtra\", \"district\": \"Jalgaon\", \"commodity\": \"Tomato\", \"variety\": \"Other\", \"modal_price\": 1800, \"min_price\": 1500, \"max_price\": 2000, ..."
003111:           ],
003112:           "unique_count_tracked": 0,
003113:           "unique_overflow": false,
003114:           "numeric_summary": null,
003115:           "string_len_avg": null,
003116:           "datetime_summary": null
003117:         },
003118:         "payload.deleted.metadata.route_context.market_prices.prices[].market": {
003119:           "seen": 20,
003120:           "non_null": 20,
003121:           "coverage_ratio": 1.5385,
003122:           "types": {
003123:             "str": 20
003124:           },
003125:           "examples": [
003126:             "\"Kharar APMC\"",
003127:             "\"Pallikonda(Uzhavar Sandhai)\"",
003128:             "\"Peravurani(Uzhavar Sandhai)\"",
003129:             "\"Gandhigramam(Uzhavar Sandhai)\"",
003130:             "\"Bhusaval APMC\""
003131:           ],
003132:           "unique_count_tracked": 10,
003133:           "unique_overflow": false,
003134:           "numeric_summary": null,
003135:           "string_len_avg": 17.6,
003136:           "datetime_summary": null
003137:         },
003138:         "payload.deleted.metadata.route_context.market_prices.prices[].state": {
003139:           "seen": 20,
003140:           "non_null": 20,
003141:           "coverage_ratio": 1.5385,
003142:           "types": {
003143:             "str": 20
003144:           },
003145:           "examples": [
003146:             "\"Punjab\"",
003147:             "\"Tamil Nadu\"",
003148:             "\"Maharashtra\"",
003149:             "\"Uttar Pradesh\"",
003150:             "\"Nagaland\""
003151:           ],
003152:           "unique_count_tracked": 5,
003153:           "unique_overflow": false,
003154:           "numeric_summary": null,
003155:           "string_len_avg": 10.1,
003156:           "datetime_summary": null
003157:         },
003158:         "payload.deleted.metadata.route_context.market_prices.prices[].district": {
003159:           "seen": 20,
003160:           "non_null": 20,
003161:           "coverage_ratio": 1.5385,
003162:           "types": {
003163:             "str": 20
003164:           },
003165:           "examples": [
003166:             "\"Mohali\"",
003167:             "\"Vellore\"",
003168:             "\"Thanjavur\"",
003169:             "\"Karur\"",
003170:             "\"Jalgaon\""
003171:           ],
003172:           "unique_count_tracked": 10,
003173:           "unique_overflow": false,
003174:           "numeric_summary": null,
003175:           "string_len_avg": 6.8,
003176:           "datetime_summary": null
003177:         },
003178:         "payload.deleted.metadata.route_context.market_prices.prices[].commodity": {
003179:           "seen": 20,
003180:           "non_null": 20,
003181:           "coverage_ratio": 1.5385,
003182:           "types": {
003183:             "str": 20
003184:           },
003185:           "examples": [
003186:             "\"Tomato\""
003187:           ],
003188:           "unique_count_tracked": 1,
003189:           "unique_overflow": false,
003190:           "numeric_summary": null,
003191:           "string_len_avg": 6.0,
003192:           "datetime_summary": null
003193:         },
003194:         "payload.deleted.metadata.route_context.market_prices.prices[].variety": {
003195:           "seen": 20,
003196:           "non_null": 20,
003197:           "coverage_ratio": 1.5385,
003198:           "types": {
003199:             "str": 20
003200:           },
003201:           "examples": [
003202:             "\"Tomato\"",
003203:             "\"Deshi\"",
003204:             "\"Other\"",
003205:             "\"Local\"",
003206:             "\"Hybrid\""
003207:           ],
003208:           "unique_count_tracked": 5,
003209:           "unique_overflow": false,
003210:           "numeric_summary": null,
003211:           "string_len_avg": 5.3,
003212:           "datetime_summary": null
003213:         },
003214:         "payload.deleted.metadata.route_context.market_prices.prices[].modal_price": {
003215:           "seen": 20,
003216:           "non_null": 20,
003217:           "coverage_ratio": 1.5385,
003218:           "types": {
003219:             "int": 20
003220:           },
003221:           "examples": [
003222:             "2000",
003223:             "1650",
003224:             "1700",
003225:             "1800",
003226:             "800"
003227:           ],
003228:           "unique_count_tracked": 9,
003229:           "unique_overflow": false,
003230:           "numeric_summary": {
003231:             "count": 20.0,
003232:             "min": 800.0,
003233:             "p25": 1200.0,
003234:             "p50": 1700.0,
003235:             "p75": 2000.0,
003236:             "max": 3600.0,
003237:             "mean": 1760.0
003238:           },
003239:           "string_len_avg": null,
003240:           "datetime_summary": null
003241:         },
003242:         "payload.deleted.metadata.route_context.market_prices.prices[].min_price": {
003243:           "seen": 20,
003244:           "non_null": 20,
003245:           "coverage_ratio": 1.5385,
003246:           "types": {
003247:             "int": 20
003248:           },
003249:           "examples": [
003250:             "1500",
003251:             "2000",
003252:             "1600",
003253:             "250",
003254:             "1000"
003255:           ],
003256:           "unique_count_tracked": 6,
003257:           "unique_overflow": false,
003258:           "numeric_summary": {
003259:             "count": 20.0,
003260:             "min": 250.0,
003261:             "p25": 1000.0,
003262:             "p50": 1500.0,
003263:             "p75": 1600.0,
003264:             "max": 3500.0,
003265:             "mean": 1535.0
003266:           },
003267:           "string_len_avg": null,
003268:           "datetime_summary": null
003269:         },
003270:         "payload.deleted.metadata.route_context.market_prices.prices[].max_price": {
003271:           "seen": 20,
003272:           "non_null": 20,
003273:           "coverage_ratio": 1.5385,
003274:           "types": {
003275:             "int": 20
003276:           },
003277:           "examples": [
003278:             "2500",
003279:             "1800",
003280:             "2000",
003281:             "1125",
003282:             "1500"
003283:           ],
003284:           "unique_count_tracked": 7,
003285:           "unique_overflow": false,
003286:           "numeric_summary": {
003287:             "count": 20.0,
003288:             "min": 1125.0,
003289:             "p25": 1500.0,
003290:             "p50": 1800.0,
003291:             "p75": 2000.0,
003292:             "max": 3700.0,
003293:             "mean": 1962.5
003294:           },
003295:           "string_len_avg": null,
003296:           "datetime_summary": null
003297:         },
003298:         "payload.deleted.metadata.route_context.market_prices.prices[].arrival_date": {
003299:           "seen": 20,
003300:           "non_null": 20,
003301:           "coverage_ratio": 1.5385,
003302:           "types": {
003303:             "str": 20
003304:           },
003305:           "examples": [
003306:             "\"20/03/2026\""
003307:           ],
003308:           "unique_count_tracked": 1,
003309:           "unique_overflow": false,
003310:           "numeric_summary": null,
003311:           "string_len_avg": 10.0,
003312:           "datetime_summary": null
003313:         },
003314:         "payload.deleted.metadata.route_context.market_prices.prices[].ingested_at": {
003315:           "seen": 20,
003316:           "non_null": 20,
003317:           "coverage_ratio": 1.5385,
003318:           "types": {
003319:             "str": 20
003320:           },
003321:           "examples": [
003322:             "\"2026-03-24T20:19:48.396062+00:00\""
003323:           ],
003324:           "unique_count_tracked": 1,
003325:           "unique_overflow": false,
003326:           "numeric_summary": null,
003327:           "string_len_avg": 32.0,
003328:           "datetime_summary": {
003329:             "min": "2026-03-24T20:19:48.396062+00:00",
003330:             "max": "2026-03-24T20:19:48.396062+00:00",
003331:             "span_days": 0
003332:           }
003333:         },
003334:         "payload.deleted.metadata.route_context.mandis": {
003335:           "seen": 2,
003336:           "non_null": 2,
003337:           "coverage_ratio": 0.1538,
003338:           "types": {
003339:             "dict": 2
003340:           },
003341:           "examples": [
003342:             "{\"found\": true, \"source\": \"ref_mandi_directory\", \"count\": 20, \"mandis\": [{\"name\": \"Pundibari\", \"state\": \"West Bengal\", \"district\": \"Coochbehar\", \"source\": \"data.gov.in_daily_pri..."
003343:           ],
003344:           "unique_count_tracked": 0,
003345:           "unique_overflow": false,
003346:           "numeric_summary": null,
003347:           "string_len_avg": null,
003348:           "datetime_summary": null
003349:         },
003350:         "payload.deleted.metadata.route_context.mandis.found": {
003351:           "seen": 2,
003352:           "non_null": 2,
003353:           "coverage_ratio": 0.1538,
003354:           "types": {
003355:             "bool": 2
003356:           },
003357:           "examples": [
003358:             "true"
003359:           ],
003360:           "unique_count_tracked": 1,
003361:           "unique_overflow": false,
003362:           "numeric_summary": null,
003363:           "string_len_avg": null,
003364:           "datetime_summary": null
003365:         },
003366:         "payload.deleted.metadata.route_context.mandis.source": {
003367:           "seen": 2,
003368:           "non_null": 2,
003369:           "coverage_ratio": 0.1538,
003370:           "types": {
003371:             "str": 2
003372:           },
003373:           "examples": [
003374:             "\"ref_mandi_directory\""
003375:           ],
003376:           "unique_count_tracked": 1,
003377:           "unique_overflow": false,
003378:           "numeric_summary": null,
003379:           "string_len_avg": 19.0,
003380:           "datetime_summary": null
003381:         },
003382:         "payload.deleted.metadata.route_context.mandis.count": {
003383:           "seen": 2,
003384:           "non_null": 2,
003385:           "coverage_ratio": 0.1538,
003386:           "types": {
003387:             "int": 2
003388:           },
003389:           "examples": [
003390:             "20"
003391:           ],
003392:           "unique_count_tracked": 1,
003393:           "unique_overflow": false,
003394:           "numeric_summary": {
003395:             "count": 2.0,
003396:             "min": 20.0,
003397:             "p25": 20.0,
003398:             "p50": 20.0,
003399:             "p75": 20.0,
003400:             "max": 20.0,
003401:             "mean": 20.0
003402:           },
003403:           "string_len_avg": null,
003404:           "datetime_summary": null
003405:         },
003406:         "payload.deleted.metadata.route_context.mandis.mandis": {
003407:           "seen": 2,
003408:           "non_null": 2,
003409:           "coverage_ratio": 0.1538,
003410:           "types": {
003411:             "list": 2
003412:           },
003413:           "examples": [
003414:             "[{\"name\": \"Pundibari\", \"state\": \"West Bengal\", \"district\": \"Coochbehar\", \"source\": \"data.gov.in_daily_prices\", \"ingested_at\": \"2026-03-25T21:16:07.072428+00:00\"}, {\"name\": \"Toof..."
003415:           ],
003416:           "unique_count_tracked": 0,
003417:           "unique_overflow": false,
003418:           "numeric_summary": null,
003419:           "string_len_avg": null,
003420:           "datetime_summary": null
003421:         },
003422:         "payload.deleted.metadata.route_context.mandis.mandis[]": {
003423:           "seen": 40,
003424:           "non_null": 40,
003425:           "coverage_ratio": 3.0769,
003426:           "types": {
003427:             "dict": 40
003428:           },
003429:           "examples": [
003430:             "{\"name\": \"Pundibari\", \"state\": \"West Bengal\", \"district\": \"Coochbehar\", \"source\": \"data.gov.in_daily_prices\", \"ingested_at\": \"2026-03-25T21:16:07.072428+00:00\"}",
003431:             "{\"name\": \"Toofanganj\", \"state\": \"West Bengal\", \"district\": \"Coochbehar\", \"source\": \"data.gov.in_daily_prices\", \"ingested_at\": \"2026-03-25T21:16:07.072428+00:00\"}",
003432:             "{\"name\": \"Sheoraphuly\", \"state\": \"West Bengal\", \"district\": \"Hooghly\", \"source\": \"data.gov.in_daily_prices\", \"ingested_at\": \"2026-03-25T21:16:07.072428+00:00\"}",
003433:             "{\"name\": \"Anoop Shahar\", \"state\": \"Uttar Pradesh\", \"district\": \"Bulandshahar\", \"source\": \"data.gov.in_daily_prices\", \"ingested_at\": \"2026-03-25T21:16:07.072428+00:00\"}",
003434:             "{\"name\": \"Sikanderabad\", \"state\": \"Uttar Pradesh\", \"district\": \"Bulandshahar\", \"source\": \"data.gov.in_daily_prices\", \"ingested_at\": \"2026-03-25T21:16:07.072428+00:00\"}"
003435:           ],
003436:           "unique_count_tracked": 0,
003437:           "unique_overflow": false,
003438:           "numeric_summary": null,
003439:           "string_len_avg": null,
003440:           "datetime_summary": null
003441:         },
003442:         "payload.deleted.metadata.route_context.mandis.mandis[].name": {
003443:           "seen": 40,
003444:           "non_null": 40,
003445:           "coverage_ratio": 3.0769,
003446:           "types": {
003447:             "str": 40
003448:           },
003449:           "examples": [
003450:             "\"Pundibari\"",
003451:             "\"Toofanganj\"",
003452:             "\"Sheoraphuly\"",
003453:             "\"Anoop Shahar\"",
003454:             "\"Sikanderabad\""
003455:           ],
003456:           "unique_count_tracked": 20,
003457:           "unique_overflow": false,
003458:           "numeric_summary": null,
003459:           "string_len_avg": 10.55,
003460:           "datetime_summary": null
003461:         },
003462:         "payload.deleted.metadata.route_context.mandis.mandis[].state": {
003463:           "seen": 40,
003464:           "non_null": 40,
003465:           "coverage_ratio": 3.0769,
003466:           "types": {
003467:             "str": 40
003468:           },
003469:           "examples": [
003470:             "\"West Bengal\"",
003471:             "\"Uttar Pradesh\"",
003472:             "\"Gujarat\"",
003473:             "\"Haryana\""
003474:           ],
003475:           "unique_count_tracked": 4,
003476:           "unique_overflow": false,
003477:           "numeric_summary": null,
003478:           "string_len_avg": 8.4,
003479:           "datetime_summary": null
003480:         },
003481:         "payload.deleted.metadata.route_context.mandis.mandis[].district": {
003482:           "seen": 40,
003483:           "non_null": 40,
003484:           "coverage_ratio": 3.0769,
003485:           "types": {
003486:             "str": 40
003487:           },
003488:           "examples": [
003489:             "\"Coochbehar\"",
003490:             "\"Hooghly\"",
003491:             "\"Bulandshahar\"",
003492:             "\"Kolkata\"",
003493:             "\"Banaskanth\""
003494:           ],
003495:           "unique_count_tracked": 13,
003496:           "unique_overflow": false,
003497:           "numeric_summary": null,
003498:           "string_len_avg": 8.65,
003499:           "datetime_summary": null
003500:         },
```

## Haryana Mandi Trend Callouts (Derived)


## Conversation Policy Hints for Calling Agent

- Keep voice answers concise (15-45 seconds).
- Prefer numeric comparisons over abstract statements.
- Mention source freshness assumptions when quoting prices/schemes.
- Offer next action: apply, verify, compare mandi, schedule reminder.
- For low confidence, ask a single clarification question.

## Haryana Farmer 360 Deep Records (Expanded)

### Equipment Usage + Rental Behavior (Expanded)
- equipment_event_1: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_2: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_3: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_4: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_5: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_6: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_7: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_8: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_9: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_10: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_11: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_12: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_13: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_14: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_15: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_16: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_17: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_18: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_19: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_20: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_21: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_22: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_23: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_24: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_25: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_26: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_27: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_28: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_29: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_30: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_31: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_32: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_33: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_34: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_35: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_36: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_37: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_38: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_39: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_40: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_41: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_42: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_43: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_44: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_45: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_46: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_47: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_48: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_49: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_50: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_51: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_52: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_53: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_54: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_55: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_56: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_57: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_58: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_59: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_60: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_61: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_62: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_63: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_64: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_65: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_66: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_67: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_68: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_69: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_70: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_71: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_72: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_73: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_74: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_75: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_76: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_77: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_78: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_79: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_80: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_81: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_82: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_83: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_84: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_85: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_86: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_87: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_88: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_89: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_90: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_91: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_92: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_93: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_94: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_95: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_96: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_97: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_98: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_99: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_100: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_101: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_102: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_103: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_104: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_105: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_106: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_107: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_108: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_109: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_110: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_111: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_112: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_113: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_114: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_115: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_116: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_117: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_118: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_119: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_120: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_121: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_122: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_123: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_124: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_125: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_126: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_127: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_128: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_129: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_130: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_131: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_132: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_133: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_134: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_135: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_136: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_137: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_138: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_139: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_140: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_141: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_142: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_143: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_144: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_145: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_146: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_147: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_148: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_149: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_150: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_151: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_152: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_153: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_154: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_155: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_156: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_157: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_158: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_159: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_160: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_161: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_162: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_163: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_164: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_165: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_166: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_167: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_168: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_169: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_170: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_171: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_172: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_173: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_174: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_175: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_176: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_177: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_178: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_179: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.
- equipment_event_180: seasonal rental requirement mapped to sowing/spraying/harvesting windows, quote comparison, provider reliability score, and post-job quality notes.

### Advisory + Notification Rules (Expanded)
- advisory_rule_1: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_2: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_3: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_4: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_5: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_6: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_7: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_8: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_9: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_10: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_11: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_12: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_13: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_14: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_15: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_16: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_17: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_18: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_19: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_20: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_21: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_22: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_23: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_24: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_25: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_26: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_27: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_28: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_29: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_30: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_31: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_32: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_33: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_34: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_35: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_36: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_37: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_38: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_39: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_40: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_41: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_42: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_43: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_44: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_45: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_46: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_47: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_48: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_49: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_50: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_51: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_52: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_53: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_54: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_55: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_56: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_57: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_58: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_59: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_60: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_61: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_62: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_63: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_64: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_65: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_66: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_67: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_68: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_69: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_70: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_71: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_72: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_73: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_74: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_75: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_76: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_77: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_78: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_79: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_80: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_81: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_82: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_83: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_84: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_85: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_86: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_87: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_88: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_89: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_90: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_91: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_92: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_93: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_94: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_95: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_96: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_97: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_98: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_99: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_100: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_101: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_102: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_103: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_104: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_105: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_106: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_107: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_108: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_109: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_110: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_111: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_112: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_113: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_114: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_115: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_116: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_117: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_118: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_119: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_120: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_121: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_122: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_123: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_124: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_125: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_126: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_127: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_128: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_129: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_130: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_131: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_132: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_133: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_134: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_135: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_136: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_137: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_138: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_139: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_140: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_141: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_142: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_143: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_144: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_145: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_146: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_147: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_148: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_149: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_150: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_151: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_152: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_153: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_154: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_155: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_156: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_157: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_158: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_159: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_160: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_161: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_162: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_163: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_164: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_165: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_166: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_167: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_168: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_169: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_170: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_171: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_172: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_173: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_174: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_175: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_176: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_177: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_178: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_179: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.
- advisory_rule_180: trigger localized alert when commodity spread, weather shock, or pest risk crosses threshold and include actionable Hindi guidance.

### Document + Scheme State Machine (Expanded)
- document_state_1: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_2: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_3: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_4: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_5: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_6: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_7: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_8: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_9: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_10: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_11: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_12: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_13: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_14: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_15: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_16: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_17: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_18: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_19: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_20: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_21: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_22: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_23: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_24: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_25: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_26: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_27: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_28: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_29: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_30: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_31: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_32: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_33: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_34: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_35: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_36: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_37: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_38: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_39: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_40: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_41: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_42: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_43: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_44: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_45: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_46: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_47: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_48: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_49: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_50: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_51: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_52: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_53: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_54: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_55: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_56: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_57: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_58: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_59: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_60: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_61: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_62: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_63: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_64: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_65: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_66: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_67: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_68: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_69: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_70: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_71: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_72: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_73: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_74: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_75: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_76: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_77: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_78: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_79: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_80: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_81: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_82: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_83: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_84: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_85: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_86: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_87: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_88: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_89: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_90: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_91: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_92: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_93: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_94: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_95: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_96: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_97: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_98: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_99: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_100: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_101: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_102: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_103: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_104: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_105: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_106: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_107: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_108: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_109: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_110: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_111: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_112: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_113: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_114: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_115: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_116: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_117: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_118: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_119: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_120: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_121: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_122: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_123: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_124: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_125: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_126: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_127: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_128: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_129: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_130: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_131: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_132: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_133: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_134: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_135: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_136: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_137: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_138: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_139: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_140: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_141: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_142: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_143: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_144: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_145: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_146: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_147: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_148: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_149: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_150: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_151: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_152: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_153: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_154: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_155: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_156: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_157: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_158: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_159: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_160: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_161: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_162: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_163: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_164: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_165: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_166: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_167: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_168: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_169: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_170: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_171: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_172: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_173: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_174: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_175: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_176: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_177: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_178: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_179: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.
- document_state_180: per-document readiness, verification timestamp, scheme mapping, and pending action reference for assisted completion flow.

### Mandi Trend Callouts (Expanded)
- trend_point_1: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_2: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_3: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_4: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_5: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_6: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_7: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_8: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_9: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_10: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_11: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_12: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_13: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_14: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_15: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_16: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_17: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_18: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_19: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_20: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_21: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_22: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_23: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_24: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_25: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_26: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_27: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_28: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_29: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_30: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_31: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_32: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_33: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_34: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_35: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_36: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_37: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_38: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_39: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_40: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_41: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_42: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_43: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_44: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_45: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_46: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_47: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_48: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_49: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_50: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_51: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_52: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_53: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_54: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_55: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_56: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_57: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_58: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_59: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_60: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_61: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_62: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_63: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_64: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_65: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_66: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_67: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_68: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_69: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_70: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_71: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_72: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_73: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_74: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_75: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_76: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_77: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_78: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_79: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_80: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_81: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_82: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_83: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_84: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_85: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_86: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_87: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_88: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_89: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_90: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_91: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_92: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_93: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_94: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_95: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_96: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_97: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_98: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_99: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_100: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_101: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_102: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_103: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_104: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_105: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_106: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_107: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_108: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_109: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_110: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_111: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_112: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_113: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_114: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_115: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_116: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_117: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_118: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_119: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_120: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_121: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_122: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_123: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_124: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_125: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_126: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_127: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_128: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_129: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_130: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_131: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_132: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_133: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_134: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_135: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_136: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_137: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_138: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_139: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_140: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_141: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_142: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_143: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_144: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_145: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_146: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_147: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_148: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_149: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_150: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_151: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_152: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_153: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_154: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_155: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_156: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_157: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_158: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_159: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_160: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_161: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_162: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_163: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_164: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_165: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_166: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_167: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_168: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_169: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_170: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_171: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_172: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_173: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_174: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_175: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_176: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_177: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_178: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_179: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_180: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_181: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_182: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_183: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_184: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_185: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_186: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_187: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_188: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_189: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_190: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_191: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_192: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_193: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_194: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_195: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_196: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_197: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_198: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_199: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_200: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_201: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_202: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_203: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_204: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_205: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_206: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_207: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_208: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_209: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_210: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_211: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_212: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_213: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_214: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_215: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_216: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_217: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_218: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_219: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_220: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_221: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_222: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_223: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_224: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_225: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_226: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_227: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_228: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_229: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_230: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_231: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_232: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_233: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_234: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_235: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_236: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_237: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_238: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_239: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
- trend_point_240: Haryana district mandi movement interpreted with modal/min/max momentum and expected short-horizon farmer action.
