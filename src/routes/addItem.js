const db = require('../persistence');

module.exports = async (req, res) => {
    try {
        const {
            code,
            title,
            description,
            input_format,
            output_format,
            constraints,
            difficulty = 'easy',
            time_limit = 1000,
            memory_limit = 256,
            points = 100,
            test_cases = []
        } = req.body;

        // Validate
        if (!code || !title || !description) {
            return res.status(400).json({
                success: false,
                error: 'Code, title, and description are required'
            });
        }

        // Kiểm tra code đã tồn tại chưa
        const existing = await db.findOne('problems', { code });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Problem code already exists'
            });
        }

        // Insert problem
        const problemId = await db.insert('problems', {
            code,
            title,
            description,
            input_format,
            output_format,
            constraints,
            difficulty,
            time_limit,
            memory_limit,
            points,
            is_public: true
        });

        // Insert test cases
        if (test_cases && test_cases.length > 0) {
            for (let i = 0; i < test_cases.length; i++) {
                const tc = test_cases[i];
                await db.insert('test_cases', {
                    problem_id: problemId,
                    test_number: i + 1,
                    input: tc.input,
                    expected_output: tc.output,
                    is_sample: tc.is_sample || false,
                    points: tc.points || 10
                });
            }
        }

        // Lấy lại problem vừa tạo
        const problem = await db.findOne('problems', { id: problemId });

        res.json({
            success: true,
            problem
        });
    } catch (error) {
        console.error('Error in addItem:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};