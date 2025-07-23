from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import os
from google.cloud import speech

router = APIRouter(prefix="/speech-to-text", tags=["speech-to-text"])

# Set Google credentials (assume creds_gcp.json is in backend directory)
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "creds_gcp.json"

@router.post("/")
async def speech_to_text(file: UploadFile = File(...)):
    if not file.filename.endswith('.wav'):
        raise HTTPException(status_code=400, detail="Only .wav files are supported.")
    try:
        # content = await file.read()
        # print(content)
        client = speech.SpeechClient()
        # print(client)
        
        file_name = "uploaded.wav"  
        with open(file_name, "rb") as audio_file:
            content = audio_file.read()
        audio = speech.RecognitionAudio(content=content)
        # print(audio)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=44100,
            language_code="en-US"  # You can make this dynamic if needed
        )
        response = client.recognize(config=config, audio=audio)
        print("Response is",response)
        transcript = " ".join([result.alternatives[0].transcript for result in response.results])
        return JSONResponse(content={"transcript": transcript})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 