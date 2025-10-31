const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./persistence');
const getItems = require('./routes/getItems');
const addItem = require('./routes/addItem');
const updateItem = require('./routes/updateItem');
const deleteItem = require('./routes/deleteItem');

const app = express();
const PORT = process.env.PORT || 3000;
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'static')));

// Initialize database
(async () => {
    try {
        await db.init();
        await fs.mkdir(TEMP_DIR, { recursive: true });
        console.log('✅ Server initialized successfully');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
})();

// Language configurations
const LANGUAGE_CONFIGS = {
    cpp: {
        image: 'code-judge-cpp:latest',
        extension: '.cpp',
        compileCmd: (filename) => `g++ -o /code/program /code/${filename} -std=c++17 -O2`,
        runCmd: '/code/program',
        needCompile: true
    },
    python: {
        image: 'code-judge-python:latest',
        extension: '.py',
        runCmd: (filename) => `python3 /code/${filename}`,
        needCompile: false
    },
    java: {
        image: 'code-judge-java:latest',
        extension: '.java',
        compileCmd: (filename) => `javac /code/${filename}`,
        runCmd: (className) => `java -cp /code ${className}`,
        needCompile: true
    },
    javascript: {
        image: 'code-judge-js:latest',
        extension: '.js',
        runCmd: (filename) => `node /code/${filename}`,
        needCompile: false
    }
};

// Helper: Execute Docker command
function executeDocker(command, timeout = 5000) {
    return new Promise((resolve, reject) => {
        exec(command, { timeout }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Docker error:', error.message);
                if (error.killed) {
                    reject({ type: 'timeout', message: 'Time Limit Exceeded' });
                } else {
                    reject({ type: 'runtime', message: stderr || error.message });
                }
            } else {
                console.log('✅ Docker output:', stdout);
                resolve({ stdout, stderr });
            }
        });
    });
}

// ============================================
// PROBLEM MANAGEMENT ROUTES
// ============================================

// Get all problems
app.get('/items', getItems);

// Get single problem with test cases
app.get('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const problem = await db.findOne('problems', { id });
        if (!problem) {
            return res.status(404).json({ success: false, error: 'Problem not found' });
        }

        // Lấy sample test cases
        const sampleTests = await db.query(
            'SELECT input, expected_output FROM test_cases WHERE problem_id = ? AND is_sample = TRUE ORDER BY test_number',
            [id]
        );

        res.json({
            success: true,
            problem: {
                ...problem,
                sample_tests: sampleTests
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new problem
app.post('/items', addItem);

// Update problem
app.put('/items/:id', updateItem);

// Delete problem
app.delete('/items/:id', deleteItem);

// ============================================
// CODE EXECUTION ROUTES
// ============================================

// Compile & Run (without saving to DB)
app.post('/api/compile', async (req, res) => {
    const { code, language, input = '' } = req.body;

    if (!code || !language || !LANGUAGE_CONFIGS[language]) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid code or language' 
        });
    }

    const config = LANGUAGE_CONFIGS[language];
    const jobId = uuidv4();
    const jobDir = path.join(TEMP_DIR, jobId);

    try {
        await fs.mkdir(jobDir, { recursive: true });

        let filename = `main${config.extension}`;
        let className = 'Main';
        
        if (language === 'java') {
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            if (classMatch) {
                className = classMatch[1];
                filename = `${className}.java`;
            }
        }

        await fs.writeFile(path.join(jobDir, filename), code);
        await fs.writeFile(path.join(jobDir, 'input.txt'), input);

        // Compile
        if (config.needCompile) {
            const compileCmd = config.compileCmd(filename);
            const dockerCompileCmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${compileCmd}"`;

            try {
                await executeDocker(dockerCompileCmd, 10000);
            } catch (error) {
                return res.json({
                    success: false,
                    stage: 'compilation',
                    error: error.message
                });
            }
        }

        // Run
        const runCmd = language === 'java' 
            ? config.runCmd(className)
            : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);

        const dockerRunCmd = `docker run --rm --memory="256m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;

        const runResult = await executeDocker(dockerRunCmd, 5000);
        
        res.json({
            success: true,
            output: runResult.stdout
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.type === 'timeout' ? 'Time Limit Exceeded' : error.message
        });
    } finally {
        setTimeout(async () => {
            try {
                await fs.rm(jobDir, { recursive: true, force: true });
            } catch (err) {}
        }, 10000);
    }
});

// Submit code (save to DB and judge)
app.post('/api/submit', async (req, res) => {
    const { code, language, problemId, userId } = req.body;

    if (!code || !language || !problemId || !userId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields' 
        });
    }

    try {
        const problem = await db.findOne('problems', { id: problemId });
        if (!problem) {
            return res.status(404).json({ success: false, error: 'Problem not found' });
        }

        const testCases = await db.query(
            'SELECT * FROM test_cases WHERE problem_id = ? ORDER BY test_number',
            [problemId]
        );

        if (testCases.length === 0) {
            return res.status(400).json({ success: false, error: 'No test cases' });
        }

        // Create submission
        const submissionCode = uuidv4();
        const submissionId = await db.insert('submissions', {
            submission_code: submissionCode,
            user_id: userId,
            problem_id: problemId,
            language: language,
            source_code: code,
            verdict: 'judging',
            test_cases_total: testCases.length,
            max_score: problem.points
        });

        // Setup job directory
        const config = LANGUAGE_CONFIGS[language];
        const jobId = uuidv4();
        const jobDir = path.join(TEMP_DIR, jobId);
        await fs.mkdir(jobDir, { recursive: true });

        let filename = `main${config.extension}`;
        let className = 'Main';
        
        if (language === 'java') {
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            if (classMatch) {
                className = classMatch[1];
                filename = `${className}.java`;
            }
        }

        await fs.writeFile(path.join(jobDir, filename), code);

        // Compile
        if (config.needCompile) {
            const compileCmd = config.compileCmd(filename);
            const dockerCompileCmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${compileCmd}"`;

            try {
                await executeDocker(dockerCompileCmd, 10000);
            } catch (error) {
                await db.update('submissions', 
                    { 
                        verdict: 'compile_error',
                        error_message: error.message,
                        judged_at: new Date()
                    },
                    { id: submissionId }
                );

                return res.json({
                    success: false,
                    submissionId,
                    verdict: 'compile_error',
                    error: error.message
                });
            }
        }

        // Run test cases
        let passedTests = 0;
        let totalScore = 0;
        let maxTime = 0;
        let finalVerdict = 'accepted';

        for (const testCase of testCases) {
            await fs.writeFile(path.join(jobDir, 'input.txt'), testCase.input);

            const runCmd = language === 'java' 
                ? config.runCmd(className)
                : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);

            const dockerRunCmd = `docker run --rm --memory="256m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;

            let testVerdict = 'wrong_answer';
            let actualOutput = '';
            let errorMsg = null;
            let execTime = 0;

            try {
                const startTime = Date.now();
                const runResult = await executeDocker(dockerRunCmd, problem.time_limit);
                execTime = Date.now() - startTime;
                
                actualOutput = runResult.stdout.trim();
                const expectedOutput = testCase.expected_output.trim();

                if (actualOutput === expectedOutput) {
                    testVerdict = 'accepted';
                    passedTests++;
                    totalScore += testCase.points;
                } else {
                    if (finalVerdict === 'accepted') finalVerdict = 'wrong_answer';
                }

                maxTime = Math.max(maxTime, execTime);

            } catch (error) {
                if (error.type === 'timeout') {
                    testVerdict = 'time_limit';
                    errorMsg = 'Time Limit Exceeded';
                    finalVerdict = 'time_limit';
                } else {
                    testVerdict = 'runtime_error';
                    errorMsg = error.message;
                    if (finalVerdict === 'accepted') finalVerdict = 'runtime_error';
                }
            }

            // Save test result
            await db.insert('test_results', {
                submission_id: submissionId,
                test_case_id: testCase.id,
                verdict: testVerdict,
                actual_output: actualOutput,
                execution_time: execTime,
                points_earned: testVerdict === 'accepted' ? testCase.points : 0,
                max_points: testCase.points,
                error_message: errorMsg
            });
        }

        // Update submission
        await db.update('submissions',
            {
                verdict: finalVerdict,
                test_cases_passed: passedTests,
                score: totalScore,
                execution_time: maxTime,
                judged_at: new Date()
            },
            { id: submissionId }
        );

        // Update user_problem_status
        const existingStatus = await db.findOne('user_problem_status', {
            user_id: userId,
            problem_id: problemId
        });

        if (existingStatus) {
            const updateData = {
                attempts: existingStatus.attempts + 1,
                last_attempt_at: new Date()
            };

            if (finalVerdict === 'accepted' && existingStatus.status !== 'solved') {
                updateData.status = 'solved';
                updateData.solved_at = new Date();
            } else if (finalVerdict !== 'accepted' && existingStatus.status === 'unsolved') {
                updateData.status = 'attempted';
            }

            if (totalScore > existingStatus.best_score) {
                updateData.best_score = totalScore;
            }

            await db.update('user_problem_status', updateData, {
                user_id: userId,
                problem_id: problemId
            });
        } else {
            await db.insert('user_problem_status', {
                user_id: userId,
                problem_id: problemId,
                status: finalVerdict === 'accepted' ? 'solved' : 'attempted',
                attempts: 1,
                solved_at: finalVerdict === 'accepted' ? new Date() : null,
                best_score: totalScore
            });
        }

        // Get results
        const testResults = await db.query(
            'SELECT * FROM test_results WHERE submission_id = ?',
            [submissionId]
        );

        res.json({
            success: true,
            submissionId,
            verdict: finalVerdict,
            passedTests,
            totalTests: testCases.length,
            score: totalScore,
            maxScore: problem.points,
            executionTime: maxTime,
            testResults
        });

        // Cleanup
        setTimeout(async () => {
            try {
                await fs.rm(jobDir, { recursive: true, force: true });
            } catch (err) {}
        }, 10000);

    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ADDITIONAL ROUTES
// ============================================

// Get submissions history
app.get('/api/submissions/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const submissions = await db.query(
            `SELECT 
                s.*,
                p.code as problem_code,
                p.title as problem_title
            FROM submissions s
            INNER JOIN problems p ON s.problem_id = p.id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
            LIMIT 50`,
            [userId]
        );

        res.json({ success: true, submissions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await db.query(
            `SELECT * FROM v_leaderboard LIMIT 100`
        );

        res.json({ success: true, leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        database: 'connected',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await db.teardown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await db.teardown();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 CODE JUDGE SYSTEM SERVER          ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                           ║
║   Database: code_judge_system          ║
║   Status: ✅ Running                    ║
╠════════════════════════════════════════╣
║   📝 API Endpoints:                    ║
║   GET    /items                        ║
║   GET    /items/:id                    ║
║   POST   /items                        ║
║   PUT    /items/:id                    ║
║   DELETE /items/:id                    ║
║                                        ║
║   POST   /api/compile                  ║
║   POST   /api/submit                   ║
║   GET    /api/submissions/user/:id     ║
║   GET    /api/leaderboard              ║
║   GET    /api/health                   ║
╚════════════════════════════════════════╝
    `);
});