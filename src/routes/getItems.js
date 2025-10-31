const db = require('../persistence');

module.exports = async (req, res) => {
    try {
        const { difficulty, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Bỏ WHERE is_public = TRUE (cột này không tồn tại)
        let sql = 'SELECT * FROM problems';
        const params = [];

        if (difficulty) {
            sql += ' WHERE difficulty = ?';
            params.push(difficulty);
        }

        // Không dùng placeholders cho LIMIT/OFFSET - dùng string interpolation
        sql += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const problems = await db.query(sql, params);

        // Lấy total count
        let countSql = 'SELECT COUNT(*) as total FROM problems';
        const countParams = [];
        
        if (difficulty) {
            countSql += ' WHERE difficulty = ?';
            countParams.push(difficulty);
        }

        const countResult = await db.query(countSql, countParams);
        const total = countResult[0]?.total || 0;

        res.json({
            success: true,
            items: problems, // Đổi từ 'problems' thành 'items' để khớp với frontend
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total
            }
        });
    } catch (error) {
        console.error('Error in getItems:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};