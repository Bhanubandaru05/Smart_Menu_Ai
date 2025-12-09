# API Environment Configuration Guide

## 🎯 Overview

This application uses environment variables to configure API endpoints, eliminating hardcoded `localhost` URLs that prevent cross-device testing and production deployment.

## 📦 Architecture

### Centralized API Configuration

**File:** `frontend/src/utils/apiBase.js`

All API calls now use a centralized configuration utility that:
- ✅ Reads `VITE_API_URL` from environment variables
- ✅ Provides fallback to relative URLs when not set
- ✅ Logs all API requests and responses for debugging
- ✅ Includes defensive error handling

**Usage:**
```javascript
import { API_BASE, API_URL, getApiUrl, apiFetch } from '@/utils/apiBase';

// Simple usage
fetch(`${API_BASE}/api/menu`);

// With helper function
const url = getApiUrl('/api/tables/lookup', { table: '5' });

// Enhanced fetch with logging
const data = await apiFetch('/api/menu?restaurantId=123');
```

### Files Updated

All frontend files now import from `@/utils/apiBase` instead of using hardcoded URLs:

- ✅ `frontend/src/pages/CustomerMenu.jsx`
- ✅ `frontend/src/pages/Settings.tsx`
- ✅ `frontend/src/pages/MenuManagement.jsx`
- ✅ `frontend/src/pages/Analytics.tsx`
- ✅ `frontend/src/pages/Login.tsx`
- ✅ `frontend/src/pages/Dashboard.tsx`
- ✅ `frontend/src/pages/OrdersPage.tsx`
- ✅ `frontend/src/pages/QRGenerator.jsx`
- ✅ `frontend/src/pages/TableManagement.tsx`
- ✅ `frontend/src/pages/StaffManagement.tsx`
- ✅ `frontend/src/contexts/AuthContext.tsx`
- ✅ `frontend/src/components/dashboard/DashboardLayout.tsx`

## 🔧 Environment Setup

### Local Development

#### Frontend `.env` file
Create `frontend/.env`:
```bash
VITE_API_URL=http://localhost:5000
```

#### Backend `.env` file
Create `backend/.env`:
```bash
DATABASE_URL=postgresql://localhost/qrdb
PORT=5000
NODE_ENV=development
```

#### Start Development Servers
```bash
# Terminal 1: Backend
cd backend
node server.js

# Terminal 2: Frontend  
cd frontend
npm run dev
```

**Expected Console Output:**
```
[MenuAI] 🚀 API Configuration initialized
[MenuAI] ✅ API Base URL configured: http://localhost:5000
[MenuAI] 🌐 API URL: http://localhost:5000/api/menu
```

---

### Production Deployment

#### Vercel (Frontend)

1. **Set Environment Variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add variable for **Production** AND **Preview**:
     ```
     Name:  VITE_API_URL
     Value: https://your-backend.onrender.com
     ```
   - ⚠️ **NO trailing slash!**

2. **Redeploy:**
   ```bash
   git commit --allow-empty -m "trigger redeploy with env vars"
   git push
   ```

3. **Verify:**
   - Open preview deployment
   - Check browser console for: `[MenuAI] ✅ API Base URL configured:`
   - Verify API requests go to your backend domain (not localhost)

#### Render (Backend)

1. **Environment Variables:**
   - `DATABASE_URL` - Auto-populated by Render
   - `NODE_ENV` - Set to `production`
   - `PORT` - Set to `5000` (or leave default)

2. **CORS Configuration:**
   In `backend/server.js`, ensure your frontend domain is allowed:
   ```javascript
   const allowedOrigins = [
     'https://your-vercel-app.vercel.app',
     'https://your-vercel-app-*.vercel.app', // Preview deployments
     'http://localhost:8081', // Local dev
   ];
   ```

3. **Verify Backend is Running:**
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```

---

## 🧪 Testing

### Verification Checklist

**Before Deployment:**
- [ ] No `localhost` hardcoded in frontend code
  ```bash
  git grep -n "localhost" frontend/src
  # Should return no results (or only comments)
  ```
- [ ] Local dev works with `.env` file
- [ ] Build succeeds: `cd frontend && npm run build`

**After Deployment:**
- [ ] Vercel env vars are set (Production + Preview)
- [ ] Console shows correct API_BASE: `[MenuAI] ✅ API Base URL configured: https://...`
- [ ] Network tab shows requests to production backend
- [ ] No `ERR_CONNECTION_REFUSED` errors
- [ ] QR codes work on different devices/networks

### Test URLs

**Local Development:**
```
http://localhost:8081/menu?table=1
http://localhost:8081/menu/uuid-here
```

**Production:**
```
https://your-vercel-app.vercel.app/menu?table=1
https://your-vercel-app.vercel.app/menu/uuid-here
```

### Console Logging

All API calls now log detailed information:

**Request:**
```
[MenuAI] 📡 Request: {
  url: "https://api.yourdomain.com/api/tables/lookup?table=5",
  method: "GET",
  headers: {...},
  body: null
}
```

**Response:**
```
[MenuAI] 📥 Response: {
  url: "https://api.yourdomain.com/api/tables/lookup?table=5",
  status: 200,
  statusText: "OK",
  ok: true
}
```

**Data:**
```
[MenuAI] ✅ Data received: {"success":true,"table":{"id":"...","table_number":5,...}}
```

**Error:**
```
[MenuAI] ❌ API Error: {
  url: "https://api.yourdomain.com/api/menu",
  error: "API request failed: 404 Not Found",
  stack: "Error: API request failed..."
}
```

---

## 🐛 Troubleshooting

### Issue: "VITE_API_URL is not set" Warning

**Symptoms:**
- Console shows: `[MenuAI] ⚠️ VITE_API_URL is not set`
- Using relative `/api/` endpoints

**Solutions:**

**For Local Development:**
```bash
# Create frontend/.env file
echo "VITE_API_URL=http://localhost:5000" > frontend/.env

# Restart dev server
cd frontend
npm run dev
```

**For Production:**
1. Check Vercel Dashboard → Settings → Environment Variables
2. Ensure `VITE_API_URL` is set for **both** Production and Preview
3. Value should be: `https://your-backend.onrender.com` (no trailing slash)
4. Redeploy:
   ```bash
   vercel --prod --force
   ```

---

### Issue: ERR_CONNECTION_REFUSED on Mobile

**Symptoms:**
- Menu loads on dev machine but not on mobile/other devices
- Console shows: `net::ERR_CONNECTION_REFUSED`
- Network tab shows requests to `localhost`

**Root Cause:**
- `VITE_API_URL` not set in Vercel
- Build used default/empty value
- App trying to connect to `localhost` which doesn't exist on mobile

**Solutions:**

1. **Verify Environment Variable:**
   ```bash
   # Check Vercel deployment logs
   vercel logs your-deployment-url
   
   # Look for: "VITE_API_URL" in build output
   ```

2. **Force Rebuild:**
   ```bash
   # Trigger new deployment
   git commit --allow-empty -m "force rebuild with env vars"
   git push
   ```

3. **Check Build Output:**
   - In Vercel deployment logs, search for `VITE_API_URL`
   - Should show: `VITE_API_URL=https://your-backend.onrender.com`

4. **Test in Browser:**
   ```javascript
   // In browser console on deployed site
   console.log(import.meta.env.VITE_API_URL);
   // Should output your backend URL, not undefined
   ```

---

### Issue: CORS Errors in Production

**Symptoms:**
- Console shows: `Access-Control-Allow-Origin` error
- Status: 200 but response blocked

**Solution:**

Update `backend/server.js`:
```javascript
const allowedOrigins = [
  'https://your-actual-vercel-domain.vercel.app',
  'https://*.vercel.app', // All Vercel preview deployments
  'http://localhost:8081',
  'http://localhost:5173',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests with no origin
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace('*', '.*') + '$');
        return regex.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

### Issue: 404 on API Endpoints

**Symptoms:**
- `[MenuAI] 📥 Response: { status: 404 }`
- Backend logs show no incoming requests

**Solutions:**

1. **Check Backend is Running:**
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```

2. **Verify API_BASE Value:**
   ```javascript
   // In browser console
   console.log(window.location.origin); // Should be Vercel URL
   console.log(import.meta.env.VITE_API_URL); // Should be Render URL
   ```

3. **Check Network Tab:**
   - Open DevTools → Network
   - Filter: XHR/Fetch
   - Click failed request
   - Check "Request URL" - should use backend domain

---

### Issue: Menu Blank on Scan

**Symptoms:**
- QR scan opens menu page but shows no items
- No error messages
- Console logs show successful API calls

**Diagnosis:**
```javascript
// Check these values in console
console.log('[DEBUG] tableIdentifier:', tableIdentifier);
console.log('[DEBUG] tableInfo:', tableInfo);
console.log('[DEBUG] RESTAURANT_ID:', RESTAURANT_ID);
console.log('[DEBUG] menuItems:', menuItems);
```

**Common Causes:**
1. **Table not in database** → Check: `SELECT * FROM tables WHERE id='...'`
2. **No menu items** → Check: `SELECT * FROM menu_items WHERE restaurant_id='...'`
3. **Wrong restaurant ID** → Verify table.restaurant_id matches menu items

---

## 🔐 Security Notes

### Environment Variables Best Practices

1. **Never commit `.env` files:**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use different values per environment:**
   - Development: `http://localhost:5000`
   - Staging/Preview: `https://staging-api.yourdomain.com`
   - Production: `https://api.yourdomain.com`

3. **Rotate production credentials:**
   - Change database passwords regularly
   - Use Render's automatic backups

4. **Limit CORS origins:**
   - Don't use `*` in production
   - List specific domains only

---

## 📊 Monitoring

### Console Logs to Monitor

**Initialization:**
```
[MenuAI] 🚀 API Configuration initialized
[MenuAI] ✅ API Base URL configured: https://...
```

**Every API Call:**
```
[MenuAI] 🌐 API URL: https://...
[MenuAI] 📡 Request: {...}
[MenuAI] 📥 Response: {...}
[MenuAI] ✅ Data received: {...}
```

**Errors:**
```
[MenuAI] ❌ API Error: {...}
[Table Lookup] Error: ...
```

### Backend Logs (Render)

Monitor these in Render Dashboard → Logs:
```
[Table Lookup] Query params: { table: '5' }
[Table Lookup] Looking up by table number: 5
[Table Lookup] Found table: { id: '...', table_number: 5 }
```

---

## 🚀 Quick Reference

### Commands

```bash
# Check for localhost references
git grep -n "localhost" frontend/src

# Build with env var
VITE_API_URL=https://api.yourdomain.com npm run build

# Test production build locally
npm run preview

# Deploy to Vercel
vercel --prod

# View Vercel logs
vercel logs

# Check environment variables
vercel env ls
```

### File Structure

```
smart-menu-ai-main/
├── frontend/
│   ├── .env                    # Local dev environment variables
│   ├── .env.production         # Production overrides (optional)
│   └── src/
│       └── utils/
│           └── apiBase.js      # ⭐ Centralized API configuration
├── backend/
│   ├── .env                    # Backend environment variables
│   └── server.js               # CORS configuration
└── [docs]
    ├── MOBILE_QR_FIXES.md
    ├── DYNAMIC_TABLE_FIX.md
    └── API_CONFIG.md           # ⭐ This file
```

---

## ✅ Success Criteria

Your app is correctly configured when:

1. ✅ `git grep -n "localhost" frontend/src` returns no results
2. ✅ Console shows: `[MenuAI] ✅ API Base URL configured: https://...`
3. ✅ Network tab shows all requests go to production backend
4. ✅ QR scan works on mobile device (different network)
5. ✅ No `ERR_CONNECTION_REFUSED` errors
6. ✅ Menu loads with actual data from database
7. ✅ Orders can be placed successfully
8. ✅ All console logs show production URLs (no localhost)

---

## 📞 Support

If issues persist after following this guide:

1. Check browser console for `[MenuAI]` logs
2. Check Network tab for failed requests
3. Check Render logs for backend errors
4. Verify all environment variables are set correctly
5. Try in incognito mode (clears cache)
6. Test on different device/network

**Common Fix:** Most issues resolve by ensuring `VITE_API_URL` is set in Vercel and redeploying.
