# Prospecting Actor — Professional Lead Qualification Engine

A production-ready **Apify Actor** that discovers public social media profiles for any professional persona (e.g. Social Media Manager, Graphic Designer, Copywriter, Content Creator), extracts public metadata, applies filters, performs rule & AI classification, scores leads, and outputs deduplicated records to the Apify Dataset.

---

## Features

- **Persona Configurable**: Operates dynamically based on `profile_type` without hardcoded categories.
- **Multi-Phase Pipeline**: Discovery → Public Scraping → Cheap Filtering → Normalization → Signal Detection → AI Classification → Weighted Scoring → Deduplication.
- **Search Dorking Discovery**: Automatically finds candidate profiles via search engine dorking (`site:instagram.com ...`).
- **Free LLM Provider**: Pre-configured with **Google Gemini (free tier)** as default provider, with support for OpenAI and OpenRouter.
- **Graceful Fallbacks**: Failed AI requests or missing API keys fall back to rule-based signal detection without failing the Actor run.
- **Deduplication Engine**: Uses canonical `platform:username` keys to eliminate duplicates across discovery and manual profile inputs.

---

## Local Setup & Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and add your free Google AI Studio key:
   ```bash
   cp .env.example .env
   ```
   Set `GEMINI_API_KEY=your_gemini_api_key_here`.

3. **Run Unit Test Suite**:
   ```bash
   npm test
   ```

4. **Run Actor Locally**:
   ```bash
   npm start
   ```

---

## Input Configuration Example (`input.json`)

```json
{
  "platform": "instagram",
  "profile_type": "social_media_manager",
  "location": "India",
  "min_followers": 1000,
  "max_followers": 50000,
  "keywords": [
    "social media manager",
    "freelance social media manager",
    "social media specialist"
  ],
  "max_results": 50,
  "profile_urls": [],
  "llm_provider": "gemini"
}
```

---

## Dataset Output Example

Each qualified lead pushed to the **Apify Dataset** adheres to this strict structure:

```json
{
  "platform": "instagram",
  "name": "Priya Sharma",
  "username": "priya.social",
  "profile_url": "https://instagram.com/priya.social",
  "bio": "Freelance social media manager for D2C brands. Available for client projects.",
  "location": "Mumbai, India",
  "followers": 12400,
  "website": "https://priyasharma.design",
  "public_email": "hello@priyasharma.design",
  "verified": false,
  "freelancer_score": 80,
  "business_score": 0,
  "matched_signals": ["freelancer:freelance", "freelancer:available for projects"],
  "profession_signal_found": true,
  "profession": "Social Media Manager",
  "niche": "D2C Brands",
  "employment_type": "Freelancer",
  "profession_match": true,
  "freelancer_confidence": 0.94,
  "business_confidence": 0.1,
  "confidence": 0.95,
  "reason": "Explicitly offers social media management services in bio.",
  "profession_match_score": 95,
  "contactability_score": 100,
  "lead_score": 92,
  "qualification": "High",
  "qualification_reason": "Matched target profession. Public contact info available. Strong freelancer signals detected.",
  "scraped_at": "2026-08-14T00:50:00.000Z"
}
```

---

## Deploying to Apify Platform

1. Install Apify CLI:
   ```bash
   npm install -g apify-cli
   ```
2. Log in to your Apify account:
   ```bash
   apify login
   ```
3. Push the Actor to Apify:
   ```bash
   apify push
   ```

---

## Architecture & Code Structure

```text
src/
├── main.ts                     # Pipeline Entrypoint & Actor Orchestrator
├── types/                      # TypeScript Interfaces
├── config/                     # Input Schema & Zod Validation
├── discovery/                  # Platform & Search Dorking Candidate Generators
├── scraping/                   # Public Profile Metadata Extractors
├── processing/
│   ├── filters.ts              # Cheap Follower & Location Filters
│   ├── normalize.ts            # Canonical Data Normalizer
│   ├── freelancerDetector.ts   # Rule-based Signal Extractor
│   ├── classifier.ts           # LLM Classifier (Gemini / OpenAI)
│   ├── leadScore.ts            # 40/25/15/20 Weighted Lead Scoring Engine
│   └── deduplicate.ts          # Deduplication Key Manager
└── utils/                      # Helper & Logger Modules
```
