"""
Twitter Sentiment Analysis API
================================
Flask backend using NLTK VADER for sentiment analysis.
Supports single tweet analysis and batch CSV processing.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import csv
import io
import os
from sentiment_analyzer import SentimentAnalyzer

app = Flask(__name__)
CORS(app)  # Allow all origins for local dev; restrict in production

analyzer = SentimentAnalyzer()


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "name": "Twitter Sentiment Analysis API",
        "version": "1.0.0",
        "endpoints": {
            "POST /analyze": "Analyze a single tweet",
            "POST /analyze-batch": "Analyze multiple tweets (JSON array)",
            "POST /analyze-csv": "Upload and analyze a CSV file of tweets",
            "GET  /health": "API health check"
        }
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "API is running"}), 200


@app.route("/analyze", methods=["POST"])
def analyze_tweet():
    """
    Analyze sentiment of a single tweet.

    Body (JSON):
        { "text": "Your tweet text here" }

    Returns:
        JSON with sentiment label, scores, and emoji.
    """
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Request body must include a 'text' field."}), 400

    text = data["text"].strip()
    if not text:
        return jsonify({"error": "Tweet text cannot be empty."}), 400

    result = analyzer.analyze(text)
    return jsonify(result), 200


@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    """
    Analyze sentiment of multiple tweets at once.

    Body (JSON):
        { "tweets": ["tweet 1", "tweet 2", ...] }

    Returns:
        JSON array with results and aggregate statistics.
    """
    data = request.get_json()
    if not data or "tweets" not in data:
        return jsonify({"error": "Request body must include a 'tweets' array."}), 400

    tweets = data["tweets"]
    if not isinstance(tweets, list) or len(tweets) == 0:
        return jsonify({"error": "'tweets' must be a non-empty array."}), 400

    if len(tweets) > 500:
        return jsonify({"error": "Batch limit is 500 tweets per request."}), 400

    results = []
    for tweet in tweets:
        result = analyzer.analyze(str(tweet).strip())
        result["text"] = str(tweet).strip()
        results.append(result)

    stats = analyzer.aggregate_stats(results)
    return jsonify({"results": results, "statistics": stats}), 200


@app.route("/analyze-csv", methods=["POST"])
def analyze_csv():
    """
    Upload a CSV file with a 'text' column and get sentiment for each row.

    Form Data:
        file: CSV file with at least a 'text' column
        text_column (optional): column name containing tweet text (default: 'text')

    Returns:
        JSON with per-tweet results and aggregate statistics.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use multipart form-data with key 'file'."}), 400

    file = request.files["file"]
    text_column = request.form.get("text_column", "text")

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Only CSV files are accepted."}), 400

    try:
        content = file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))

        if text_column not in reader.fieldnames:
            available = list(reader.fieldnames)
            return jsonify({
                "error": f"Column '{text_column}' not found in CSV.",
                "available_columns": available
            }), 400

        results = []
        for i, row in enumerate(reader):
            if i >= 500:   # cap for free-tier safety
                break
            tweet_text = row.get(text_column, "").strip()
            if tweet_text:
                result = analyzer.analyze(tweet_text)
                result["text"] = tweet_text
                # Pass through any extra columns that exist
                for col in ["id", "username", "timestamp", "likes", "retweets"]:
                    if col in row:
                        result[col] = row[col]
                results.append(result)

        stats = analyzer.aggregate_stats(results)
        return jsonify({"results": results, "statistics": stats}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to process CSV: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
