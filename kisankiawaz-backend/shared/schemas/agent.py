"""Agent / chat schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """User message to the agent orchestrator."""

    message: str = Field(..., min_length=1, max_length=5000, description="User message")
    session_id: Optional[str] = Field(default=None, description="Existing session to continue")
    language: Optional[str] = Field(default="hi", max_length=5, description="Language code")

    model_config = {"strict": True}


class ChatResponse(BaseModel):
    """Agent response."""

    session_id: str
    message: str
    agents_used: List[str] = Field(default_factory=list)
    tools_called: List[str] = Field(default_factory=list)
    latency_ms: int = 0


class AgentTool(BaseModel):
    """Metadata about an available agent tool."""

    name: str
    description: str
    parameters: dict = Field(default_factory=dict)


class ConversationMessage(BaseModel):
    """Single message in a conversation."""

    role: str  # user | assistant | tool
    content: str
    agent_used: Optional[str] = None
    tools_called: List[str] = Field(default_factory=list)
    latency_ms: Optional[int] = None
    timestamp: str = ""


class ConversationSummary(BaseModel):
    """Summary of a conversation session."""

    session_id: str
    channel: str = "chat"  # chat | voice
    message_count: int = 0
    created_at: str = ""
    last_message_at: str = ""
    language: str = "hi"
