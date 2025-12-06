# UBA-LITE Deployment Guide

Deploy UBA-LITE for free on Render.com and get a live demo link!

---

## 🚀 Quick Deploy to Render.com (Recommended)

### Prerequisites
1. Create a free account at [render.com](https://render.com)
2. Push your code to GitHub (if not already)

### Step 1: Push to GitHub

If your code isn't on GitHub yet:

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - UBA-LITE Insider Threat Detection"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/uba-lite.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend (API)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `uba-lite-api`
   - **Root Directory:** (leave empty)
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `CORS_ORIGINS` = `https://uba-lite-frontend.onrender.com`
   - `SECRET_KEY` = (click "Generate" for random value)
   - `DATABASE_URL` = `sqlite:///./uba_lite.db`
6. Click **"Create Web Service"**
7. Wait for deploy (takes 2-5 minutes)
8. Copy your backend URL: `https://uba-lite-api.onrender.com`

### Step 3: Deploy Frontend

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Static Site"**
3. Connect the same GitHub repository
4. Configure:
   - **Name:** `uba-lite-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
5. Add Environment Variables:
   - `REACT_APP_API_URL` = `https://uba-lite-api.onrender.com/api`
6. Click **"Create Static Site"**
7. Wait for deploy (takes 3-5 minutes)

### Step 4: Get Your Demo Link! 🎉

Your app is now live at:
- **Frontend:** `https://uba-lite-frontend.onrender.com`
- **Backend API:** `https://uba-lite-api.onrender.com`
- **API Docs:** `https://uba-lite-api.onrender.com/docs`

---

## 📋 Alternative: One-Click Deploy with render.yaml

If you have the `render.yaml` file in your repo:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` and create both services
5. Click **"Apply"**

---

## ⚠️ Important Notes

### Free Tier Limitations
- **Sleep mode:** Free services sleep after 15 minutes of inactivity
- **Wake time:** First request after sleep takes 30-60 seconds
- **Perfect for:** Demos, portfolios, presentations

### Database Note
- SQLite works fine for demos
- For production, consider upgrading to PostgreSQL (Render offers free PostgreSQL)

### Custom Domain (Optional)
You can add a custom domain in Render dashboard for free:
- `uba-lite.yourdomain.com`

---

## 🔧 Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r ../requirements.txt
python main.py

# Frontend (new terminal)
cd frontend
npm install
npm start
```

---

## 📞 Troubleshooting

### "Application error" on frontend
- Check that `REACT_APP_API_URL` is set correctly
- Make sure backend is running

### API returns CORS error
- Add your frontend URL to `CORS_ORIGINS` in backend env vars
- Redeploy backend

### Login not working
- Clear browser localStorage
- Check backend logs in Render dashboard

---

## 🎥 Demo Video Script

Once deployed, share your demo link:

> "Check out UBA-LITE, my insider threat detection system!
> Live demo: https://uba-lite-frontend.onrender.com
> 
> Features:
> - Upload log files for analysis
> - ML-powered anomaly detection
> - Real-time risk scoring
> - Beautiful analytics dashboard"

---

**Deployed successfully? Star the repo! ⭐**
