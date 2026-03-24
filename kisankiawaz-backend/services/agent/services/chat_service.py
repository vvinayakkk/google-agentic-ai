import uuid
from datetime import datetime, timezone
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from shared.db.firebase import get_firestore
from shared.core.constants import FirestoreCollections
from agents.coordinator import build_coordinator
from loguru import logger


class ChatService:
    def __init__(self):
        self.session_service = InMemorySessionService()
        self.coordinator = build_coordinator()
        self.runner = Runner(
            agent=self.coordinator,
            app_name="kisankiawaz",
            session_service=self.session_service,
        )

    async def process_message(self, user_id: str, session_id: str, message: str, language: str = "hi") -> dict:
        session = await self.session_service.get_session(
            app_name="kisankiawaz", user_id=user_id, session_id=session_id
        )
        if not session:
            session = await self.session_service.create_session(
                app_name="kisankiawaz", user_id=user_id, session_id=session_id
            )

        content = types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)]
        )

        response_text = ""
        agent_used = "coordinator"
        async for event in self.runner.run_async(
            user_id=user_id, session_id=session_id, new_message=content
        ):
            if event.is_final_response():
                for part in event.content.parts:
                    if part.text:
                        response_text += part.text
                agent_used = event.author or "coordinator"

        # Store in Firestore
        db = get_firestore()
        await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).set({
            "user_id": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, merge=True)

        await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).collection("messages").add({
            "role": "user",
            "content": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).collection("messages").add({
            "role": "assistant",
            "content": response_text,
            "agent": agent_used,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return {
            "session_id": session_id,
            "response": response_text,
            "language": language,
            "agent_used": agent_used,
        }

    async def list_sessions(self, user_id: str) -> list:
        db = get_firestore()
        from google.cloud.firestore_v1.base_query import FieldFilter
        docs = await db.collection(FirestoreCollections.AGENT_SESSIONS).where(
            filter=FieldFilter("user_id", "==", user_id)
        ).get()
        items = [{"id": d.id, **d.to_dict()} for d in docs]
        # Sort in Python (avoids composite index requirement)
        items.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return items

    async def get_session_history(self, session_id: str, user_id: str) -> dict:
        db = get_firestore()
        session_doc = await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).get()
        if not session_doc.exists or session_doc.to_dict().get("user_id") != user_id:
            from shared.errors import not_found
            raise not_found("Session")
        messages = await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).collection("messages").order_by("timestamp").get()
        return {
            "session_id": session_id,
            "messages": [m.to_dict() for m in messages],
        }

    async def delete_session(self, session_id: str, user_id: str):
        db = get_firestore()
        session_doc = await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).get()
        if not session_doc.exists or session_doc.to_dict().get("user_id") != user_id:
            from shared.errors import not_found
            raise not_found("Session")
        messages = await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).collection("messages").get()
        for msg in messages:
            await msg.reference.delete()
        await db.collection(FirestoreCollections.AGENT_SESSIONS).document(session_id).delete()
