import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)
app.debug = True # Explicitly enable debug mode

logging.basicConfig(level=logging.DEBUG)

@app.route('/chat', methods=['POST'])
def chat():
    app.logger.debug("Chat function called!")
    data = request.json
    user_message = data.get('message')

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    app.logger.debug(f"Received message: {user_message}")
    return jsonify({"reply": f"Echo: {user_message}", "audio_url": ""})

if __name__ == '__main__':
    app.run(debug=True, port=5000)