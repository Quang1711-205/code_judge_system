const db = require('../persistence');

module.exports = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Kiểm tra problem tồn tại
        const problem = await db.findOne('problems', { id });
        if (!problem) {
            return res.status(404).json({
                success: false,
                error: 'Problem not found'
            });
        }

        // Remove fields không được update
        delete updateData.id;
        delete updateData.total_submissions;
        delete updateData.accepted_submissions;
        delete updateData.acceptance_rate;
        delete updateData.created_at;

        // Update problem
        await db.update('problems', updateData, { id });

        // Lấy lại problem đã update
        const updatedProblem = await db.findOne('problems', { id });

        res.json({
            success: true,
            problem: updatedProblem
        });
    } catch (error) {
        console.error('Error in updateItem:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};