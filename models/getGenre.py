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
import math
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

# Set up logging
logging.basicConfig(filename='models/getGenre.log', level=logging.ERROR, format='%(asctime)s %(message)s')

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
tf.get_logger().setLevel('ERROR')

# Suppress specific UserWarnings
warnings.filterwarnings('ignore', category=UserWarning, message='.*input_shape.*')
warnings.filterwarnings('ignore', category=UserWarning, message='.*Argument `alpha` is deprecated.*')
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# Get the song URLs from the command line arguments
mp3_urls = sys.argv[1].split(',')
categories = ["rock", "pop", "classical", "hiphop", "country", "latin", "edm_dance", "jazz"]

def perform_pca(features):
    scaler = StandardScaler()
    normalized_features = scaler.fit_transform(features)

    pca = PCA(n_components=2)
    pca_result = pca.fit_transform(normalized_features)

    return pca_result


def spread_points(pca_results, min_distance=200, max_distance=1000):
    # Convert to polar coordinates
    r = np.sqrt(pca_results[:, 0]**2 + pca_results[:, 1]**2)
    theta = np.arctan2(pca_results[:, 1], pca_results[:, 0])

    # Normalize radius to [0, 1]
    r_normalized = (r - r.min()) / (r.max() - r.min())

    # Spread out the radius
    r_spread = min_distance + (max_distance - min_distance) * r_normalized

    # Convert back to Cartesian coordinates
    x = r_spread * np.cos(theta)
    z = r_spread * np.sin(theta)

    return x, z

def getAudioFeatures(filePath, duration=5, noise_factor=0.005):
    try:
        y, sr = librosa.load(filePath, duration=duration)
        y_noisy = y + noise_factor * np.random.normal(size=y.shape)

        # Mel spectrogram - this will be used for the classifier
        mel_spec = librosa.feature.melspectrogram(y=y_noisy, sr=sr, n_mels=64)
        total_frames = mel_spec.shape[1]
        start_idx = random.randint(0, max(total_frames - 256, 0))
        mel_spec_slice = mel_spec[:, start_idx:start_idx + 256]
        mel_spec_db = librosa.power_to_db(mel_spec_slice, ref=np.max)

        # Tempo and beat strength
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_strength = np.mean(librosa.onset.onset_strength(y=y, sr=sr))

        # RMS energy
        rms = np.mean(librosa.feature.rms(y=y)[0])

        # Spectral centroid
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0])

        # Spectral rolloff
        spectral_rolloff = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)[0])

        # Zero crossing rate
        zero_crossing_rate = np.mean(librosa.feature.zero_crossing_rate(y=y)[0])

        # Chroma features
        chroma = np.mean(librosa.feature.chroma_stft(y=y, sr=sr), axis=1)

    except Exception as e:
        logging.error(f"Error in getAudioFeatures: {e}")
        raise e

    return mel_spec_db, tempo, rms, beat_strength, spectral_centroid, spectral_rolloff, zero_crossing_rate, chroma

def calculate_position(loudness):
    min_distance = 200
    max_distance = 1300
    distance = min_distance + (max_distance - min_distance) * loudness
    theta = random.random() * math.pi * 2
    phi = math.acos(random.random() * 2 - 1)
    x = distance * math.sin(phi) * math.cos(theta)
    z = distance * math.cos(phi)
    return x, z


def process_song(mp3_url):
    try:
        base_url = mp3_url.rsplit('/', 1)[1]
        file_path = f'models/tempMP3Files/{base_url}.mp3'
        urllib.request.urlretrieve(mp3_url, file_path)

        mel_spec_db, tempo, rms, beat_strength, spectral_centroid, spectral_rolloff, zero_crossing_rate, chroma = getAudioFeatures(file_path)

        prediction = loaded_model.predict(np.expand_dims(mel_spec_db, axis=0), verbose=None)
        predicted_genre_index = np.argmax(prediction)
        predicted_genre = categories[predicted_genre_index]

        os.remove(file_path)
        x, z = calculate_position(rms)



        return {
            'url': mp3_url,
            'genre': predicted_genre,
            'features': [
                float(tempo),
                float(rms),
                float(np.mean(mel_spec_db)),
                float(np.max(mel_spec_db)),
                float(beat_strength),
                float(spectral_centroid),
                float(spectral_rolloff),
                float(zero_crossing_rate),
                float(np.mean(chroma))
            ]
        }

    except Exception as e:
        logging.error(f"Error processing {mp3_url}: {e}")
        return {
            'url': mp3_url,
            'genre': 'Error',
            'tempo': 0,
            'loudness': 0,
            'x': 0,
            'z': 0
        }

# Handle SSL context
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Load the model
loaded_model = load_model('models/genre_model2.h5', compile=False)

# Process all songs
results = []
all_features = []
for mp3_url in mp3_urls:
    result = process_song(mp3_url)
    if result['genre'] != 'Error':
        results.append(result)
        all_features.append(result['features'])

# Perform PCA and spread points if we have successfully processed songs
if all_features:
    pca_results = perform_pca(all_features)
    x_spread, z_spread = spread_points(pca_results)

    # Add spread results to the results
    for i, result in enumerate(results):
        result['x'] = float(x_spread[i])
        result['z'] = float(z_spread[i])
        del result['features']  # Remove the features array from the final output
else:
    print("No songs were successfully processed. Unable to perform PCA and spread points.")

# Print the results as JSON
print(json.dumps(results))