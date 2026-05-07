"""
Sentiment Analyzer Module
==========================
Uses NLTK's VADER (Valence Aware Dictionary and sEntiment Reasoner),
specifically designed for social-media text. VADER understands:
  - Slang and abbreviations ("LOL", "OMG")
  - Emojis and emoticons  (😍, :), :-()
  - Capitalization        (GREAT vs great)
  - Punctuation emphasis  (great!!! vs great)
  - Degree modifiers      ("very", "kind of", "somewhat")

Optional SpaCy integration is included for entity extraction.
"""

import re
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from collections import Counter

# ---------- one-time downloads (safe to call repeatedly) ----------
def _ensure_nltk_data():
    resources = [
        ("sentiment/vader_lexicon.zip", "vader_lexicon"),
        ("tokenizers/punkt",            "punkt"),
        ("corpora/stopwords",           "stopwords"),
        ("tokenizers/punkt_tab",        "punkt_tab"),
    ]
    for path, name in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(name, quiet=True)

_ensure_nltk_data()
# ------------------------------------------------------------------


class SentimentAnalyzer:
    """
    Wraps NLTK VADER to provide:
      - Single-tweet sentiment (positive / negative / neutral)
      - Confidence scores for each class
      - Keyword extraction
      - Aggregate statistics over a batch of results
    """

    EMOJI_SENTIMENT = {
        "😍": 0.8,  "❤️": 0.7,  "🎉": 0.9,  "😊": 0.6,  "🔥": 0.5,
        "👍": 0.5,  "💪": 0.6,  "✨": 0.5,  "🙏": 0.4,  "🌅": 0.4,
        "😡": -0.8, "😤": -0.7, "💔": -0.6, "😢": -0.5, "👎": -0.5,
        "😠": -0.7, "🤬": -0.9, "😭": -0.4,
    }

    def __init__(self):
        self._vader = SentimentIntensityAnalyzer()
        self._stop_words = set(stopwords.words("english"))

        # Inject extra social-media slang into the VADER lexicon
        extra_lexicon = {
            "awesome": 3.5, "amazing": 3.5, "fantastic": 3.5,
            "terrible": -3.5, "awful": -3.5, "horrible": -3.5,
            "lol": 1.5, "lmao": 1.5, "omg": 1.5, "smh": -1.5,
            "salty": -1.5, "goat": 2.0, "fire": 2.0, "lit": 2.0,
            "trash": -2.5, "cringe": -2.0, "toxic": -3.0,
        }
        self._vader.lexicon.update(extra_lexicon)

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def analyze(self, text: str) -> dict:
        """
        Analyse a single tweet and return a rich result dict.

        Returns:
            {
              "label":      "positive" | "negative" | "neutral",
              "emoji":      "😊" | "😠" | "😐",
              "scores": {
                "positive": float,   # 0-1
                "negative": float,
                "neutral":  float,
                "compound": float    # -1 to +1  (VADER raw)
              },
              "confidence": float,   # 0-100 (%)
              "keywords":   [str, ...]
            }
        """
        cleaned = self._clean_text(text)
        scores  = self._vader.polarity_scores(cleaned)

        # Boost compound with emoji signals
        emoji_boost = self._emoji_score(text)
        adjusted_compound = max(-1.0, min(1.0, scores["compound"] + emoji_boost * 0.1))

        label, emoji = self._classify(adjusted_compound)
        confidence   = self._confidence(scores, label)
        keywords     = self._extract_keywords(cleaned)

        return {
            "label":      label,
            "emoji":      emoji,
            "scores": {
                "positive": round(scores["pos"], 4),
                "negative": round(scores["neg"], 4),
                "neutral":  round(scores["neu"], 4),
                "compound": round(adjusted_compound, 4),
            },
            "confidence": confidence,
            "keywords":   keywords,
        }

    def aggregate_stats(self, results: list) -> dict:
        """
        Compute summary statistics over a list of analyse() results.
        Each item must have at minimum {"label": ..., "scores": {...}}.
        """
        if not results:
            return {}

        labels = [r["label"] for r in results]
        counter = Counter(labels)
        total = len(labels)

        compounds = [r["scores"]["compound"] for r in results]
        avg_compound = round(sum(compounds) / total, 4)

        return {
            "total": total,
            "positive": counter.get("positive", 0),
            "negative": counter.get("negative", 0),
            "neutral":  counter.get("neutral",  0),
            "positive_pct": round(counter.get("positive", 0) / total * 100, 1),
            "negative_pct": round(counter.get("negative", 0) / total * 100, 1),
            "neutral_pct":  round(counter.get("neutral",  0) / total * 100, 1),
            "average_compound": avg_compound,
            "overall_sentiment": self._classify(avg_compound)[0],
        }

    # ------------------------------------------------------------------ #
    #  Private helpers                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _clean_text(text: str) -> str:
        """Remove URLs, @mentions, and excess whitespace."""
        text = re.sub(r"http\S+|www\.\S+", "", text)          # URLs
        text = re.sub(r"@\w+", "", text)                       # @mentions
        text = re.sub(r"#(\w+)", r"\1", text)                  # keep hashtag word
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _emoji_score(self, text: str) -> float:
        """Sum emoji sentiment weights found in the tweet."""
        total = 0.0
        for char in text:
            total += self.EMOJI_SENTIMENT.get(char, 0.0)
        return total

    @staticmethod
    def _classify(compound: float):
        """
        Map compound score to a (label, emoji) tuple.
        Thresholds follow VADER's recommended values.
        """
        if compound >= 0.05:
            return "positive", "😊"
        elif compound <= -0.05:
            return "negative", "😠"
        else:
            return "neutral", "😐"

    @staticmethod
    def _confidence(scores: dict, label: str) -> float:
        """
        Derive a 0-100 % confidence figure from the VADER score distribution.
        """
        mapping = {"positive": "pos", "negative": "neg", "neutral": "neu"}
        key = mapping.get(label, "neu")
        raw = scores.get(key, 0.33)
        return round(raw * 100, 1)

    def _extract_keywords(self, text: str, top_n: int = 5) -> list:
        """
        Tokenise and return the top-N non-stopword content words.
        """
        try:
            tokens = word_tokenize(text.lower())
        except Exception:
            tokens = text.lower().split()

        words = [
            w for w in tokens
            if w.isalpha()
            and w not in self._stop_words
            and len(w) > 2
        ]
        most_common = Counter(words).most_common(top_n)
        return [word for word, _ in most_common]
