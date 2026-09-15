# 🚀 DAKSHA (StatSaksham AI) — Production Deployment Guide

This guide provides end-to-end instructions for deploying the **DAKSHA** platform:
- **Backend (FastAPI Python):** Deployed to **Render** (Free Web Service)
- **Frontend (React + Vite SPA):** Deployed to **Vercel** (Free Edge Hosting)

---

## Architecture Overview

```
┌────────────────────────────────────────┐
│             Vercel                     │
│    DAKSHA Frontend (React + Vite)      │
│  https://daksha-mospi.vercel.app       │
└──────────────────┬─────────────────────┘
                   │
                   │ HTTPS API Requests (VITE_API_BASE_URL)
                   ▼
┌────────────────────────────────────────┐
│             Render                     │
│    FastAPI Unified Backend             │
│  https://daksha-backend.onrender.com   │
└────────────────────────────────────────┘
```

---

## Part 1: Deploy Backend to Render

### Option A: Using Render Blueprints (Recommended - 1 Click)
1. Go to [dashboard.render.com](https://dashboard.render.com) and log in.
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository: `https://github.com/sanvisawant/CTRL-HER`.
4. Render will automatically detect the root [`render.yaml`](./render.yaml).
5. Enter any required environment variables (e.g. `GEMINI_API_KEY` if you have Google Gemini AI enabled).
6. Click **Apply**. Render will install dependencies and start the backend.

### Option B: Manual Web Service Setup on Render
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
2. Select your repository `https://github.com/sanvisawant/CTRL-HER`.
3. Configure the following fields:
   - **Name:** `daksha-backend`
   - **Region:** Any (e.g., *Oregon* or *Singapore*)
   - **Branch:** `main`
   - **Root Directory:** `backend` *(Important!)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
4. Add **Environment Variables** (under Advanced):
   - `PYTHON_VERSION`: `3.11.9`
   - `ENVIRONMENT`: `production`
   - `GEMINI_API_KEY`: *(Your Google AI Studio API key, optional for mock/fallback)*
5. Click **Create Web Service**.
6. Once deployed, note down your live backend URL (e.g. `https://daksha-backend.onrender.com`).
7. Verify it is running by opening:
   - Health check: `https://daksha-backend.onrender.com/health`
   - API Docs: `https://daksha-backend.onrender.com/docs`

---

## Part 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** → **Project**.
3. Select your repository: `sanvisawant/CTRL-HER`.
4. In the **Configure Project** screen:
   - **Framework Preset:** Select `Vite`.
   - **Root Directory:** Click **Edit** and choose `frontend` *(Crucial step!)*.
   - **Build Command:** `npm run build` (Default)
   - **Output Directory:** `dist` (Default)
   - **Install Command:** `npm install` (Default)
5. Expand the **Environment Variables** section:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://daksha-backend.onrender.com` *(Paste your Render backend URL without a trailing slash)*
6. Click **Deploy**.
7. Vercel will build the frontend bundle using [`frontend/vercel.json`](./frontend/vercel.json) to configure SPA routing rewrites.
8. Once finished, you will receive your live URL (e.g., `https://ctrl-her.vercel.app`).

---

## Part 3: Verify the Deployment

1. Open your live Vercel URL in your browser.
2. Verify the **Landing Page (`/`)**:
   - Check the trilingual toggle (`English | हिन्दी | मराठी`).
   - Click **About** to confirm smooth scrolling directly to the dedicated About section.
3. Click **Officer Login** to access the sign-in screen (`/login`).
4. Test with any persona or sign in with test credentials:
   - **Learner:** `sanvi.sawant@gov.in` (password: any test string)
   - **Trainer:** Switch to Dr. Alok Sharma
   - **Admin:** Switch to Rajesh Kumar
5. Verify the dashboard, competency twin, and learning views connect cleanly to the live Render backend.

---

## Troubleshooting Common Issues

### 1. 404 on Page Refresh on Vercel
- **Cause:** Static servers attempt to find `/login.html` instead of serving `index.html` for client routes.
- **Solution:** Handled automatically by [`frontend/vercel.json`](./frontend/vercel.json) with `rewrites: [{"source": "/(.*)", "destination": "/index.html"}]`.

### 2. CORS Error in Browser Console
- **Cause:** Backend rejecting API calls from the Vercel domain.
- **Solution:** [`backend/main.py`](./backend/main.py) is pre-configured with `allow_origins=["*"]` and `allow_credentials=True`.

### 3. Render Free Tier Cold Starts
- **Notice:** Free Render instances sleep after 15 minutes of inactivity. The first request after sleeping may take 30–50 seconds while the instance boots. Subsequent requests are instant.
