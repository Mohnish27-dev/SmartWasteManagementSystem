const db = require('../config/database');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Bin statistics
    const [binStats] = await db.query(`
      SELECT 
        COUNT(*) as total_bins,
        SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) as full_bins,
        SUM(CASE WHEN status = 'high' THEN 1 ELSE 0 END) as high_bins,
        AVG(fill_level) as avg_fill_level
      FROM bins
    `);

    // Schedule statistics
    const [scheduleStats] = await db.query(`
      SELECT 
        COUNT(*) as total_schedules,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_schedules,
        SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = CURDATE() THEN 1 ELSE 0 END) as completed_today
      FROM collection_schedules
      WHERE scheduled_date >= CURDATE()
    `);

    // Report statistics
    const [reportStats] = await db.query(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reports,
        SUM(CASE WHEN status IN ('resolved', 'closed') AND DATE(resolved_at) = CURDATE() THEN 1 ELSE 0 END) as resolved_today
      FROM reports
    `);

    // User statistics
    const [userStats] = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'citizen' THEN 1 ELSE 0 END) as citizens,
        SUM(CASE WHEN role = 'collector' THEN 1 ELSE 0 END) as collectors,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    // Recent activity
    const [recentCollections] = await db.query(`
      SELECT COUNT(*) as count
      FROM collection_history
      WHERE collection_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Waste collected this month
    const [monthlyWaste] = await db.query(`
      SELECT COALESCE(SUM(waste_amount), 0) as total
      FROM collection_history
      WHERE MONTH(collection_date) = MONTH(CURDATE())
        AND YEAR(collection_date) = YEAR(CURDATE())
    `);

    res.json({
      success: true,
      data: {
        bins: binStats[0],
        schedules: scheduleStats[0],
        reports: reportStats[0],
        users: userStats[0],
        recent_collections: recentCollections[0].count,
        monthly_waste: parseFloat(monthlyWaste[0].total || 0)
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

// @desc    Get recent activity
// @route   GET /api/dashboard/activity
// @access  Private
exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [activities] = await db.query(`
      (SELECT 
        'collection' as type,
        ch.id,
        ch.collection_date as date,
        b.bin_id,
        b.location,
        u.name as user_name,
        ch.waste_amount as amount
      FROM collection_history ch
      LEFT JOIN bins b ON ch.bin_id = b.id
      LEFT JOIN users u ON ch.collector_id = u.id
      ORDER BY ch.collection_date DESC
      LIMIT ?)
      UNION ALL
      (SELECT 
        'report' as type,
        r.id,
        r.created_at as date,
        b.bin_id,
        r.location,
        u.name as user_name,
        NULL as amount
      FROM reports r
      LEFT JOIN bins b ON r.bin_id = b.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ?)
      ORDER BY date DESC
      LIMIT ?
    `, [parseInt(limit), parseInt(limit), parseInt(limit)]);

    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get collection trends
// @route   GET /api/dashboard/trends
// @access  Private
exports.getCollectionTrends = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const [trends] = await db.query(`
      SELECT 
        DATE(collection_date) as date,
        COUNT(*) as collections,
        COALESCE(SUM(waste_amount), 0) as total_waste
      FROM collection_history
      WHERE collection_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(collection_date)
      ORDER BY date ASC
    `, [parseInt(days)]);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Get collection trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
