import sys
import json
import random
import os
import logging
import urllib
import ssl
import librosa
import numpy as np
from tensorflow.keras.models import load_model

# Set up logging
logging.basicConfig(filename='getGenre.log', level=logging.DEBUG, format='%(asctime)s %(message)s')

# Get the song URL from the command line arguments
mp3_url = sys.argv[1]
genres = ['Blues', 'Classical', 'Country', 'Disco', 'HipHop', 'Jazz', 'Metal', 'Pop', 'Reggae', 'Rock']

#categories = ["rock", "pop", "classical", "hiphop", "country", "latin", "edm_dance", "jazz"]
categories = ["Rock", "Pop", "Classical", "HipHop", "Country", "Reggae", "Disco", "Jazz"]


def getSpectogram(filePath, duration=5, noise_factor=0.005):
    y, sr = librosa.load(filePath, duration=duration)
    y_noisy = y + noise_factor * np.random.normal(size=y.shape)
    mel_spec = librosa.feature.melspectrogram(y=y_noisy, sr=sr, n_mels=64)
    total_frames = mel_spec.shape[1]
    start_idx = random.randint(0, max(total_frames - 256, 0))
    mel_spec_slice = mel_spec[:, start_idx:start_idx + 256]
    mel_spec_db = librosa.power_to_db(mel_spec_slice, ref=np.max)
    return mel_spec_db

# Extract spectrogram from the user-input song
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    # Legacy Python that doesn't verify HTTPS certificates by default
    pass
else:
    # Handle target environment that doesn't support HTTPS verification
    ssl._create_default_https_context = _create_unverified_https_context


try:
    urllib.request.urlretrieve(mp3_url, "filename.mp3")
    new_spectrogram = getSpectogram("filename.mp3")
    model_path = 'genre_model.h5'
    loaded_model = load_model(model_path)

    prediction = loaded_model.predict(np.expand_dims(new_spectrogram, axis=0),verbose=None)
    predicted_genre_index = np.argmax(prediction)
    predicted_genre = categories[predicted_genre_index]
    logging.debug(prediction)
    result = {'genre': predicted_genre}
    os.remove("filename.mp3")
    print(json.dumps(result))

except Exception as e:

    result = {'genre': 'Blues'}
    print(json.dumps(result))

