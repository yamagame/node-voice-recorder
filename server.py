import os
import shutil
import threading

from pathlib import Path
# from server_whisper import whisperTranscribe
from server_reazon import reazonTranscribe

from fastapi import FastAPI,File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
lock = threading.Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'])

class Transcribe(BaseModel):
    filename: str

@app.post("/wav/transcribe")
async def transcribeFromAPI(audio: Transcribe): #recieve data
    outputfile = os.path.join(os.environ.get('WAVE_FILE_DIR', "./work"), Path(audio.filename).stem + ".wav")

    lock.acquire()

    # whisperの場合
    # text = whisperTranscribe(outputfile)

    # reazonの場合
    text = reazonTranscribe(outputfile)

    lock.release()
    return {"filename": audio.filename, "text": text}
