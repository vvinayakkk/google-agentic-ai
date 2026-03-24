from google.adk.agents import Agent
from tools.general_tools import search_farming_knowledge, get_livestock_advice


def build_general_agent() -> Agent:
    return Agent(
        name="GeneralAgent",
        model="gemini-2.5-flash",
        description="Handles general farming queries: livestock, equipment, soil health, organic farming",
        instruction="""You are GeneralAgent, handling general farming queries.
Use tools to search the knowledge base. Provide practical farming advice.
Respond in the user's language (Hindi default).
Cover: livestock management, equipment maintenance, soil health, organic farming, general agriculture.""",
        tools=[search_farming_knowledge, get_livestock_advice],
    )
