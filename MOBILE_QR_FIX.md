# Mobile QR Code Fix - Deployment Guide

## Problem Fixed
The menu page was loading blank on mobile devices after scanning QR codes because:
1. All API calls were hardcoded to `http://localhost:5000`
2. Mobile devices couldn't reach localhost
3. CORS wasn't configured for production domains

## Changes Made

### Frontend Changes
- ✅ Replaced all 28 hardcoded `localhost` URLs with environment variable
- ✅ Created `.env` with production backend URL
- ✅ Created `.env.local` for local development
- ✅ All API calls now use `import.meta.env.VITE_API_URL`

### Backend Changes
- ✅ Updated CORS to allow production domains:
  - `https://smartmenuai.vercel.app` (frontend)
  - `https://smart-menu-ai.onrender.com` (backend)
  - localhost URLs for development
- ✅ Enabled credentials for cross-origin requests

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=https://smart-menu-ai.onrender.com
```

### Frontend (.env.local) - For local development only
```
VITE_API_URL=http://localhost:5000
```

## Deployment Instructions

### 1. Deploy Backend to Render
Your backend is already deployed at: `https://smart-menu-ai.onrender.com`

Make sure these environment variables are set in Render dashboard:
```
DATABASE_URL=postgresql://qrdb_gqrd_user:...@dpg-d4s1tvfdiees73di5vdg-a.virginia-postgres.render.com/qrdb_gqrd
NODE_ENV=production
PORT=5000
```

### 2. Deploy Frontend to Vercel

#### Option A: Set Environment Variable in Vercel Dashboard (Recommended)
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `VITE_API_URL` = `https://smart-menu-ai.onrender.com`
4. Redeploy

#### Option B: Commit .env file
1. The `.env` file is now tracked by git (removed from .gitignore)
2. Commit and push:
   ```bash
   git add frontend/.env
   git commit -m "Add production environment variable"
   git push
   ```
3. Vercel will automatically deploy

### 3. Verify Deployment

Test these URLs after deployment:

1. **Frontend**: `https://smartmenuai.vercel.app`
2. **Backend Health**: `https://smart-menu-ai.onrender.com/api/health`
3. **QR Code Test**: Generate a QR code and scan it with your mobile phone
4. **Menu Loading**: Verify menu items load on mobile devices

## Testing Checklist

- [ ] Backend health endpoint returns 200 OK
- [ ] Login/Signup works from production frontend
- [ ] Dashboard loads correctly
- [ ] Menu management works (create/edit/delete items)
- [ ] QR code generation works
- [ ] **Mobile QR scan loads menu items** ← Main fix
- [ ] Orders can be placed from mobile
- [ ] No CORS errors in browser console
- [ ] No 404 errors for API calls

## Local Development

For local development, use `.env.local`:

```bash
# Frontend
cd frontend
npm run dev
# Uses http://localhost:5000 from .env.local

# Backend
cd backend
node server.js
# Runs on http://localhost:5000
```

## Important Notes

1. **HTTPS Required**: Make sure backend URL uses HTTPS in production to avoid mixed-content errors on mobile
2. **Vercel Rewrites**: The `vercel.json` already has the rewrite rule for React Router
3. **CORS**: Backend now accepts requests from production domain
4. **.env vs .env.local**: 
   - `.env` = production (committed to git)
   - `.env.local` = local development (ignored by git)

## Troubleshooting

### Menu still not loading on mobile?
1. Check browser console for errors
2. Verify `VITE_API_URL` is set correctly in Vercel
3. Test backend health endpoint: `https://smart-menu-ai.onrender.com/api/health`
4. Clear browser cache and try again

### CORS errors?
1. Verify frontend domain matches the one in backend `allowedOrigins`
2. Check Vercel deployment URL (should be `smartmenuai.vercel.app`)
3. Backend logs should show "Blocked by CORS: [origin]" if blocked

### 404 errors on deep links?
- Already fixed with `vercel.json` rewrites
- Make sure `vercel.json` is in `frontend/` directory

## Files Modified

### Frontend
- `src/contexts/AuthContext.tsx`
- `src/pages/CustomerMenu.jsx`
- `src/pages/MenuManagement.jsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Analytics.tsx`
- `src/pages/OrdersPage.tsx`
- `src/pages/OrdersPageNew.tsx`
- `src/pages/QRGenerator.jsx`
- `src/pages/Settings.tsx`
- `src/pages/StaffManagement.tsx`
- `src/pages/TableManagement.tsx`
- `src/pages/Login.tsx`
- `src/pages/ResetPassword.tsx`
- `src/components/dashboard/DashboardLayout.tsx`
- `.env` (production)
- `.env.local` (local dev)
- `vercel.json` (already existed)

### Backend
- `server.js` (CORS configuration)

### Root
- `.gitignore` (allow frontend/.env)
