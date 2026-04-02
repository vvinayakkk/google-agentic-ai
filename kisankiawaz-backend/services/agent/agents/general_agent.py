from google.adk.agents import Agent
from tools.calendar_tools import (
    apply_calendar_action_from_request,
    create_calendar_event,
    create_calendar_events_from_request,
    delete_calendar_event,
    list_calendar_events,
    undo_last_calendar_action,
    update_calendar_event,
    verify_calendar_event,
)
from tools.general_tools import search_farming_knowledge, get_livestock_advice


def build_general_agent() -> Agent:
    return Agent(
        name="GeneralAgent",
        model="gemini-2.5-flash",
        description="Handles general farming queries: livestock, equipment, soil health, organic farming",
        instruction="""You are GeneralAgent, handling general farming queries.
Use tools to search the knowledge base. Provide practical farming advice.
           Always respond in the current user's requested language; if unclear, use English.
Cover: livestock management, equipment maintenance, soil health, organic farming, general agriculture.
For calendar/task requests, create or update farmer events in DB and verify by reading back the saved event.""",
        tools=[
            search_farming_knowledge,
            get_livestock_advice,
            create_calendar_event,
            create_calendar_events_from_request,
            apply_calendar_action_from_request,
            list_calendar_events,
            update_calendar_event,
            delete_calendar_event,
            verify_calendar_event,
            undo_last_calendar_action,
        ],
    )
