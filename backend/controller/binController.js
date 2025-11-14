const db = require('../config/database');

// @desc    Get all bins
// @route   GET /api/bins
// @access  Private
exports.getAllBins = async (req, res) => {
  try {
    const { status, type, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM bins WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY fill_level DESC LIMIT ?';
    params.push(parseInt(limit));

    const [bins] = await db.query(query, params);

    res.json({
      success: true,
      count: bins.length,
      data: bins
    });
  } catch (error) {
    console.error('Get bins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single bin
// @route   GET /api/bins/:id
// @access  Private
exports.getBin = async (req, res) => {
  try {
    const [bins] = await db.query(
      'SELECT * FROM bins WHERE id = ?',
      [req.params.id]
    );

    if (bins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    res.json({
      success: true,
      data: bins[0]
    });
  } catch (error) {
    console.error('Get bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new bin
// @route   POST /api/bins
// @access  Private (Admin only)
exports.createBin = async (req, res) => {
  try {
    const { id, location, latitude, longitude, capacity, type } = req.body;

    const [result] = await db.query(
      `INSERT INTO bins (id, location, latitude, longitude, capacity, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, location, latitude || null, longitude || null, capacity || 100, type || 'general']
    );

    const [newBin] = await db.query(
      'SELECT * FROM bins WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Bin created successfully',
      data: newBin[0]
    });
  } catch (error) {
    console.error('Create bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update bin
// @route   PUT /api/bins/:id
// @access  Private (Admin/Collector)
exports.updateBin = async (req, res) => {
  try {
    const { location, latitude, longitude, capacity, fill_level, status, type } = req.body;

    const [bins] = await db.query('SELECT * FROM bins WHERE id = ?', [req.params.id]);

    if (bins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    // Update status based on fill_level if provided
    let updatedStatus = status;
    if (fill_level !== undefined && !status) {
      const level = parseInt(fill_level);
      if (level >= 90) updatedStatus = 'full';
      else if (level >= 70) updatedStatus = 'high';
      else if (level >= 40) updatedStatus = 'medium';
      else if (level >= 20) updatedStatus = 'low';
      else updatedStatus = 'empty';
    }

    await db.query(
      `UPDATE bins 
       SET location = COALESCE(?, location),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude),
           capacity = COALESCE(?, capacity),
           fill_level = COALESCE(?, fill_level),
           status = COALESCE(?, status),
           type = COALESCE(?, type)
       WHERE id = ?`,
      [location, latitude, longitude, capacity, fill_level, updatedStatus, type, req.params.id]
    );

    const [updatedBin] = await db.query('SELECT * FROM bins WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Bin updated successfully',
      data: updatedBin[0]
    });
  } catch (error) {
    console.error('Update bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete bin
// @route   DELETE /api/bins/:id
// @access  Private (Admin only)
exports.deleteBin = async (req, res) => {
  try {
    const [bins] = await db.query('SELECT * FROM bins WHERE id = ?', [req.params.id]);

    if (bins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    await db.query('DELETE FROM bins WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Bin deleted successfully'
    });
  } catch (error) {
    console.error('Delete bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get bin statistics
// @route   GET /api/bins/stats/overview
// @access  Private
exports.getBinStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_bins,
        SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) as full_bins,
        SUM(CASE WHEN status = 'high' THEN 1 ELSE 0 END) as high_bins,
        SUM(CASE WHEN status = 'medium' THEN 1 ELSE 0 END) as medium_bins,
        SUM(CASE WHEN status = 'low' THEN 1 ELSE 0 END) as low_bins,
        SUM(CASE WHEN status = 'empty' THEN 1 ELSE 0 END) as empty_bins,
        AVG(fill_level) as avg_fill_level
      FROM bins
    `);

    const [typeStats] = await db.query(`
      SELECT type, COUNT(*) as count
      FROM bins
      GROUP BY type
    `);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        by_type: typeStats
      }
    });
  } catch (error) {
    console.error('Get bin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
