import sys
import json
import random
import os
import logging
import urllib.request
import ssl
import librosa
import numpy as np
from tensorflow.keras.models import load_model
import tensorflow as tf
import warnings


# Set up logging
logging.basicConfig(filename='models/getGenre.log', level=logging.ERROR, format='%(asctime)s %(message)s')

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
tf.get_logger().setLevel('ERROR')

# Suppress specific UserWarnings
warnings.filterwarnings('ignore', category=UserWarning, message='.*input_shape.*')

# Get the song URL from the command line arguments
mp3_url = sys.argv[1]
categories = ["rock", "pop", "classical", "hiphop", "country", "latin", "edm_dance", "jazz"]

def getSpectogram(filePath, duration=5, noise_factor=0.005):
    try:
        y, sr = librosa.load(filePath, duration=duration)
        y_noisy = y + noise_factor * np.random.normal(size=y.shape)
        mel_spec = librosa.feature.melspectrogram(y=y_noisy, sr=sr, n_mels=64)
        total_frames = mel_spec.shape[1]
        start_idx = random.randint(0, max(total_frames - 256, 0))
        mel_spec_slice = mel_spec[:, start_idx:start_idx + 256]
        mel_spec_db = librosa.power_to_db(mel_spec_slice, ref=np.max)

        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        rms = librosa.feature.rms(y=y)
        rms = float(np.mean(rms[0]))

    except Exception as e:
        logging.error(f"Error in getSpectogram: {e}")
        raise e

    return mel_spec_db, tempo, rms

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
    base_url = mp3_url.rsplit('/', 1)[1]
    urllib.request.urlretrieve(mp3_url, 'models/tempMP3Files/'+base_url+".mp3")
    new_spectrogram, tempo, rms = getSpectogram('models/tempMP3Files/'+base_url+".mp3")

    loaded_model = load_model('models/genre_model.h5', compile=False)


    prediction = loaded_model.predict(np.expand_dims(new_spectrogram, axis=0), verbose=None)
    predicted_genre_index = np.argmax(prediction)
    predicted_genre = categories[predicted_genre_index]

    result = {'genre': predicted_genre, 'tempo': tempo[0], 'loudness': rms}
    os.remove('models/tempMP3Files/'+base_url+".mp3")

    logging.error(prediction)

    logging.info(f"Prediction result: {result}")
    print(json.dumps(result))

except Exception as e:
    logging.error(e)
    result = {'genre': 'Blues'}
    print(json.dumps(result))
