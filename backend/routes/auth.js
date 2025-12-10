const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const { validateUserRegistration, validateEmail } = require('../middleware/validation');

// Hash password (simple version - in production use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/auth/signup - Register new user
router.post('/signup', validateUserRegistration, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password, name } = req.body;
    console.log('📝 Signup request:', { email, name });

    if (!email || !password || !name) {
      console.log('❌ Missing fields');
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('❌ User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create a new restaurant for this admin
    const restaurantName = `${name}'s Restaurant`;
    const restaurantSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const restaurantResult = await client.query(
      `INSERT INTO restaurants (name, slug, contact_email)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [restaurantName, restaurantSlug, email]
    );
    const restaurantId = restaurantResult.rows[0].id;
    console.log('🏢 Created new restaurant:', restaurantName, 'ID:', restaurantId);

    // Create default menu list for the restaurant
    await client.query(
      `INSERT INTO menu_lists (restaurant_id, title_key, is_active)
       VALUES ($1, $2, true)`,
      [restaurantId, 'Main Menu']
    );
    console.log('📋 Created default menu list for restaurant');

    // Create user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, name, role, restaurant_id)
       VALUES ($1, $2, $3, 'ADMIN', $4)
       RETURNING id, email, name, role, restaurant_id as "restaurantId"`,
      [email, hashPassword(password), name, restaurantId]
    );

    await client.query('COMMIT');
    console.log('✅ User created successfully:', result.rows[0].email);

    res.status(201).json({
      user: result.rows[0],
      message: 'User created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT id, email, name, role, restaurant_id as "restaurantId", password_hash
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordHash = hashPassword(password);

    console.log('🔑 Password check:', {
      provided: passwordHash.substring(0, 10) + '...',
      stored: user.password_hash.substring(0, 10) + '...',
      match: user.password_hash === passwordHash
    });

    if (user.password_hash !== passwordHash) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Remove password hash from response
    delete user.password_hash;

    console.log('✅ Login successful:', email);
    res.json({
      user,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// GET /api/auth/me - Get current user (for session validation)
router.get('/me', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await pool.query(
      `SELECT id, email, name, role, restaurant_id as "restaurantId"
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', validateEmail, async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔐 Forgot password request for:', email);

    if (!email) {
      console.log('❌ Email missing in request');
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email]
    );

    // If user doesn't exist, return error (in development, for better UX)
    if (result.rows.length === 0) {
      console.log('❌ Forgot password - User not found:', email);
      return res.status(404).json({ 
        error: 'No account found with this email address. Please check and try again.',
        success: false 
      });
    }

    const user = result.rows[0];
    console.log('✅ Forgot password - User found:', user.email);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    console.log('🔑 Generated reset token for:', email);

    // Store reset token in database
    await pool.query(
      `UPDATE users 
       SET reset_token = $1, reset_token_expiry = $2 
       WHERE email = $3`,
      [resetTokenHash, resetTokenExpiry, email]
    );

    console.log('💾 Reset token stored in database');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Log for console and return link
    console.log('\n✉️  PASSWORD RESET REQUESTED');
    console.log(`Email: ${email}`);
    console.log(`Frontend URL: ${frontendUrl}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`Expires: ${resetTokenExpiry.toLocaleString()}`);
    console.log('=====================================\n');

    res.json({ 
      message: 'Password reset link generated successfully! Check the server logs for the reset link.',
      success: true,
      resetLink: resetLink, // Always return link for now (remove in production)
      frontendUrl: frontendUrl
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to process password reset request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const result = await pool.query(
      `SELECT id, email FROM users 
       WHERE reset_token = $1 
       AND reset_token_expiry > NOW()`,
      [resetTokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];
    const newPasswordHash = hashPassword(newPassword);

    // Update password and clear reset token
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL 
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    res.json({ 
      message: 'Password has been reset successfully',
      success: true 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
