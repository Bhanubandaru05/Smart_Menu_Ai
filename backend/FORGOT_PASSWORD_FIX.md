# Forgot Password Production Fix

## Problem
The forgot password feature was failing on production with a 500 error because the database was missing required columns for password reset functionality.

## Root Cause
The `users` table was missing two columns:
- `reset_token` VARCHAR(255) - Stores hashed reset tokens
- `reset_token_expiry` TIMESTAMP - Stores token expiration time

## Solution Applied

### 1. Updated Database Schema
Modified `backend/init-db.js` to include reset token columns:
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role role_enum DEFAULT 'ADMIN',
  restaurant_id UUID REFERENCES restaurants(id),
  reset_token VARCHAR(255),              -- ADDED
  reset_token_expiry TIMESTAMP,          -- ADDED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### 2. Created Migration Script
Created `backend/migrate-add-reset-token.js` to add columns to existing databases:
```javascript
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
```

### 3. Enhanced Error Logging
Updated `backend/routes/auth.js` forgot-password route with:
- Detailed console logging with emoji prefixes (🔐 🔑 💾 ✉️ ❌)
- Better error handling with stack traces
- Returns error details in development mode
- Logs FRONTEND_URL for debugging

## How to Fix Production

### Step 1: Run Migration on Render Database

#### Option A: Using Render Shell
1. Go to Render Dashboard → Your Web Service → Shell
2. Run the migration:
```bash
cd backend
node migrate-add-reset-token.js
```

#### Option B: Using Direct Database Connection
1. Get your production database URL from Render
2. Connect using psql:
```bash
psql "postgresql://qrdb_gqrd_user:...@dpg-d4s1tvfdiees73di5vdg-a.virginia-postgres.render.com/qrdb_gqrd"
```
3. Run the migration SQL:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
```
4. Verify columns were added:
```sql
\d users
```

### Step 2: Update Environment Variables on Render
Go to Render Dashboard → Your Web Service → Environment

Add/verify these variables:
```
DATABASE_URL=<your-render-postgres-url>
NODE_ENV=production
FRONTEND_URL=https://smartmenuai.vercel.app
PORT=5000
```

Optional (for email sending in future):
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<gmail-app-password>
EMAIL_FROM=MenuAI <your-email@gmail.com>
```

### Step 3: Deploy Updated Code
1. Commit and push the changes:
```bash
git add backend/routes/auth.js backend/init-db.js backend/migrate-add-reset-token.js
git commit -m "fix: add database columns for forgot password feature"
git push origin main
```
2. Render will auto-deploy the updated code

### Step 4: Test on Production
1. Go to https://smartmenuai.vercel.app/login
2. Click "Forgot Password"
3. Enter a valid email address
4. Check Render logs for the reset link:
```
✉️  PASSWORD RESET REQUESTED
Email: user@example.com
Frontend URL: https://smartmenuai.vercel.app
Reset Link: https://smartmenuai.vercel.app/reset-password?token=...
Expires: 12/10/2025, 12:30:00 AM
```
5. Copy the reset link from logs and test it

## Testing Locally

### Test the Migration
```bash
cd backend
node migrate-add-reset-token.js
```

Expected output:
```
✅ Connected to PostgreSQL database
🔄 Adding reset_token columns to users table...

✅ Added reset_token column
✅ Added reset_token_expiry column

✅ Migration completed successfully!
```

### Test the Endpoint
Start the backend server:
```bash
cd backend
node server.js
```

Use the test script:
```bash
node test-forgot-password.js
```

Or use Postman/curl:
```bash
POST http://localhost:5000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "bandarubhanu2005@gmail.com"
}
```

Expected response:
```json
{
  "message": "Password reset link generated successfully! Check the server logs for the reset link.",
  "success": true,
  "resetLink": "http://localhost:8080/reset-password?token=...",
  "frontendUrl": "http://localhost:8080"
}
```

Check backend console for:
```
🔐 Forgot password request for: bandarubhanu2005@gmail.com
✅ Forgot password - User found: bandarubhanu2005@gmail.com
🔑 Generated reset token for: bandarubhanu2005@gmail.com
💾 Reset token stored in database

✉️  PASSWORD RESET REQUESTED
Email: bandarubhanu2005@gmail.com
Frontend URL: http://localhost:8080
Reset Link: http://localhost:8080/reset-password?token=abc123...
Expires: 12/10/2025, 12:30:00 AM
=====================================
```

## Future Enhancements

### Add Email Sending
Currently the forgot password feature only logs the reset link to the console. To send actual emails:

1. Install nodemailer (already in package.json)
2. Configure Gmail App Password
3. Update the forgot-password route to send emails:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

await transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: email,
  subject: 'Password Reset Request - MenuAI',
  html: `
    <h2>Password Reset Request</h2>
    <p>Hi ${user.name},</p>
    <p>You requested to reset your password. Click the link below:</p>
    <a href="${resetLink}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, ignore this email.</p>
  `
});
```

## Troubleshooting

### "column does not exist" error
- Run the migration script on the database
- Verify columns exist: `\d users` in psql

### "permission denied" error
- Check database user has UPDATE permissions on users table
- Try: `GRANT UPDATE ON users TO qrdb_gqrd_user;`

### "connection timeout" error
- Check Render database connection limits
- Verify DATABASE_URL is correct in environment variables

### "FRONTEND_URL is undefined" error
- Add FRONTEND_URL to Render environment variables
- Redeploy the service

### 500 error still occurring
1. Check Render logs for detailed error messages
2. Look for the 🔐 and ❌ emoji prefixes
3. The error will show exact database error code and message

## Files Modified
- ✅ `backend/init-db.js` - Added reset token columns to schema
- ✅ `backend/routes/auth.js` - Enhanced logging and error handling
- ✅ `backend/migrate-add-reset-token.js` - New migration script
- ✅ `backend/test-forgot-password.js` - Test utility

## Database Changes
```sql
-- Migration applied
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
```

## Success Criteria
- ✅ Migration runs successfully on local database
- ⏳ Migration needs to run on production database (Render)
- ✅ Enhanced logging added to forgot-password route
- ⏳ Test on production after migration
- ⏳ Add email sending (future enhancement)
