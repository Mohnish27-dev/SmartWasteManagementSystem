const db = require('../config/database');

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
exports.getAllReports = async (req, res) => {
  try {
    const { status, report_type, priority } = req.query;
    
    let query = `
      SELECT r.*, 
             b.id, b.location as bin_location,
             u.name as reporter_name
      FROM reports r
      LEFT JOIN bins b ON r.bin_id = b.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (report_type) {
      query += ' AND r.issue_type = ?';
      params.push(report_type);
    }

    if (priority) {
      query += ' AND r.priority = ?';
      params.push(priority);
    }

    // If user is citizen, show only their reports
    if (req.user.role === 'citizen') {
      query += ' AND r.user_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY r.created_at DESC';

    const [reports] = await db.query(query, params);

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const [reports] = await db.query(
      `SELECT r.*, 
              b.id, b.location as bin_location,
              u.name as reporter_name, u.email as reporter_email, u.phone as reporter_phone
       FROM reports r
       LEFT JOIN bins b ON r.bin_id = b.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: reports[0]
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const { bin_id, issue_type, description, priority } = req.body;

    // Validate required fields
    if (!bin_id) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID is required'
      });
    }

    if (!issue_type) {
      return res.status(400).json({
        success: false,
        message: 'Issue type is required'
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO reports (user_id, bin_id, issue_type, description, priority)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, bin_id, issue_type, description, priority || 'medium']
    );

    const [newReport] = await db.query(
      `SELECT r.*, b.id, b.location as bin_location, u.name as reporter_name
       FROM reports r
       LEFT JOIN bins b ON r.bin_id = b.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    // Create notification for admins (with error handling)
    try {
      const [admins] = await db.query('SELECT id FROM users WHERE role = "admin"');
      for (const admin of admins) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            admin.id,
            'New Report Submitted',
            `A new ${issue_type} report has been submitted`,
            'alert',
            'report',
            result.insertId
          ]
        );
      }
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the report creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: newReport[0]
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update report
// @route   PUT /api/reports/:id
// @access  Private (Admin/Collector)
exports.updateReport = async (req, res) => {
  try {
    const { bin_id, issue_type, description, status, priority, resolution_notes } = req.body;

    const [reports] = await db.query('SELECT * FROM reports WHERE id = ?', [req.params.id]);

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user has permission to edit this report
    if (req.user.role === 'citizen' && reports[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this report'
      });
    }

    const updateFields = [];
    const params = [];

    // Citizens can edit basic fields if it's their report
    if (bin_id && (req.user.role === 'citizen' && reports[0].user_id === req.user.id)) {
      updateFields.push('bin_id = ?');
      params.push(bin_id);
    }

    if (issue_type && (req.user.role === 'citizen' && reports[0].user_id === req.user.id)) {
      updateFields.push('issue_type = ?');
      params.push(issue_type);
    }

    if (description && (req.user.role === 'citizen' && reports[0].user_id === req.user.id)) {
      updateFields.push('description = ?');
      params.push(description);
    }

    if (priority && (req.user.role === 'citizen' && reports[0].user_id === req.user.id)) {
      updateFields.push('priority = ?');
      params.push(priority);
    }

    // Admin and collectors can update status and resolution notes
    if (status && (req.user.role === 'admin' || req.user.role === 'collector')) {
      updateFields.push('status = ?');
      params.push(status);
      
      if (status === 'resolved') {
        updateFields.push('resolved_at = NOW()');
      }
    }

    if (priority && (req.user.role === 'admin' || req.user.role === 'collector')) {
      updateFields.push('priority = ?');
      params.push(priority);
    }

    if (resolution_notes !== undefined && (req.user.role === 'admin' || req.user.role === 'collector')) {
      updateFields.push('resolution_notes = ?');
      params.push(resolution_notes);
    }

    if (updateFields.length > 0) {
      params.push(req.params.id);
      await db.query(
        `UPDATE reports SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updatedReport] = await db.query(
      `SELECT r.*, b.id, b.location as bin_location, u.name as reporter_name
       FROM reports r
       LEFT JOIN bins b ON r.bin_id = b.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    // Notify reporter if status changed (with error handling)
    if (status) {
      try {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            reports[0].user_id,
            'Report Status Updated',
            `Your report has been updated to: ${status}`,
            'info',
            'report',
            req.params.id
          ]
        );
      } catch (notificationError) {
        console.error('Failed to create status update notification:', notificationError);
        // Don't fail the update if notification fails
      }
    }

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: updatedReport[0]
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private (Admin only)
exports.deleteReport = async (req, res) => {
  try {
    const [reports] = await db.query('SELECT * FROM reports WHERE id = ?', [req.params.id]);

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await db.query('DELETE FROM reports WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
