# Explain2Win: Comprehensive Setup Guide

This guide provides step-by-step instructions to configure external services and environment variables required to run **Explain2Win**.

Current stack assumptions:

- Database: Neon Postgres
- AI: Google Gemini via API key (Google AI Studio, NOT Vertex AI billing)
- Audio storage: AWS S3
- Auth: NextAuth (Google/GitHub OAuth)
- Billing: Stripe

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.x or higher)
- **pnpm** (v10.x or higher)
- **Git**

---

## 🛠️ Step 1: Database Setup (Neon PostgreSQL)

We use **Neon** for a serverless PostgreSQL database.

1.  Sign up at [neon.tech](https://neon.tech).
2.  Create a new project named `explain2win`.
3.  In the Dashboard, locate your **Connection String**.
4.  Ensure it is set to **Pooled Connection** (starts with `postgresql://...`) for serverless compatibility.
5.  Save this as `DATABASE_URL` in your `.env` file.

---

## 🤖 Step 2: Google AI Services (Gemini)

We use Google Gemini for transcription + quiz generation.

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Create an API key.
3.  Navigate to **API Keys** and click **Create API key**.
4.  Save this as `GOOGLE_API_KEY` in your environment.

Optional (advanced): override models via `GEMINI_TRANSCRIBE_MODEL`, `GEMINI_QUIZ_MODEL`, etc. See [.env.example](.env.example).

---

## ☁️ Step 3: Audio Storage (AWS S3)

We store recorded audio files in S3.

1. Create an S3 bucket (example name: `explain2win-audio`).
2. Create an IAM user (or IAM role in production) with permission to put objects into that bucket.
3. Set these environment variables:
   - `AWS_REGION`
   - `AWS_S3_BUCKET`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

Notes:

- The app uploads server-side via `/api/upload`.
- The API returns a signed URL, so your bucket can remain private.

---

## 🔑 Step 4: Authentication (NextAuth.js & OAuth)

1.  **Auth Secret**: Generate a secure random string.
    - Command: `openssl rand -base64 32`
    - Save as `NEXTAUTH_SECRET`.
2.  **Google OAuth**:
    - Go to GCP Console -> APIs & Services -> Credentials.
    - Create **OAuth client ID** (Web application).
    - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3.  **GitHub OAuth**:
    - Go to GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App.
    - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

---

## 💳 Step 5: Payments & Billing (Stripe)

1.  Go to the [Stripe Dashboard](https://dashboard.stripe.com/).
2.  **API Keys**: Extract the **Publishable key** and **Secret key**.
3.  **Price IDs**: Create products for Pro and Premium tiers.
4.  Update `.env` with `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, and the Price IDs.

Webhook:

- Add a webhook endpoint in Stripe pointing to `http://localhost:3000/api/webhooks/stripe` for local testing.
- Set `STRIPE_WEBHOOK_SECRET`.

---

## 🚀 Step 6: Finalizing & Running

1.  **Create .env File**:
    ```bash
    cp .env.example .env.local
    ```
2.  **Fill in all values** collected in the steps above.
3.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
4.  **Initialize Database**:
    ```bash
    pnpm db:generate
    pnpm db:push
    ```
5.  **Start Development Server**:
    ```bash
    pnpm dev
    ```

The application should now be running at `http://localhost:3000`.
