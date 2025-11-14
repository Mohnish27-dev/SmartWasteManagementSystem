const db = require('../config/database');

// @desc    Get dashboard statistics
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Total bins
    const [totalBins] = await db.query('SELECT COUNT(*) as count FROM bins');
    
    // Bins by status
    const [binsByStatus] = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM bins 
      GROUP BY status
    `);

    // High priority bins (fill level > 80%)
    const [highPriorityBins] = await db.query(`
      SELECT COUNT(*) as count 
      FROM bins 
      WHERE fill_level > 80
    `);

    // Total schedules
    const [totalSchedules] = await db.query('SELECT COUNT(*) as count FROM schedules');

    // Schedules by status
    const [schedulesByStatus] = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM schedules 
      GROUP BY status
    `);

    // Total reports
    const [totalReports] = await db.query('SELECT COUNT(*) as count FROM reports');

    // Reports by status
    const [reportsByStatus] = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM reports 
      GROUP BY status
    `);

    // Recent activity (last 7 days)
    const [recentCollections] = await db.query(`
      SELECT COUNT(*) as count 
      FROM schedules 
      WHERE status = 'completed' 
      AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Bins by type
    const [binsByType] = await db.query(`
      SELECT type, COUNT(*) as count 
      FROM bins 
      GROUP BY type
    `);

    res.status(200).json({
      success: true,
      data: {
        bins: {
          total: totalBins[0].count,
          byStatus: binsByStatus,
          byType: binsByType,
          highPriority: highPriorityBins[0].count
        },
        schedules: {
          total: totalSchedules[0].count,
          byStatus: schedulesByStatus,
          recentCollections: recentCollections[0].count
        },
        reports: {
          total: totalReports[0].count,
          byStatus: reportsByStatus
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get collection trends
// @route   GET /api/analytics/trends
// @access  Private (Admin only)
exports.getCollectionTrends = async (req, res) => {
  try {
    const { period = '7' } = req.query; // days

    const [trends] = await db.query(`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as collections
      FROM schedules
      WHERE status = 'completed'
      AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
    `, [parseInt(period)]);

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
