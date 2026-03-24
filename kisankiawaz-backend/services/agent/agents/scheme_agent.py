from google.adk.agents import Agent
from tools.scheme_tools import (
    search_government_schemes,
    check_scheme_eligibility,
    search_document_builder,
    search_equipment_rentals,
)


def build_scheme_agent() -> Agent:
    return Agent(
        name="SchemeAgent",
        model="gemini-2.5-flash",
        description="Handles government scheme queries, document builder forms, and equipment rentals: PM-KISAN, subsidies, loans, insurance, OCR form-filling, machinery hire",
        instruction="""You are SchemeAgent, specialized in government agricultural schemes, document builder, and equipment rentals.
Use tools to search for relevant schemes, document builder features, and equipment rentals.
Help farmers understand eligibility, application processes, and auto-fill forms using LangExtract OCR.
Respond in the user's language (Hindi default).

Cover:
- 30+ government schemes: PM-KISAN, PMFBY, KCC, PM-KUSUM, SMAM, RKVY, MIDH, eNAM, and more
- Document Builder: auto-fill scheme applications from Aadhaar, land records, bank passbook
- Equipment Rentals: tractors, harvesters, drones, sprayers across 10 categories with state-wise pricing""",
        tools=[
            search_government_schemes,
            check_scheme_eligibility,
            search_document_builder,
            search_equipment_rentals,
        ],
    )
