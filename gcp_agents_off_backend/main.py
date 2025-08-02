from google.adk.cli.fast_api import get_fast_api_app
from adk_agents.multi_tool_agent.agent import root_agent
from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
from google.adk.sessions import DatabaseSessionService
from google.cloud import aiplatform
from google.adk.agents import Agent
from google.adk import Runner
from google.genai import types
from typing import Optional, Any, Dict
from dotenv import load_dotenv
import os
import shutil
from services.speech_to_text import transcribe_audio
from config.setting import settings

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL) or "sqlite:///./sql_app.db"

# Create FastAPI app
app = FastAPI(title="KisanKiAwaaz Backend", version="1.0.0")

# Add CORS middleware
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    user_prompt: str
    metadata: Optional[Dict[str, Any]] = None
    user_id: str
    session_id: str

@app.get("/")
async def root():
    return {"message": "KisanKiAwaaz Backend is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database_url": DATABASE_URL}

@app.post("/generate_audio")
async def generate_audio_endpoint(request: dict):
    """Simple endpoint to generate audio for any text"""
    try:
        text = request.get("text", "")
        language = request.get("language", None)
        
        if not text:
            return {"error": "Text is required"}
        
        print(f"🎵 Generating audio for text: {text[:100]}...")
        
        from services.text_to_speech import text_to_speech, detect_language
        
        if not language:
            language = detect_language(text)
        
        audio_base64 = text_to_speech(text, language)
        
        if audio_base64:
            return {
                "success": True,
                "audio": audio_base64,
                "language": language,
                "text_length": len(text)
            }
        else:
            return {
                "success": False,
                "error": "Failed to generate audio"
            }
            
    except Exception as e:
        print(f"❌ Error in generate_audio_endpoint: {e}")
        return {"error": f"Processing error: {str(e)}"}

@app.post("/audio_agent")
async def audio_agent_endpoint(
    audio_file: UploadFile = File(...),
    user_id: str = Form(...),
    session_id: str = Form(...),
    metadata: Optional[str] = Form(None)
):
    try:
        print(f"🎤 Received audio file: {audio_file.filename}")
        
        # Save the uploaded audio file temporarily
        temp_audio_path = f"temp_{audio_file.filename}"
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        print(f"📁 Saved audio to: {temp_audio_path}")

        # Transcribe the audio file to text
        transcribed_text, detected_language = transcribe_audio(temp_audio_path)
        
        print(f"🎵 Transcription result: {transcribed_text}")

        # Clean up the temporary file
        os.remove(temp_audio_path)

        if not transcribed_text:
            return {"error": "Could not transcribe audio"}

        # Prepare metadata with fixed location and temperature settings
        try:
            parsed_metadata = eval(metadata) if metadata else {}
        except:
            parsed_metadata = {}
            
        parsed_metadata.update({
            'lat': 37.526194,  # Fixed latitude
            'lon': -77.330009,  # Fixed longitude
            'units': 'metric',  # Always use Celsius for temperature
            'farmer_id': parsed_metadata.get('farmer_id', 'f001'),  # Default farmer_id if not provided
        })

        # Prepare the request for the existing agent endpoint
        agent_request = AgentRequest(
            user_prompt=transcribed_text,
            metadata=parsed_metadata,
            user_id=user_id,
            session_id=session_id
        )

        print(agent_request)

        # Call the existing agent endpoint with audio support
        result = await agent_endpoint_with_audio(agent_request)
        
        # Add the transcribed text to the result
        result["transcribed_text"] = transcribed_text
        result["detected_language"] = detected_language
        
        print(f"✅ Audio agent response: {result}")
        return result
        
    except Exception as e:
        print(f"❌ Error in audio_agent_endpoint: {e}")
        return {"error": f"Processing error: {str(e)}"}


@app.post("/agent")
async def agent_endpoint(request: AgentRequest):
    try:
        # Initialize or reuse session service
        ss = DatabaseSessionService(DATABASE_URL)
        prompt = request.metadata or {}
        prompt['user_prompt'] = request.user_prompt
        # Get or create session
        session = await ss.get_session(
            app_name="agri_agent",
            user_id=request.user_id,
            session_id=request.session_id
        )
        if not session:
            session = await ss.create_session(
                app_name="agri_agent",
                user_id=request.user_id,
                session_id=request.session_id
            )
        # Build runner
        runner = Runner(
            agent=root_agent,
            app_name="agri_agent",
            session_service=ss
        )

        print(f"Running agent with prompt: {prompt}")

        # Prepare user message
        content = types.Content(role="user", parts=[types.Part(text=str(prompt))])

        invoked_tool: Optional[str] = None
        tool_result: Any = None
        response_text: str = ""

        # Stream through events
        async for event in runner.run_async(
            user_id=request.user_id,
            session_id=request.session_id,
            new_message=content
        ):
            # Record tool invocation
            if getattr(event.content.parts[0], 'function_call', None):
                invoked_tool = event.content.parts[0].function_call.name
                continue
            # Capture tool response
            if getattr(event.content.parts[0], 'function_response', None):
                tool_result = event.content.parts[0].function_response.response
            # Capture final LLM response
            if event.is_final_response():
                response_text = "".join(part.text for part in event.content.parts)
                break
        return {
            "invoked_tool": invoked_tool,
            "tool_result": tool_result,
            "response_text": response_text,
        }
    except Exception as e:
        print(f"❌ Error in agent_endpoint: {e}")
        return {"error": f"Processing error: {str(e)}"}

@app.post("/agent_with_audio")
async def agent_endpoint_with_audio(request: AgentRequest):
    try:
        # Initialize or reuse session service
        ss = DatabaseSessionService(DATABASE_URL)
        prompt = request.metadata or {}
        prompt['user_prompt'] = request.user_prompt
        # Get or create session
        session = await ss.get_session(
            app_name="agri_agent",
            user_id=request.user_id,
            session_id=request.session_id
        )
        if not session:
            session = await ss.create_session(
                app_name="agri_agent",
                user_id=request.user_id,
                session_id=request.session_id
            )
        # Build runner
        runner = Runner(
            agent=root_agent,
            app_name="agri_agent",
            session_service=ss
        )

        print(f"Running agent with prompt: {prompt}")

        # Prepare user message
        content = types.Content(role="user", parts=[types.Part(text=str(prompt))])

        invoked_tool: Optional[str] = None
        tool_result: Any = None
        response_text: str = ""
        audio_base64: str = ""

        # Stream through events
        async for event in runner.run_async(
            user_id=request.user_id,
            session_id=request.session_id,
            new_message=content
        ):
            # Record tool invocation
            if getattr(event.content.parts[0], 'function_call', None):
                invoked_tool = event.content.parts[0].function_call.name
                continue
            # Capture tool response
            if getattr(event.content.parts[0], 'function_response', None):
                tool_result = event.content.parts[0].function_response.response
                # Check if the tool result contains audio
                if isinstance(tool_result, dict) and 'audio' in tool_result:
                    audio_base64 = tool_result.get('audio', '')
            # Capture final LLM response
            if event.is_final_response():
                response_text = "".join(part.text for part in event.content.parts)
                break
        
        # If no audio was generated by the tool, generate it from the response text
        if not audio_base64 and response_text:
            print(f"🎵 Generating audio for response text: {response_text[:100]}...")
            try:
                from services.text_to_speech import text_to_speech, detect_language
                detected_language = detect_language(response_text)
                print(f"🎵 Detected language: {detected_language}")
                audio_base64 = text_to_speech(response_text, detected_language)
                print(f"🎵 Generated audio length: {len(audio_base64) if audio_base64 else 0}")
            except Exception as e:
                print(f"❌ Error generating audio: {e}")
                audio_base64 = ""
        else:
            print(f"🎵 Audio from tool: {len(audio_base64) if audio_base64 else 0}")
        
        print(f"🎵 Final audio length: {len(audio_base64) if audio_base64 else 0}")
        
        return {
            "invoked_tool": invoked_tool,
            "tool_result": tool_result,
            "response_text": response_text,
            "audio": audio_base64,
        }
    except Exception as e:
        print(f"❌ Error in agent_endpoint_with_audio: {e}")
        return {"error": f"Processing error: {str(e)}"}
