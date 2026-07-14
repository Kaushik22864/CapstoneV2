from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from utils.preprocess import preprocess_image

app = Flask(__name__)
CORS(app)

model = tf.keras.models.load_model("model/ensemble_oct.keras")
CLASSES = ["CNV", "DME", "DRUSEN", "NORMAL"]  # confirm this matches your training label order

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    try:
        image_bytes = request.files["image"].read()
        processed = preprocess_image(image_bytes)
        preds = model.predict(processed)[0]

        result = {
            "prediction": CLASSES[int(np.argmax(preds))],
            "confidence": float(np.max(preds)),
            "probabilities": {CLASSES[i]: float(p) for i, p in enumerate(preds)},
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(port=5001)