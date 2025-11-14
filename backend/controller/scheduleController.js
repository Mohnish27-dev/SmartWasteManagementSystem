const db = require('../config/database');

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Private
exports.getAllSchedules = async (req, res) => {
  try {
    const { status, date, collector_id } = req.query;
    
    let query = `
      SELECT s.*, 
             b.id as bin_id_ref, b.location as bin_location, b.status as bin_status, b.fill_level,
             u.name as collector_name
      FROM schedules s
      LEFT JOIN bins b ON s.bin_id = b.id
      LEFT JOIN users u ON s.collector_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND s.scheduled_date = ?';
      params.push(date);
    }

    if (collector_id) {
      query += ' AND s.collector_id = ?';
      params.push(collector_id);
    }

    // If user is collector, show only their schedules
    if (req.user.role === 'collector') {
      query += ' AND s.collector_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY s.scheduled_date DESC, s.scheduled_time ASC';

    const [schedules] = await db.query(query, params);

    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single schedule
// @route   GET /api/schedules/:id
// @access  Private
exports.getSchedule = async (req, res) => {
  try {
    const [schedules] = await db.query(
      `SELECT s.*, 
              b.id as bin_id_ref, b.location as bin_location, b.latitude, b.longitude, b.status as bin_status, b.fill_level,
              u.name as collector_name, u.phone as collector_phone
       FROM schedules s
       LEFT JOIN bins b ON s.bin_id = b.id
       LEFT JOIN users u ON s.collector_id = u.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedules[0]
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private (Admin only)
exports.createSchedule = async (req, res) => {
  try {
    const { bin_id, collector_id, scheduled_date, scheduled_time, route, status } = req.body;

    const [result] = await db.query(
      `INSERT INTO schedules (bin_id, collector_id, scheduled_date, scheduled_time, route, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bin_id, collector_id || null, scheduled_date, scheduled_time || '09:00:00', route || null, status || 'pending']
    );

    const [newSchedule] = await db.query(
      `SELECT s.*, b.id as bin_id_ref, b.location as bin_location, u.name as collector_name
       FROM schedules s
       LEFT JOIN bins b ON s.bin_id = b.id
       LEFT JOIN users u ON s.collector_id = u.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: newSchedule[0]
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private (Admin/Collector)
exports.updateSchedule = async (req, res) => {
  try {
    const { collector_id, scheduled_date, scheduled_time, status, route } = req.body;

    const [schedules] = await db.query('SELECT * FROM schedules WHERE id = ?', [req.params.id]);

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // If status is being set to completed, update completed_at
    const completedAt = status === 'completed' ? 'NOW()' : 'completed_at';

    await db.query(
      `UPDATE schedules 
       SET collector_id = COALESCE(?, collector_id),
           scheduled_date = COALESCE(?, scheduled_date),
           scheduled_time = COALESCE(?, scheduled_time),
           status = COALESCE(?, status),
           route = COALESCE(?, route),
           completed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = ?`,
      [collector_id, scheduled_date, scheduled_time, status, route, status, req.params.id]
    );

    const [updatedSchedule] = await db.query(
      `SELECT s.*, b.id as bin_id_ref, b.location as bin_location, u.name as collector_name
       FROM schedules s
       LEFT JOIN bins b ON s.bin_id = b.id
       LEFT JOIN users u ON s.collector_id = u.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: updatedSchedule[0]
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private (Admin only)
exports.deleteSchedule = async (req, res) => {
  try {
    const [schedules] = await db.query('SELECT * FROM schedules WHERE id = ?', [req.params.id]);

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await db.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
