const db = require('../persistence');

module.exports = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra problem tồn tại
        const problem = await db.findOne('problems', { id });
        if (!problem) {
            return res.status(404).json({
                success: false,
                error: 'Problem not found'
            });
        }

        // Delete problem (cascade sẽ tự động xóa test_cases)
        await db.remove('problems', { id });

        res.json({
            success: true,
            message: 'Problem deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteItem:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};