const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding reset_token columns to users table...\n');

    // Add reset_token column if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
    `);
    console.log('✅ Added reset_token column');

    // Add reset_token_expiry column if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
    `);
    console.log('✅ Added reset_token_expiry column');

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
