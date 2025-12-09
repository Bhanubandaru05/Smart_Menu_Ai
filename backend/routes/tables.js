const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET all tables
router.get('/', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const result = await pool.query(
      `SELECT 
        t.id,
        t.number,
        t.seats as capacity,
        t.status,
        t.label,
        t.created_at
      FROM tables t
      WHERE t.restaurant_id = $1
      ORDER BY t.number`,
      [restaurantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// GET table lookup - handles both UUID and numeric table IDs, plus query params
router.get('/lookup', async (req, res) => {
  try {
    const { table, tableId, id } = req.query;
    const lookupValue = table || tableId || id;
    
    console.log('[Table Lookup] Query params:', { table, tableId, id, lookupValue });
    
    if (!lookupValue) {
      console.error('[Table Lookup] No table identifier provided');
      return res.status(400).json({ error: 'Table identifier is required (table, tableId, or id)' });
    }

    // Check if it's a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lookupValue);
    
    let result;
    
    if (isUUID) {
      // Lookup by UUID (id column)
      console.log('[Table Lookup] Looking up by UUID:', lookupValue);
      result = await pool.query(
        `SELECT 
          t.id,
          t.number as table_number,
          t.restaurant_id as "restaurantId",
          t.status,
          t.label,
          t.seats
        FROM tables t
        WHERE t.id = $1`,
        [lookupValue]
      );
    } else {
      // Lookup by table number (numeric)
      console.log('[Table Lookup] Looking up by table number:', lookupValue);
      result = await pool.query(
        `SELECT 
          t.id,
          t.number as table_number,
          t.restaurant_id as "restaurantId",
          t.status,
          t.label,
          t.seats
        FROM tables t
        WHERE t.number = $1
        ORDER BY t.created_at DESC
        LIMIT 1`,
        [parseInt(lookupValue)]
      );
    }

    if (result.rows.length === 0) {
      console.error('[Table Lookup] Table not found:', lookupValue);
      return res.status(404).json({ 
        error: 'Table not found', 
        searchedFor: lookupValue,
        searchType: isUUID ? 'UUID' : 'table_number'
      });
    }

    const tableData = result.rows[0];
    console.log('[Table Lookup] Found table:', tableData);
    
    res.json({
      success: true,
      table: tableData,
      displayLabel: tableData.label || `Table ${tableData.table_number}`
    });
  } catch (error) {
    console.error('[Table Lookup] Error:', error);
    res.status(500).json({ error: 'Failed to lookup table', details: error.message });
  }
});

// GET single table by ID (for customer menu) - Backward compatibility
router.get('/:tableId/info', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    console.log('[Table Info] Looking up tableId:', tableId);
    
    const result = await pool.query(
      `SELECT 
        t.id,
        t.number,
        t.restaurant_id as "restaurantId",
        t.status,
        t.label
      FROM tables t
      WHERE t.id = $1`,
      [tableId]
    );

    if (result.rows.length === 0) {
      console.error('[Table Info] Table not found:', tableId);
      return res.status(404).json({ error: 'Table not found' });
    }

    console.log('[Table Info] Found table:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Table Info] Error fetching table info:', error);
    res.status(500).json({ error: 'Failed to fetch table info' });
  }
});

// POST create table
router.post('/', async (req, res) => {
  try {
    console.log('Received table creation request:', req.body);
    const { restaurantId, tableNumber, capacity, menuListId } = req.body;

    if (!restaurantId || !tableNumber) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({ error: 'restaurantId and tableNumber are required' });
    }

    const result = await pool.query(
      `INSERT INTO tables (restaurant_id, number, seats, status)
       VALUES ($1, $2, $3, 'available')
       RETURNING *`,
      [restaurantId, tableNumber, capacity || 4]
    );

    const table = result.rows[0];

    // Assign menu list if provided
    if (menuListId) {
      await pool.query(
        `INSERT INTO menu_assigned_tables (menu_id, table_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [menuListId, table.id]
      );
    }

    res.status(201).json(table);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// PUT update table
router.put('/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { tableNumber, capacity, isActive, menuListId } = req.body;

    const result = await pool.query(
      `UPDATE tables
       SET number = COALESCE($1, number),
           seats = COALESCE($2, seats),
           status = COALESCE($3, status)
       WHERE id = $4
       RETURNING *`,
      [tableNumber, capacity, isActive ? 'available' : 'unavailable', tableId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Update menu assignment if provided
    if (menuListId) {
      await pool.query(
        `DELETE FROM menu_assigned_tables WHERE table_id = $1`,
        [tableId]
      );
      await pool.query(
        `INSERT INTO menu_assigned_tables (menu_id, table_id)
         VALUES ($1, $2)`,
        [menuListId, tableId]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// DELETE table
router.delete('/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;

    const result = await pool.query(
      'DELETE FROM tables WHERE id = $1 RETURNING *',
      [tableId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// GET QR code for table
router.get('/:tableId/qr', async (req, res) => {
  try {
    const { tableId } = req.params;

    const result = await pool.query(
      `SELECT qr.qr_code_id, qr.qr_data, qr.created_at
       FROM qr_codes qr
       WHERE qr.table_id = $1
       ORDER BY qr.created_at DESC
       LIMIT 1`,
      [tableId]
    );

    if (result.rows.length === 0) {
      // Generate new QR code
      const qrData = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/menu/${tableId}`;
      const insertResult = await pool.query(
        `INSERT INTO qr_codes (table_id, qr_data)
         VALUES ($1, $2)
         RETURNING *`,
        [tableId, qrData]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

module.exports = router;
