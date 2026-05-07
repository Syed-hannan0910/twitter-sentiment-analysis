# 🐦 TweetSense — Twitter Sentiment Analysis

> **Classify tweets as Positive 😊 · Negative 😠 · Neutral 😐**  
> Built with Python · NLTK VADER · Flask · Vanilla JS

```
┌─────────────────────────────────────────────────────────────┐
│   Tweet  ──►  NLTK VADER NLP  ──►  Sentiment + Confidence   │
│   Input  ──►  Score Bars      ──►  Keywords + Compound       │
│   CSV    ──►  Batch Analysis  ──►  Charts + Export           │
└─────────────────────────────────────────────────────────────┘
```

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/twitter-sentiment-analysis)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 📑 Table of Contents

1. [What This Project Does](#-what-this-project-does)
2. [Architecture Overview](#-architecture-overview)
3. [Project Structure](#-project-structure)
4. [Tech Stack & Why](#-tech-stack--why)
5. [Understanding NLTK VADER](#-understanding-nltk-vader)
6. [Quick Start (Local)](#-quick-start-local)
7. [API Reference](#-api-reference)
8. [Publish to GitHub](#-publish-to-github)
9. [Deploy: Frontend → Vercel](#-deploy-frontend--vercel-free)
10. [Deploy: Backend → Render](#-deploy-backend--render-free)
11. [Host It Yourself](#-host-it-yourself)
12. [Customisation Guide](#-customisation-guide)
13. [Learning Resources](#-learning-resources)
14. [Contributing](#-contributing)
15. [License](#-license)

---

## 🎯 What This Project Does

TweetSense is a full-stack **Natural Language Processing** application that:

- **Analyses** individual tweets and returns `positive`, `negative`, or `neutral` classification
- **Shows confidence scores** (positive %, negative %, neutral %) and a compound score (−1 to +1)
- **Extracts keywords** from each tweet
- **Processes batches** of tweets from a CSV file with aggregate statistics and charts
- **Exposes a REST API** that any frontend, mobile app, or script can call

### Sentiment Score Quick Reference

```
Compound ≥ +0.05  →  POSITIVE 😊
Compound ≤ −0.05  →  NEGATIVE 😠
−0.05 < c < +0.05 →  NEUTRAL  😐
```

---

## 🏛️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌─────────────────────────────────────────────────────┐     │
│  │         Frontend  (Vercel — Free)                   │     │
│  │   index.html · style.css · app.js · Chart.js        │     │
│  └───────────────────────┬─────────────────────────────┘     │
└──────────────────────────│───────────────────────────────────┘
                           │  HTTP/JSON  (REST API)
┌──────────────────────────▼───────────────────────────────────┐
│                  Backend  (Render — Free)                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │   Flask  app.py                                      │    │
│  │     └── sentiment_analyzer.py                        │    │
│  │           └── NLTK VADER  +  custom lexicon          │    │
│  │           └── Keyword extraction (NLTK tokenizer)    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
twitter-sentiment-analysis/
│
├── backend/                     # Python Flask API
│   ├── app.py                   # Route definitions
│   ├── sentiment_analyzer.py    # VADER NLP core logic
│   ├── requirements.txt         # Python dependencies
│   ├── Procfile                 # Gunicorn start command (Render)
│   └── .env.example             # Environment variable template
│
├── frontend/                    # Static web dashboard
│   ├── index.html               # Main UI (3 tabs)
│   ├── style.css                # Dark dashboard styles
│   └── app.js                   # API calls, charts, interactivity
│
├── data/
│   └── sample_tweets.csv        # 30 labelled tweets for testing
│
├── notebooks/
│   └── sentiment_analysis.ipynb # Jupyter exploration notebook
│
├── .gitignore
├── vercel.json                  # Vercel (frontend) deployment config
├── render.yaml                  # Render (backend) deployment config
└── README.md
```

---

## 🛠️ Tech Stack & Why

| Layer | Technology | Why |
|-------|-----------|-----|
| **NLP Engine** | NLTK VADER | Purpose-built for social media; handles emojis, slang, and caps without training data |
| **Entity Analysis** | SpaCy (optional) | Add named entity recognition and POS tagging |
| **API** | Flask + Flask-CORS | Lightweight, easy to read, widely documented |
| **Server** | Gunicorn | Production WSGI server; handles concurrent requests |
| **Frontend** | Vanilla JS + Chart.js | Zero build step, instant deploy, fast |
| **Frontend Host** | Vercel (free) | CDN-backed static hosting, CI/CD from GitHub |
| **API Host** | Render (free) | Free Python web service with persistent disk |
| **Exploration** | Jupyter Notebook | Reproducible data science workflow |

---

## 🧠 Understanding NLTK VADER

VADER stands for **Valence Aware Dictionary and sEntiment Reasoner**. It was specifically designed for social-media text and is the gold standard for rule-based tweet sentiment.

### How VADER scores work

VADER analyses text and produces **four scores**:

```python
sia.polarity_scores("I absolutely LOVE this!! 😍")
# Output:
{
  "neg": 0.0,    # Proportion of negative tokens
  "neu": 0.187,  # Proportion of neutral tokens
  "pos": 0.813,  # Proportion of positive tokens
  "compound": 0.8779   # Normalised overall score (−1 to +1)
}
```

### What makes VADER special for tweets

```
Feature              Example                    Effect
──────────────────────────────────────────────────────────────
Capitalization       "GREAT" vs "great"         Boosts score
Punctuation          "great!!!" vs "great"      Boosts score
Emojis               😍 ❤️ 😡                  Direct scoring
Slang                "lol", "smh", "goat"       Custom lexicon
Degree modifiers     "very", "kind of"          Amplify/dampen
Negation             "not good" → negative       Handles flips
```

### SpaCy (Optional Enhancement)

SpaCy is included in `requirements.txt` for **named entity recognition** — for example, identifying that a tweet mentions "Apple" as a company rather than the fruit. You can extend `sentiment_analyzer.py` to tag entities.

```python
import spacy
nlp = spacy.load("en_core_web_sm")
doc = nlp("Apple just released a terrible product update.")
for ent in doc.ents:
    print(ent.text, ent.label_)
# Apple  ORG
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Python 3.9+ installed
- `pip` package manager
- A terminal (bash / zsh / PowerShell)

### Step 1 — Clone & enter the project

```bash
git clone https://github.com/YOUR_USERNAME/twitter-sentiment-analysis.git
cd twitter-sentiment-analysis
```

### Step 2 — Set up the Python backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (one-time)
python -c "
import nltk
nltk.download('vader_lexicon')
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('punkt_tab')
print('NLTK data ready!')
"

# (Optional) Download SpaCy model
python -m spacy download en_core_web_sm
```

### Step 3 — Start the backend

```bash
python app.py
# → Running on http://localhost:5000
```

### Step 4 — Open the frontend

Open `frontend/index.html` directly in your browser, **or** serve it with Python:

```bash
cd ../frontend
python -m http.server 3000
# → http://localhost:3000
```

### Step 5 — Test the API

```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Just adopted a puppy! My heart is SO full of joy! 🐶❤️"}'
```

Expected response:

```json
{
  "label": "positive",
  "emoji": "😊",
  "scores": {
    "positive": 0.582,
    "negative": 0.0,
    "neutral": 0.418,
    "compound": 0.8316
  },
  "confidence": 58.2,
  "keywords": ["adopted", "puppy", "heart", "full", "joy"]
}
```

### Step 6 — Run the Jupyter Notebook (Optional)

```bash
cd ../notebooks
pip install jupyter matplotlib seaborn
jupyter notebook sentiment_analysis.ipynb
```

---

## 🔌 API Reference

### `POST /analyze`
Analyse a single tweet.

**Request**
```json
{ "text": "Your tweet here" }
```

**Response**
```json
{
  "label":      "positive",
  "emoji":      "😊",
  "scores":     { "positive": 0.58, "negative": 0.0, "neutral": 0.42, "compound": 0.83 },
  "confidence": 58.2,
  "keywords":   ["love", "phone", "amazing"]
}
```

---

### `POST /analyze-batch`
Analyse up to 500 tweets at once.

**Request**
```json
{ "tweets": ["Tweet 1 text", "Tweet 2 text", "..."] }
```

**Response**
```json
{
  "results": [
    { "label": "positive", "emoji": "😊", "scores": {...}, "confidence": 72.1, "keywords": [...], "text": "Tweet 1" },
    { "label": "negative", "emoji": "😠", "scores": {...}, "confidence": 68.4, "keywords": [...], "text": "Tweet 2" }
  ],
  "statistics": {
    "total": 2,
    "positive": 1, "negative": 1, "neutral": 0,
    "positive_pct": 50.0, "negative_pct": 50.0, "neutral_pct": 0.0,
    "average_compound": 0.112,
    "overall_sentiment": "positive"
  }
}
```

---

### `POST /analyze-csv`
Upload a CSV file for batch analysis.

**Request** — multipart form-data:
- `file`: your `.csv` file
- `text_column` *(optional)*: column name with tweet text (default: `text`)

**CSV Format**
```
id,text,username
1,"I love this!",@user1
2,"This is terrible.",@user2
```

---

### `GET /health`
```json
{ "status": "ok", "message": "API is running" }
```

---

## 🐙 Publish to GitHub

### Step 1 — Create a new GitHub repository

Go to [github.com/new](https://github.com/new) and create a repo named `twitter-sentiment-analysis`. Keep it **public**.

### Step 2 — Push your code

```bash
# In the project root
git init
git add .
git commit -m "feat: initial commit — TweetSense sentiment analyser"

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/twitter-sentiment-analysis.git
git branch -M main
git push -u origin main
```

### Step 3 — Add a description and topics

On your GitHub repo page:
- Description: `"Twitter sentiment analysis tool using NLTK VADER · Flask API · Vercel + Render"`
- Topics: `nlp`, `sentiment-analysis`, `twitter`, `flask`, `nltk`, `python`, `machine-learning`

---

## 🚀 Deploy: Frontend → Vercel (Free)

Vercel hosts static sites for **free** with a global CDN.

### Option A — Vercel Dashboard (No CLI needed)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `twitter-sentiment-analysis` repository
4. Set **Root Directory** to `frontend`
5. Leave all other settings as defaults
6. Click **Deploy** — done in ~30 seconds!

Your URL will be: `https://twitter-sentiment-analysis.vercel.app`

### Option B — Vercel CLI

```bash
npm install -g vercel
cd twitter-sentiment-analysis
vercel --prod
# Follow prompts → choose "frontend" as root directory
```

### After deploying the backend, update `API_BASE` in `frontend/app.js`

```js
// Line 8 of app.js — replace with your Render URL
const API_BASE = "https://tweetsense-api.onrender.com";
```

Then redeploy:
```bash
vercel --prod
```

---

## ☁️ Deploy: Backend → Render (Free)

Render hosts Python web services for **free** (sleeps after 15 min inactivity on free tier).

### Step 1 — Go to Render

Visit [render.com](https://render.com) → **New Web Service** → Connect GitHub

### Step 2 — Configure the service

| Setting | Value |
|---------|-------|
| **Repository** | `twitter-sentiment-analysis` |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt && python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords'); nltk.download('punkt_tab')"` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| **Plan** | Free |

### Step 3 — Set environment variables

In Render → Environment tab:
```
FLASK_ENV = production
```

### Step 4 — Deploy

Click **Create Web Service**. First deploy takes ~3–4 minutes (installing packages). 

Your API URL will be: `https://tweetsense-api.onrender.com`

> **Note:** Free tier services sleep after 15 minutes of inactivity. The first request after sleep takes ~30s to wake up. Upgrade to Starter ($7/mo) to keep it awake.

---

## 🏠 Host It Yourself

Want to run TweetSense on your own server (VPS, Raspberry Pi, home server)?

### Option A — Basic Python server

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Clone and install
git clone https://github.com/YOUR_USERNAME/twitter-sentiment-analysis.git
cd twitter-sentiment-analysis/backend
pip install -r requirements.txt
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords')"

# 3. Run with gunicorn (keeps running in background)
gunicorn app:app --bind 0.0.0.0:5000 --workers 2 --daemon

# 4. Serve frontend with nginx or Python
cd ../frontend
python -m http.server 80   # basic
```

### Option B — Docker

```dockerfile
# Dockerfile (place in backend/)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords')"
COPY . .
EXPOSE 5000
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000", "--workers", "2"]
```

```bash
docker build -t tweetsense-api ./backend
docker run -p 5000:5000 tweetsense-api
```

### Option C — Nginx + SSL (Production)

```nginx
# /etc/nginx/sites-available/tweetsense
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    location / {
        root /var/www/tweetsense/frontend;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tweetsense /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourdomain.com   # Free SSL
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🎨 Customisation Guide

### Change sentiment thresholds

In `sentiment_analyzer.py`, modify the `_classify` method:

```python
@staticmethod
def _classify(compound: float):
    if compound >= 0.1:    # stricter positive threshold
        return "positive", "😊"
    elif compound <= -0.1: # stricter negative threshold
        return "negative", "😠"
    else:
        return "neutral", "😐"
```

### Add custom slang to the lexicon

In `SentimentAnalyzer.__init__`:

```python
extra_lexicon = {
    "banger": 3.0,   # very positive
    "mid": -1.0,     # mildly negative
    "bussin": 2.5,   # very positive
    "cap": -1.5,     # negative (as in "that's cap")
    "no cap": 2.0,   # positive
}
self._vader.lexicon.update(extra_lexicon)
```

### Add SpaCy entity recognition

In `sentiment_analyzer.py`, after `_ensure_nltk_data()`:

```python
import spacy
nlp = spacy.load("en_core_web_sm")

def extract_entities(text):
    doc = nlp(text)
    return [{"text": ent.text, "type": ent.label_} for ent in doc.ents]
```

### Switch the API to use a transformer model

For higher accuracy (at the cost of speed), swap VADER for a Hugging Face model:

```python
# pip install transformers torch
from transformers import pipeline
classifier = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")
result = classifier("I love this product!")
```

---

## 📚 Learning Resources

| Resource | What You'll Learn |
|----------|-----------------|
| [NLTK Book (free online)](https://www.nltk.org/book/) | NLP fundamentals, tokenization, corpora |
| [VADER Paper (Hutto & Gilbert)](https://ojs.aaai.org/index.php/ICWSM/article/view/14550) | How VADER was designed and validated |
| [SpaCy 101](https://spacy.io/usage/spacy-101) | Industrial-strength NLP pipeline |
| [Flask Mega-Tutorial](https://blog.miguelgrinberg.com/post/the-flask-mega-tutorial-part-i-hello-world) | Building production Flask APIs |
| [Chart.js Docs](https://www.chartjs.org/docs/latest/) | Creating interactive charts |
| [Hugging Face Transformers](https://huggingface.co/docs/transformers/index) | Next-level sentiment (BERT, RoBERTa) |
| [Render Free Tier Docs](https://render.com/docs/free) | Deployment limits and wake-up behaviour |
| [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview) | CDN, CI/CD, environment variables |

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-improvement`
3. Make your changes and write clear commit messages
4. Push: `git push origin feat/my-improvement`
5. Open a Pull Request with a description of what you changed

**Ideas for contributions:**
- [ ] Add Twitter/X API integration to analyse real tweets
- [ ] Implement topic modelling (LDA) alongside sentiment
- [ ] Add language detection + multi-language support
- [ ] Export batch results as CSV from the frontend
- [ ] Add dark/light mode toggle
- [ ] Write unit tests for the analyzer

---

## 📄 License

MIT License — free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ and Python · NLTK VADER · Flask · Vanilla JS

⭐ Star this repo if you found it useful!

</div>
