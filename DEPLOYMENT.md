# Deployment Guide

This guide covers deploying the Slop Video Generator to production.

## Architecture

- **Frontend**: Static React SPA deployed to GitHub Pages
- **Backend**: Python FastAPI service deployed to Google Cloud Run

## Prerequisites

1. Google Cloud project with the following APIs enabled:
   - Cloud Run API
   - Artifact Registry API
   - Cloud Build API (optional, for manual deployments)

2. Artifact Registry Docker repository created:
   ```bash
   gcloud artifacts repositories create sloper \
     --repository-format=docker \
     --location=us-central1
   ```

3. Service account with the following roles:
   - Cloud Run Admin
   - Artifact Registry Writer
   - Service Account User

4. GitHub repository with Actions enabled

## GitHub Secrets

Configure these secrets in your repository (Settings → Secrets and variables → Actions → Secrets):

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Your Google Cloud project ID |
| `GCP_SA_KEY` | Service account JSON key (full JSON content, not base64) |

## GitHub Variables

Configure these variables in your repository (Settings → Secrets and variables → Actions → Variables):

| Variable | Description |
|----------|-------------|
| `BACKEND_URL` | Cloud Run service URL (set after first backend deployment) |

## Automatic Deployment

Both frontend and backend are automatically deployed when changes are pushed to the `main` branch.

### Frontend Deployment

Triggered by changes to:
- `frontend/**`
- `.github/workflows/deploy-frontend.yml`

The workflow:
1. Builds the Vite app with production environment
2. Deploys to GitHub Pages

### Backend Deployment

Triggered by changes to:
- `backend/**`
- `.github/workflows/deploy-backend.yml`

The workflow:
1. Builds Docker image
2. Pushes to Artifact Registry
3. Deploys to Cloud Run with:
   - 2GB memory
   - 300s timeout
   - Unauthenticated access allowed

## Manual Deployment

### Frontend

```bash
cd frontend
npm ci
VITE_BACKEND_URL=https://your-backend-url npm run build
# Upload dist/ contents to your hosting
```

### Backend (via Cloud Build)

```bash
cd backend
gcloud builds submit --config cloudbuild.yaml
```

### Backend (via Docker)

```bash
cd backend
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT/sloper/slop-video-backend .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT/sloper/slop-video-backend
gcloud run deploy slop-video-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/sloper/slop-video-backend \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --timeout 300 \
  --allow-unauthenticated
```

## First-Time Setup

1. **Deploy Backend First**
   - Push changes to `main` or manually deploy
   - Note the Cloud Run URL from the deployment output
   - URL format: `https://slop-video-backend-HASH-uc.a.run.app`

2. **Configure Frontend URL**
   - Add `BACKEND_URL` variable to GitHub repository settings
   - Set value to your Cloud Run URL

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: GitHub Actions
   - Wait for first frontend deployment

4. **Update CORS (if needed)**
   - If your GitHub Pages URL doesn't match the allowed origins in `backend/src/main.py`
   - Add your specific GitHub Pages URL to the CORS allowlist

## Verification

### Check Frontend

1. Visit your GitHub Pages URL
2. Open browser DevTools → Console
3. Verify no CORS errors

### Check Backend

```bash
curl https://your-backend-url/health
# Should return: {"status":"healthy","ffmpeg_available":true}
```

### End-to-End Test

1. Configure API keys in the frontend
2. Generate a simple video
3. Verify video downloads successfully

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:
1. Verify `BACKEND_URL` variable is set correctly
2. Check that your GitHub Pages domain is in the backend's CORS allowlist
3. Redeploy backend if you modified CORS settings

### GitHub Pages 404

If routes other than `/` return 404:
- Ensure `404.html` exists in the build output
- The SPA redirect script should handle this automatically

### Cloud Run Deployment Fails

1. Check GitHub Actions logs for specific error
2. Verify service account has required permissions
3. Ensure Cloud Run API is enabled
4. Check that the project ID is correct

### Video Assembly Timeout

If video generation times out:
1. Check Cloud Run logs in Google Cloud Console
2. Consider increasing timeout (max 3600s)
3. For very long videos, may need to optimize FFmpeg settings

## Monitoring

### Backend Logs

View logs in Google Cloud Console:
1. Navigate to Cloud Run → slop-video-backend
2. Click "Logs" tab
3. Filter by severity as needed

Logs include:
- Request path, method, status, duration
- FFmpeg processing details
- Error stack traces

### Frontend Errors

Browser console logs include:
- API call failures
- React error boundary catches
- Toast notification triggers
