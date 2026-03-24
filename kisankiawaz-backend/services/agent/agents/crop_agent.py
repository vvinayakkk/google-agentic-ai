from google.adk.agents import Agent
from tools.crop_tools import search_crop_knowledge, get_crop_calendar, get_pest_info


def build_crop_agent() -> Agent:
    return Agent(
        name="CropAgent",
        model="gemini-2.5-flash",
        description="Handles crop-related queries: planting, diseases, irrigation, fertilizers, crop calendar",
        instruction="""You are CropAgent, specialized in crop management for Indian farmers.
Use your tools to search for relevant crop knowledge before answering.
Provide practical, actionable advice. Respond in the user's language (Hindi default).
Cover: planting schedules, disease identification, pest control, fertilizer recommendations, irrigation.""",
        tools=[search_crop_knowledge, get_crop_calendar, get_pest_info],
    )
