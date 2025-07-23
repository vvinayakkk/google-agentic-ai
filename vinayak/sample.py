import os
from google.cloud import speech

# Set the path to your GCP credentials JSON file
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "creds_gcp.json"

# Create a Speech client
client = speech.SpeechClient()

# Load your audio file
file_name = "uploaded.wav"

with open(file_name, "rb") as audio_file:
    content = audio_file.read()

# Configure the recognition settings
audio = speech.RecognitionAudio(content=content)
config = speech.RecognitionConfig(
    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
    sample_rate_hertz=44100,
    language_code="en-IN"  # <-- set to English
)

# Perform speech recognition
response = client.recognize(config=config, audio=audio)

# Print the transcribed text
for result in response.results:
    print("Transcript:", result.alternatives[0].transcript)
