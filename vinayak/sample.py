import os
from google.cloud import speech

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "creds_gcp.json"

client = speech.SpeechClient()

file_name = "sample.wav"  

with open(file_name, "rb") as audio_file:
    content = audio_file.read()

audio = speech.RecognitionAudio(content=content)
config = speech.RecognitionConfig(
    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
    sample_rate_hertz=44100,
    language_code="es-ES"  # <-- set to Spanish
)

response = client.recognize(config=config, audio=audio)

for result in response.results:
    print("Transcript:", result.alternatives[0].transcript)
