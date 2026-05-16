import speech_recognition as sr
import time




def transcribir_audio(archivo_audio):
    recognizer = sr.Recognizer()


    with sr.AudioFile(archivo_audio) as source:
        audio_data = recognizer.record(source)
    texto = recognizer.recognize_google(audio_data, language='es-ES')
    return texto
