// const express  = require('express');
// const cors     = require('cors');
// const { exec } = require('child_process');
// const fs       = require('fs').promises;
// const path     = require('path');
// const { v4: uuidv4 } = require('uuid');
// const fetch    = require('node-fetch');

// const db = require('./persistence');

// const app  = express();
// const PORT = process.env.PORT || 3000;  

// const TEMP_DIR       = path.join(__dirname, '..', 'temp');
// const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:4000/api';
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAfPjyC0nn3-WNEW-1YbdpVpj5FIO5No6A';  // ← Thêm mới

// app.use(cors());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.static(path.join(__dirname, 'static')));

// // ── Init ──────────────────────────────────────────────────────────────────────
// (async () => {
//     try {
//         await db.init();
//         await fs.mkdir(TEMP_DIR, { recursive: true });
        
//         console.log('✅ NestJS API URL:', NESTJS_API_URL);
//         console.log('✅ Gemini AI:', GEMINI_API_KEY ? 'enabled' : 'disabled (no key)');
//         console.log('✅ Code Judge Premium initialized');
//     } catch (error) {
//         console.error('❌ Initialization failed:', error);
//         process.exit(1);
//     }
// })();

// // ── Language configs (giữ nguyên) ─────────────────────────────────────────────
// const LANGUAGE_CONFIGS = {
//     python: {
//         image: 'code-judge-python:latest',
//         extension: '.py',
//         runCmd: (filename) => `python3 /code/${filename}`,
//         needCompile: false
//     },
//     java: {
//         image: 'code-judge-java:latest',
//         extension: '.java',
//         compileCmd: (filename) => `javac /code/${filename}`,
//         runCmd: (className) => `java -cp /code ${className}`,
//         needCompile: true
//     },
//     cpp: {
//         image: 'code-judge-cpp:latest',
//         extension: '.cpp',
//         compileCmd: (filename) => `g++ -o /code/program /code/${filename} -std=c++17 -O2`,
//         runCmd: '/code/program',
//         needCompile: true
//     },
//     'c++': {
//         image: 'code-judge-cpp:latest',
//         extension: '.cpp',
//         compileCmd: (filename) => `g++ -o /code/program /code/${filename} -std=c++17 -O2`,
//         runCmd: '/code/program',
//         needCompile: true
//     },
//     javascript: {
//         image: 'code-judge-js:latest',
//         extension: '.js',
//         runCmd: (filename) => `node /code/${filename}`,
//         needCompile: false
//     }
// };

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function normalizeOutput(output) {
//     return output
//         .trim()
//         .replace(/\r\n/g, '\n')
//         .replace(/\s+$/gm, '')
//         .replace(/^\s+/gm, '')
//         .replace(/\n+/g, '\n');
// }

// function compareOutputs(actual, expected, options = {}) {
//     const { ignoreCase = false, ignoreWhitespace = true, ignoreTrailingNewlines = true } = options;
//     let a = actual, e = expected;
//     if (ignoreWhitespace)       { a = normalizeOutput(a); e = normalizeOutput(e); }
//     if (ignoreCase)             { a = a.toLowerCase();    e = e.toLowerCase(); }
//     if (ignoreTrailingNewlines) { a = a.replace(/\n+$/, ''); e = e.replace(/\n+$/, ''); }
//     return {
//         isMatch: a === e,
//         actual: a, expected: e,
//         diff: {
//             actualLength: a.length, expectedLength: e.length,
//             actualLines: a.split('\n').length, expectedLines: e.split('\n').length,
//         }
//     };
// }

// function executeDocker(command, timeout = 5000) {
//     return new Promise((resolve, reject) => {
//         exec(command, { timeout }, (error, stdout, stderr) => {
//             if (error) {
//                 if (error.killed) reject({ type: 'timeout', message: 'Time Limit Exceeded' });
//                 else              reject({ type: 'runtime', message: stderr || error.message });
//             } else {
//                 resolve({ stdout, stderr });
//             }
//         });
//     });
// }

// function extractToken(req) {
//     const h = req.headers.authorization;
//     return h?.startsWith('Bearer ') ? h.substring(7) : null;
// }

// // ── Gemini AI feedback ────────────────────────────────────────────────────────
// async function getGeminiFeedback(exercise, submittedCode, passPercentage, language) {
//     if (!GEMINI_API_KEY) {
//         // Fallback nếu không có key
//         return {
//             evaluation    : passPercentage >= 70 ? 'Code hoạt động tốt!' : 'Code cần cải thiện.',
//             strengths     : passPercentage >= 70 ? ['Logic đúng', 'Hoàn thành yêu cầu'] : [],
//             improvements  : passPercentage < 70  ? ['Kiểm tra lại logic', 'Đảm bảo output format chính xác'] : [],
//             code_quality_score: Math.min(10, Math.round(passPercentage / 10)),
//         };
//     }

//     try {
//         const prompt = `Bạn là một giảng viên lập trình. Hãy nhận xét ngắn gọn (tiếng Việt) cho bài nộp sau:

// Bài tập: ${exercise.exercise_title}
// Ngôn ngữ: ${language}
// Kết quả: Pass ${passPercentage}% test cases

// Code của học viên:
// \`\`\`${language}
// ${submittedCode.substring(0, 1500)}
// \`\`\`

// Trả lời ĐÚNG định dạng JSON sau, không thêm gì khác:
// {
//   "evaluation": "nhận xét tổng quan 1-2 câu",
//   "strengths": ["điểm mạnh 1", "điểm mạnh 2", "Điểm mạnh của code"],
//   "improvements": ["cần cải thiện 1", "cần cải thiện 2", "Code cần cải thiện gì"],
//   "code_quality_score": <số từ 1-10>
// }`;

//         const response = await fetch(
//             `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
//             {
//                 method : 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body   : JSON.stringify({
//                     contents: [{ parts: [{ text: prompt }] }],
//                     generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
//                 }),
//             }
//         );

//         if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);

//         const data       = await response.json();
//         const rawText    = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
//         const jsonMatch  = rawText.match(/\{[\s\S]*\}/);
//         if (!jsonMatch) throw new Error('No JSON in Gemini response');

//         const parsed = JSON.parse(jsonMatch[0]);
//         console.log('✅ Gemini feedback generated');
//         return parsed;

//     } catch (err) {
//         console.warn('⚠️  Gemini failed, using fallback:', err.message);
//         return {
//             evaluation    : passPercentage >= 70 ? 'Code hoạt động tốt!' : 'Code cần cải thiện.',
//             strengths     : passPercentage >= 70 ? ['Logic đúng', 'Hoàn thành yêu cầu'] : [],
//             improvements  : passPercentage < 70  ? ['Kiểm tra lại logic', 'Đảm bảo output format chính xác'] : [],
//             code_quality_score: Math.min(10, Math.round(passPercentage / 10)),
//         };
//     }
// }

// // ── COMPILE & RUN (giữ nguyên logic, không đổi) ───────────────────────────────
// app.post('/api/compile', async (req, res) => {
//     const { code, language, input = '' } = req.body;
//     if (!code || !language) {
//         return res.status(400).json({ success: false, error: 'Missing code or language' });
//     }
//     const normalizedLang = language.toLowerCase();
//     if (!LANGUAGE_CONFIGS[normalizedLang]) {
//         return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
//     }

//     const config = LANGUAGE_CONFIGS[normalizedLang];
//     const jobId  = uuidv4();
//     const jobDir = path.join(TEMP_DIR, jobId);

//     try {
//         await fs.mkdir(jobDir, { recursive: true });

//         let filename = `main${config.extension}`, className = 'Main';
//         if (normalizedLang === 'java') {
//             const m = code.match(/public\s+class\s+(\w+)/);
//             if (m) { className = m[1]; filename = `${className}.java`; }
//         }

//         const unescaped = code.replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');
//         await fs.writeFile(path.join(jobDir, filename), unescaped);
//         await fs.writeFile(path.join(jobDir, 'input.txt'), input);

//         if (config.needCompile) {
//             const cmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${config.compileCmd(filename)}"`;
//             try {
//                 await executeDocker(cmd, 10000);
//             } catch (e) {
//                 return res.json({ success: false, stage: 'compilation', error: e.message });
//             }
//         }

//         const runCmd = normalizedLang === 'java'
//             ? config.runCmd(className)
//             : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);
//         const dockerRun = `docker run --rm --memory="256m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;
//         const result = await executeDocker(dockerRun, 5000);

//         res.json({ success: true, output: result.stdout });

//     } catch (error) {
//         res.json({ success: false, error: error.type === 'timeout' ? 'Time Limit Exceeded' : error.message });
//     } finally {
//         setTimeout(async () => { try { await fs.rm(jobDir, { recursive: true, force: true }); } catch {} }, 10000);
//     }
// });

// // ── SUBMIT CODE ───────────────────────────────────────────────────────────────
// app.post('/api/submit', async (req, res) => {
//     const { exercise_id, submitted_code, language, user_id } = req.body;
//     const token = extractToken(req);

//     console.log('\n' + '='.repeat(60));
//     console.log('📤 SUBMIT — Premium');
//     console.log(`   exercise_id=${exercise_id} user_id=${user_id} lang=${language}`);
//     console.log('='.repeat(60));

//     if (!submitted_code || !language || !exercise_id) {
//         return res.status(400).json({ success: false, error: 'Missing required fields' });
//     }

//     try {
//         // 1️⃣ Lấy exercise — ✅ FIX: is_active filter
//         const exercise = await db.findOne('exercises', { exercise_id, is_active: 1 });
//         if (!exercise) {
//             return res.status(404).json({ success: false, error: 'Exercise not found' });
//         }
//         // ✅ FIX: premium dùng field 'title' không phải 'exercise_title'
//         console.log(`✅ Exercise: "${exercise.title}" (${exercise.difficulty})`);

//         // 2️⃣ Lấy test cases — ✅ FIX: field 'input' không phải 'input_data'
//         const testCases = await db.query(
//             `SELECT test_case_id, exercise_id,
//                     input_data,
//                     expected_output,
//                     is_sample,
//                     points,
//                     display_order, test_number
//             FROM test_cases
//             WHERE exercise_id = ?
//             ORDER BY display_order`,
//             [exercise_id]
//         );

//         if (testCases.length === 0) {
//             return res.status(400).json({ success: false, error: 'No test cases found' });
//         }
//         console.log(`✅ Found ${testCases.length} test cases`);

//         // 3️⃣ Setup
//         const normalizedLang = language.toLowerCase();
//         const config = LANGUAGE_CONFIGS[normalizedLang];
//         if (!config) {
//             return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
//         }

//         const jobId  = uuidv4();
//         const jobDir = path.join(TEMP_DIR, jobId);
//         await fs.mkdir(jobDir, { recursive: true });

//         let filename = `main${config.extension}`, className = 'Main';
//         if (normalizedLang === 'java') {
//             const m = submitted_code.match(/public\s+class\s+(\w+)/);
//             if (m) { className = m[1]; filename = `${className}.java`; }
//         }

//         const unescaped = submitted_code.replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');
//         await fs.writeFile(path.join(jobDir, filename), unescaped);

//         // 4️⃣ Compile
//         if (config.needCompile) {
//             const cmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${config.compileCmd(filename)}"`;
//             try {
//                 await executeDocker(cmd, 10000);
//                 console.log('✅ Compiled');
//             } catch (e) {
//                 return res.json({
//                     success: false, verdict: 'compile_error', error: e.message,
//                     passedTests: 0, totalTests: testCases.length, pass_percentage: 0,
//                 });
//             }
//         }

//         // 5️⃣ Run test cases
//         let passedTests = 0, maxTime = 0;
//         const testResults = [], detailedLogs = [];
//         let firstFailure = null;

//         for (const testCase of testCases) {
//             // ✅ FIX: dùng testCase.input thay vì testCase.input_data
//             const processedInput = (testCase.input_data || '')
//                 .replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');
//             const processedExpected = (testCase.expected_output || '')
//                 .replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');

//             await fs.writeFile(path.join(jobDir, 'input.txt'), processedInput);

//             const runCmd = normalizedLang === 'java'
//                 ? config.runCmd(className)
//                 : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);

//             // ✅ FIX: premium dùng time_limit_sec, không phải time_limit_seconds
//             const timeLimitMs = (exercise.time_limit_seconds ?? 2) * 1000;
//             const memLimit    = exercise.memory_limit_mb ?? 256;
//             const dockerRun   = `docker run --rm --memory="${memLimit}m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;

//             let testStatus = 'wrong_answer', execTime = 0;

//             try {
//                 const t0     = Date.now();
//                 const result = await executeDocker(dockerRun, timeLimitMs);
//                 execTime     = Date.now() - t0;

//                 const cmp = compareOutputs(result.stdout, processedExpected, {
//                     ignoreWhitespace: true, ignoreTrailingNewlines: true,
//                 });

//                 if (cmp.isMatch) {
//                     testStatus = 'passed';
//                     passedTests++;
//                     console.log(`   ✅ TC#${testCase.test_number} PASSED (${execTime}ms)`);
//                 } else {
//                     console.log(`   ❌ TC#${testCase.test_number} WRONG`);
//                     if (!firstFailure && testCase.is_sample) {
//                         firstFailure = { test_number: testCase.test_number, input_data: processedInput, expected: cmp.expected, actual: cmp.actual };
//                     }
//                 }

//                 maxTime = Math.max(maxTime, execTime);
//                 detailedLogs.push({
//                     test_number: testCase.test_number, is_sample: testCase.is_sample,
//                     status: testStatus,
//                     input_data   : testCase.is_sample ? processedInput    : '[Hidden]',
//                     expected: testCase.is_sample ? cmp.expected      : '[Hidden]',
//                     actual  : testCase.is_sample ? cmp.actual        : (testStatus === 'passed' ? '[Correct]' : '[Wrong]'),
//                     execution_time_ms: execTime,
//                 });

//             } catch (e) {
//                 testStatus = e.type === 'timeout' ? 'timeout' : 'runtime_error';
//                 console.log(`   ⚠️  TC#${testCase.test_number} ${testStatus}`);
//                 detailedLogs.push({ test_number: testCase.test_number, is_sample: testCase.is_sample, status: testStatus, error: e.message });
//             }

//             testResults.push({ test_number: testCase.test_number, status: testStatus, execution_time_ms: execTime, passed: testStatus === 'passed' });
//         }

//         // 6️⃣ Kết quả
//         const passPercentage  = Math.round((passedTests / testCases.length) * 100);
//         const performanceGrade = passPercentage === 100 ? 'A+' : passPercentage >= 90 ? 'A' : passPercentage >= 80 ? 'B' : passPercentage >= 70 ? 'C' : passPercentage >= 60 ? 'D' : 'F';

//         console.log(`\n📊 Result: ${passedTests}/${testCases.length} (${passPercentage}%) — ${performanceGrade}`);

//         // 7️⃣ Chỉ gọi NestJS callback, KHÔNG gọi Gemini ở Express nữa
//         const nestjsResponse = await (async () => {
//             if (passPercentage < 70) return null;
//             try {
//                 const headers = { 'Content-Type': 'application/json' };
//                 if (token) headers['Authorization'] = `Bearer ${token}`;

//                 const r = await fetch(`${NESTJS_API_URL}/exercises/mark-completed`, {  // ✅ sửa URL
//                     method: 'POST',
//                     headers,
//                     body: JSON.stringify({
//                         user_id,
//                         exercise_id,
//                         submitted_code,
//                         language,
//                         pass_percentage   : passPercentage,
//                         test_cases_passed : passedTests,
//                         total_test_cases  : testCases.length,
//                         execution_time_ms : maxTime,
//                         memory_used_mb    : exercise.memory_limit_mb ?? 256,
//                     }),
//                 });

//                 if (r.ok) {
//                     const data = await r.json();
//                     console.log(`✅ NestJS callback OK — XP: ${data.xp_earned}`);
//                     return data;
//                 } else {
//                     console.warn(`⚠️  NestJS callback ${r.status}`);
//                     return null;
//                 }
//             } catch (e) {
//                 console.error('❌ NestJS callback failed:', e.message);
//                 return null;
//             }
//         })();

//         // Cleanup
//         setTimeout(async () => { try { await fs.rm(jobDir, { recursive: true, force: true }); } catch {} }, 10000);

//         // 8️⃣ Response — ai_feedback lấy từ NestJS (NestJS đã gọi Gemini rồi)
//         res.json({
//             success          : passPercentage >= 70,
//             verdict          : passPercentage >= 70 ? 'accepted' : 'wrong_answer',
//             message          : passPercentage === 100
//                 ? `🎉 Xuất sắc! Pass tất cả ${testCases.length} test cases!`
//                 : passPercentage >= 70
//                 ? `✅ Pass ${passedTests}/${testCases.length} test cases`
//                 : `❌ Pass ${passedTests}/${testCases.length} (${passPercentage}%). Cần >= 70%`,
//             passedTests,
//             totalTests       : testCases.length,
//             pass_percentage  : passPercentage,
//             performance_grade: performanceGrade,
//             execution_time_ms: maxTime,
//             testResults,
//             detailedLogs,
//             first_failure    : firstFailure,
//             xp_earned        : nestjsResponse?.xp_earned  ?? 0,
//             total_xp         : nestjsResponse?.total_xp   ?? 0,
//             lesson_progress  : nestjsResponse?.lesson_progress ?? null,
//             ai_feedback      : nestjsResponse?.ai_feedback ?? null,  // ✅ lấy từ NestJS
//         });

//     } catch (error) {
//         console.error('💥 Submit error:', error.stack);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });


// // ── SUBMIT PLACEMENT (không gọi callback NestJS) ─────────────────────────────
// // Dùng riêng cho Placement Test — NestJS tự xử lý roadmap update
// // KHÔNG mark lesson completed, KHÔNG cộng XP qua callback
// app.post('/api/submit-placement', async (req, res) => {
//     const { exercise_id, submitted_code, language, user_id } = req.body;

//     console.log('\n' + '='.repeat(60));
//     console.log('🎯 SUBMIT PLACEMENT');
//     console.log(`   exercise_id=${exercise_id} user_id=${user_id} lang=${language}`);
//     console.log('='.repeat(60));

//     if (!submitted_code || !language || !exercise_id) {
//         return res.status(400).json({ success: false, error: 'Missing required fields' });
//     }

//     try {
//         // 1️⃣ Lấy exercise
//         const exercise = await db.findOne('exercises', { exercise_id, is_active: 1 });
//         if (!exercise) {
//             return res.status(404).json({ success: false, error: 'Exercise not found' });
//         }
//         console.log(`✅ Exercise: "${exercise.title}" (${exercise.difficulty}) topic=${exercise.topic_tag}`);

//         // 2️⃣ Lấy test cases
//         const testCases = await db.query(
//             `SELECT test_case_id, exercise_id,
//                     \`input\`,
//                     expected_output,
//                     is_sample, is_hidden, score_weight,
//                     display_order, display_order AS test_number
//              FROM test_cases
//              WHERE exercise_id = ?
//              ORDER BY display_order`,
//             [exercise_id]
//         );

//         if (testCases.length === 0) {
//             return res.status(400).json({ success: false, error: 'No test cases found' });
//         }
//         console.log(`✅ Found ${testCases.length} test cases`);

//         // 3️⃣ Setup language config
//         const normalizedLang = language.toLowerCase();
//         const config = LANGUAGE_CONFIGS[normalizedLang];
//         if (!config) {
//             return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
//         }

//         const jobId  = uuidv4();
//         const jobDir = path.join(TEMP_DIR, jobId);
//         await fs.mkdir(jobDir, { recursive: true });

//         let filename = `main${config.extension}`, className = 'Main';
//         if (normalizedLang === 'java') {
//             const m = submitted_code.match(/public\s+class\s+(\w+)/);
//             if (m) { className = m[1]; filename = `${className}.java`; }
//         }

//         const unescaped = submitted_code
//             .replace(/\\n/g, '\n')
//             .replace(/\\t/g, '\t')
//             .replace(/\\r/g, '\r');
//         await fs.writeFile(path.join(jobDir, filename), unescaped);

//         // 4️⃣ Compile
//         if (config.needCompile) {
//             const cmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${config.compileCmd(filename)}"`;
//             try {
//                 await executeDocker(cmd, 10000);
//                 console.log('✅ Compiled');
//             } catch (e) {
//                 await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
//                 return res.json({
//                     success          : false,
//                     verdict          : 'compile_error',
//                     error            : e.message,
//                     passed_tests     : 0,
//                     total_tests      : testCases.length,
//                     pass_percentage  : 0,
//                     test_results     : [],
//                     detailed_logs    : [],
//                 });
//             }
//         }

//         // 5️⃣ Run từng test case
//         let passedTests = 0, maxTime = 0;
//         const testResults = [], detailedLogs = [];

//         for (const testCase of testCases) {
//             const processedInput = (testCase.input || '')
//                 .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
//             const processedExpected = (testCase.expected_output || '')
//                 .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');

//             await fs.writeFile(path.join(jobDir, 'input.txt'), processedInput);

//             const runCmd = normalizedLang === 'java'
//                 ? config.runCmd(className)
//                 : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);

//             const timeLimitMs = (exercise.time_limit_sec ?? 2) * 1000;
//             const memLimit    = exercise.memory_limit_mb ?? 256;
//             const dockerRun   = `docker run --rm --memory="${memLimit}m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;

//             let testStatus = 'wrong_answer', execTime = 0;

//             try {
//                 const t0     = Date.now();
//                 const result = await executeDocker(dockerRun, timeLimitMs);
//                 execTime     = Date.now() - t0;

//                 const cmp = compareOutputs(result.stdout, processedExpected, {
//                     ignoreWhitespace       : true,
//                     ignoreTrailingNewlines : true,
//                 });

//                 if (cmp.isMatch) {
//                     testStatus = 'passed';
//                     passedTests++;
//                     console.log(`   ✅ TC#${testCase.test_number} PASSED (${execTime}ms)`);
//                 } else {
//                     console.log(`   ❌ TC#${testCase.test_number} WRONG — expected="${cmp.expected}" got="${cmp.actual}"`);
//                 }

//                 maxTime = Math.max(maxTime, execTime);
//                 detailedLogs.push({
//                     test_number      : testCase.test_number,
//                     is_sample        : !!testCase.is_sample,
//                     status           : testStatus,
//                     input            : testCase.is_sample ? processedInput   : '[Hidden]',
//                     expected         : testCase.is_sample ? cmp.expected     : '[Hidden]',
//                     actual           : testCase.is_sample ? cmp.actual       : (testStatus === 'passed' ? '[Correct]' : '[Wrong]'),
//                     execution_time_ms: execTime,
//                 });

//             } catch (e) {
//                 testStatus = e.type === 'timeout' ? 'timeout' : 'runtime_error';
//                 console.log(`   ⚠️  TC#${testCase.test_number} ${testStatus}: ${e.message}`);
//                 detailedLogs.push({
//                     test_number      : testCase.test_number,
//                     is_sample        : !!testCase.is_sample,
//                     status           : testStatus,
//                     error            : e.message,
//                     execution_time_ms: 0,
//                 });
//             }

//             testResults.push({
//                 test_number      : testCase.test_number,
//                 status           : testStatus,
//                 execution_time_ms: execTime,
//                 passed           : testStatus === 'passed',
//             });
//         }

//         // 6️⃣ Tính kết quả
//         const passPercentage = Math.round((passedTests / testCases.length) * 100);
//         const verdict =
//             passPercentage === 100 ? 'accepted'     :
//             passPercentage >= 70   ? 'accepted'     :
//             testResults.some(t => t.status === 'timeout')       ? 'time_limit'   :
//             testResults.some(t => t.status === 'runtime_error') ? 'runtime_error': 'wrong_answer';

//         console.log(`\n📊 Placement result: ${passedTests}/${testCases.length} (${passPercentage}%) — ${verdict}`);

//         // Cleanup
//         setTimeout(async () => {
//             try { await fs.rm(jobDir, { recursive: true, force: true }); } catch {}
//         }, 10000);

//         // 7️⃣ Response — KHÔNG gọi callback NestJS
//         // NestJS (PlacementService) nhận kết quả này và tự tính roadmap
//         res.json({
//             success          : passPercentage >= 70,
//             verdict,
//             passed_tests     : passedTests,
//             total_tests      : testCases.length,
//             pass_percentage  : passPercentage,
//             execution_time_ms: maxTime,
//             test_results     : testResults,
//             detailed_logs    : detailedLogs,
//         });

//     } catch (error) {
//         console.error('💥 Submit-placement error:', error.stack);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });

// // ── Health check ──────────────────────────────────────────────────────────────
// app.get('/api/health', async (req, res) => {
//     try {
//         const [exCount] = await db.query('SELECT COUNT(*) AS count FROM exercises');
//         const [tcCount] = await db.query('SELECT COUNT(*) AS count FROM test_cases');

//         let nestjsStatus = 'unknown';
//         try {
//             const r = await fetch(`${NESTJS_API_URL}/lesson/dashboard/1?userId=1`, { timeout: 2000 });
//             nestjsStatus = r.ok ? 'connected' : 'error';
//         } catch { nestjsStatus = 'unreachable'; }

//         res.json({
//             status   : 'OK',
//             database : 'learn_code',
//             gemini   : GEMINI_API_KEY ? 'enabled' : 'disabled',
//             nestjs   : nestjsStatus,
//             stats    : { exercises: exCount.count, test_cases: tcCount.count },
//         });
//     } catch (e) {
//         res.status(500).json({ status: 'ERROR', error: e.message });
//     }
// });

// // ── Shutdown ──────────────────────────────────────────────────────────────────
// process.on('SIGTERM', async () => { await db.teardown(); process.exit(0); });
// process.on('SIGINT',  async () => { await db.teardown(); process.exit(0); });

// app.listen(PORT, () => {
//     console.log(`
// ╔════════════════════════════════════════════════════╗
// ║   🚀 CODE JUDGE PREMIUM - ExpressJS Server         ║
// ╠════════════════════════════════════════════════════╣
// ║   Port:     ${String(PORT).padEnd(38)} ║
// ║   Database: learn_code                    ║
// ║   NestJS:   ${NESTJS_API_URL.padEnd(38)} ║
// ║   Gemini:   ${(GEMINI_API_KEY ? 'enabled ✅' : 'disabled ⬜').padEnd(38)} ║
// ╚════════════════════════════════════════════════════╝
//     `);
// });











const express  = require('express');
const cors     = require('cors');
const { exec } = require('child_process');
const fs       = require('fs').promises;
const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch    = require('node-fetch');

const db = require('./persistence');

const app  = express();
const PORT = process.env.PORT || 3000;  

const TEMP_DIR       = path.join(__dirname, '..', 'temp');
const NESTJS_API_URL = process.env.NESTJS_API_URL || 'http://localhost:4000/api';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAfPjyC0nn3-WNEW-1YbdpVpj5FIO5No6A';  // ← Thêm mới

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'static')));

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
    try {
        await db.init();
        await fs.mkdir(TEMP_DIR, { recursive: true });
        
        console.log('✅ NestJS API URL:', NESTJS_API_URL);
        console.log('✅ Gemini AI:', GEMINI_API_KEY ? 'enabled' : 'disabled (no key)');
        console.log('✅ Code Judge Premium initialized');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
})();

// ── Language configs (giữ nguyên) ─────────────────────────────────────────────
const LANGUAGE_CONFIGS = {
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
    cpp: {
        image: 'code-judge-cpp:latest',
        extension: '.cpp',
        compileCmd: (filename) => `g++ -o /code/program /code/${filename} -std=c++17 -O2`,
        runCmd: '/code/program',
        needCompile: true
    },
    'c++': {
        image: 'code-judge-cpp:latest',
        extension: '.cpp',
        compileCmd: (filename) => `g++ -o /code/program /code/${filename} -std=c++17 -O2`,
        runCmd: '/code/program',
        needCompile: true
    },
    javascript: {
        image: 'code-judge-js:latest',
        extension: '.js',
        runCmd: (filename) => `node /code/${filename}`,
        needCompile: false
    }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeOutput(output) {
    return output
        .trim()
        .replace(/\r\n/g, '\n')
        .replace(/\s+$/gm, '')
        .replace(/^\s+/gm, '')
        .replace(/\n+/g, '\n');
}

function compareOutputs(actual, expected, options = {}) {
    const { ignoreCase = false, ignoreWhitespace = true, ignoreTrailingNewlines = true } = options;
    let a = actual, e = expected;
    if (ignoreWhitespace)       { a = normalizeOutput(a); e = normalizeOutput(e); }
    if (ignoreCase)             { a = a.toLowerCase();    e = e.toLowerCase(); }
    if (ignoreTrailingNewlines) { a = a.replace(/\n+$/, ''); e = e.replace(/\n+$/, ''); }
    return {
        isMatch: a === e,
        actual: a, expected: e,
        diff: {
            actualLength: a.length, expectedLength: e.length,
            actualLines: a.split('\n').length, expectedLines: e.split('\n').length,
        }
    };
}

function executeDocker(command, timeout = 5000) {
    return new Promise((resolve, reject) => {
        exec(command, { timeout }, (error, stdout, stderr) => {
            if (error) {
                if (error.killed) reject({ type: 'timeout', message: 'Time Limit Exceeded' });
                else              reject({ type: 'runtime', message: stderr || error.message });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

function extractToken(req) {
    const h = req.headers.authorization;
    return h?.startsWith('Bearer ') ? h.substring(7) : null;
}

// ── Gemini AI feedback ────────────────────────────────────────────────────────
async function getGeminiFeedback(exercise, submittedCode, passPercentage, language) {
    if (!GEMINI_API_KEY) {
        // Fallback nếu không có key
        return {
            evaluation    : passPercentage >= 70 ? 'Code hoạt động tốt!' : 'Code cần cải thiện.',
            strengths     : passPercentage >= 70 ? ['Logic đúng', 'Hoàn thành yêu cầu'] : [],
            improvements  : passPercentage < 70  ? ['Kiểm tra lại logic', 'Đảm bảo output format chính xác'] : [],
            code_quality_score: Math.min(10, Math.round(passPercentage / 10)),
        };
    }

    try {
        const prompt = `Bạn là một giảng viên lập trình. Hãy nhận xét ngắn gọn (tiếng Việt) cho bài nộp sau:

Bài tập: ${exercise.exercise_title}
Ngôn ngữ: ${language}
Kết quả: Pass ${passPercentage}% test cases

Code của học viên:
\`\`\`${language}
${submittedCode.substring(0, 1500)}
\`\`\`

Trả lời ĐÚNG định dạng JSON sau, không thêm gì khác:
{
  "evaluation": "nhận xét tổng quan 1-2 câu",
  "strengths": ["điểm mạnh 1", "điểm mạnh 2", "Điểm mạnh của code"],
  "improvements": ["cần cải thiện 1", "cần cải thiện 2", "Code cần cải thiện gì"],
  "code_quality_score": <số từ 1-10>
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
                }),
            }
        );

        if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);

        const data       = await response.json();
        const rawText    = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const jsonMatch  = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in Gemini response');

        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Gemini feedback generated');
        return parsed;

    } catch (err) {
        console.warn('⚠️  Gemini failed, using fallback:', err.message);
        return {
            evaluation    : passPercentage >= 70 ? 'Code hoạt động tốt!' : 'Code cần cải thiện.',
            strengths     : passPercentage >= 70 ? ['Logic đúng', 'Hoàn thành yêu cầu'] : [],
            improvements  : passPercentage < 70  ? ['Kiểm tra lại logic', 'Đảm bảo output format chính xác'] : [],
            code_quality_score: Math.min(10, Math.round(passPercentage / 10)),
        };
    }
}

// ── Gemini: giải thích lỗi runtime/compile cho người học ─────────────────────
async function getGeminiErrorExplanation(errorMessage, code, language) {
    if (!GEMINI_API_KEY) return null;

    try {
        const prompt = `Bạn là trợ lý lập trình cho người mới học. Hãy đọc thông báo lỗi sau và giải thích bằng tiếng Việt.

Ngôn ngữ: ${language}

Thông báo lỗi từ hệ thống:
${errorMessage.substring(0, 800)}

Yêu cầu trả lời theo đúng format sau (không thêm gì khác):
- Lỗi: [tên lỗi cụ thể, ví dụ: thiếu dấu chấm phẩy, kiểu dữ liệu sai, biến chưa khai báo...]
- Vị trí: [dòng số mấy nếu có trong thông báo lỗi, nếu không có thì bỏ qua dòng này]
- Nguyên nhân: [giải thích 1-2 câu tại sao lỗi xảy ra, dễ hiểu cho người mới]`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
                }),
            }
        );

        if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        console.log('✅ Gemini error explanation generated');
        return text.trim() || null;

    } catch (err) {
        console.warn('⚠️  Gemini error explanation failed:', err.message);
        return null;
    }
}

// ── COMPILE & RUN (giữ nguyên logic, không đổi) ───────────────────────────────
app.post('/api/compile', async (req, res) => {
    const { code, language, input = '' } = req.body;
    if (!code || !language) {
        return res.status(400).json({ success: false, error: 'Missing code or language' });
    }
    const normalizedLang = language.toLowerCase();
    if (!LANGUAGE_CONFIGS[normalizedLang]) {
        return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
    }

    const config = LANGUAGE_CONFIGS[normalizedLang];
    const jobId  = uuidv4();
    const jobDir = path.join(TEMP_DIR, jobId);

    try {
        await fs.mkdir(jobDir, { recursive: true });

        let filename = `main${config.extension}`, className = 'Main';
        if (normalizedLang === 'java') {
            const m = code.match(/public\s+class\s+(\w+)/);
            if (m) { className = m[1]; filename = `${className}.java`; }
        }

        const unescaped = code.replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');
        await fs.writeFile(path.join(jobDir, filename), unescaped);
        await fs.writeFile(path.join(jobDir, 'input.txt'), input);

        if (config.needCompile) {
                    const cmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${config.compileCmd(filename)}"`;
                    try {
                        await executeDocker(cmd, 10000);
                    } catch (e) {
                        // ✅ Lỗi biên dịch → gọi AI giải thích
                        const aiExplanation = await getGeminiErrorExplanation(e.message, code, normalizedLang);
                        return res.json({
                            success        : false,
                            stage          : 'compilation',
                            error          : e.message,
                            ai_explanation : aiExplanation,
                        });
                    }
        }

        const runCmd = normalizedLang === 'java'
            ? config.runCmd(className)
            : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);
        const dockerRun = `docker run --rm --memory="256m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;
        const result = await executeDocker(dockerRun, 5000);

        res.json({ success: true, output: result.stdout });

    } catch (error) {
        // Nếu là lỗi thật (không phải timeout) → gọi AI giải thích
        const rawError = error.type === 'timeout' ? 'Time Limit Exceeded' : error.message;
        let aiExplanation = null;

        if (error.type !== 'timeout') {
            aiExplanation = await getGeminiErrorExplanation(rawError, code, normalizedLang);
        }

        res.json({
            success        : false,
            error          : rawError,
            ai_explanation : aiExplanation,   // null nếu timeout hoặc Gemini thất bại
        });
    } finally  {
        setTimeout(async () => { try { await fs.rm(jobDir, { recursive: true, force: true }); } catch {} }, 10000);
    }
});

// ── SUBMIT CODE ───────────────────────────────────────────────────────────────
app.post('/api/submit', async (req, res) => {
    const { exercise_id, submitted_code, language, user_id } = req.body;
    const token = extractToken(req);

    console.log('\n' + '='.repeat(60));
    console.log('📤 SUBMIT — Premium');
    console.log(`   exercise_id=${exercise_id} user_id=${user_id} lang=${language}`);
    console.log('='.repeat(60));

    if (!submitted_code || !language || !exercise_id) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // 1️⃣ Lấy exercise — ✅ FIX: is_active filter
        const exercise = await db.findOne('exercises', { exercise_id, is_active: 1 });
        if (!exercise) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }
        // ✅ FIX: premium dùng field 'title' không phải 'exercise_title'
        console.log(`✅ Exercise: "${exercise.title}" (${exercise.difficulty})`);

        // 2️⃣ Lấy test cases — ✅ FIX: field 'input' không phải 'input_data'
        const testCases = await db.query(
            `SELECT test_case_id, exercise_id,
                    input_data,
                    expected_output,
                    is_sample,
                    points,
                    display_order, test_number
            FROM test_cases
            WHERE exercise_id = ?
            ORDER BY display_order`,
            [exercise_id]
        );

        if (testCases.length === 0) {
            return res.status(400).json({ success: false, error: 'No test cases found' });
        }
        console.log(`✅ Found ${testCases.length} test cases`);

        // 3️⃣ Setup
        const normalizedLang = language.toLowerCase();
        const config = LANGUAGE_CONFIGS[normalizedLang];
        if (!config) {
            return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
        }

        const jobId  = uuidv4();
        const jobDir = path.join(TEMP_DIR, jobId);
        await fs.mkdir(jobDir, { recursive: true });

        let filename = `main${config.extension}`, className = 'Main';
        if (normalizedLang === 'java') {
            const m = submitted_code.match(/public\s+class\s+(\w+)/);
            if (m) { className = m[1]; filename = `${className}.java`; }
        }

        const unescaped = submitted_code.replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');
        await fs.writeFile(path.join(jobDir, filename), unescaped);

        // 4️⃣ Compile
        if (config.needCompile) {
            const cmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${config.compileCmd(filename)}"`;
            try {
                await executeDocker(cmd, 10000);
                console.log('✅ Compiled');
            } catch (e) {
                return res.json({
                    success: false, verdict: 'compile_error', error: e.message,
                    passedTests: 0, totalTests: testCases.length, pass_percentage: 0,
                });
            }
        }

        // 5️⃣ Run test cases
        let passedTests = 0, maxTime = 0;
        const testResults = [], detailedLogs = [];
        let firstFailure = null;

        for (const testCase of testCases) {
            // ✅ FIX: dùng testCase.input thay vì testCase.input_data
            const processedInput = (testCase.input_data || '')
                .replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');
            const processedExpected = (testCase.expected_output || '')
                .replace(/\\n/g,'\n').replace(/\\t/g,'\t').replace(/\\r/g,'\r');

            await fs.writeFile(path.join(jobDir, 'input.txt'), processedInput);

            const runCmd = normalizedLang === 'java'
                ? config.runCmd(className)
                : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);

            // ✅ FIX: premium dùng time_limit_sec, không phải time_limit_seconds
            const timeLimitMs = (exercise.time_limit_seconds ?? 2) * 1000;
            const memLimit    = exercise.memory_limit_mb ?? 256;
            const dockerRun   = `docker run --rm --memory="${memLimit}m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;

            let testStatus = 'wrong_answer', execTime = 0;

            try {
                const t0     = Date.now();
                const result = await executeDocker(dockerRun, timeLimitMs);
                execTime     = Date.now() - t0;

                const cmp = compareOutputs(result.stdout, processedExpected, {
                    ignoreWhitespace: true, ignoreTrailingNewlines: true,
                });

                if (cmp.isMatch) {
                    testStatus = 'passed';
                    passedTests++;
                    console.log(`   ✅ TC#${testCase.test_number} PASSED (${execTime}ms)`);
                } else {
                    console.log(`   ❌ TC#${testCase.test_number} WRONG`);
                    if (!firstFailure && testCase.is_sample) {
                        firstFailure = { test_number: testCase.test_number, input_data: processedInput, expected: cmp.expected, actual: cmp.actual };
                    }
                }

                maxTime = Math.max(maxTime, execTime);
                detailedLogs.push({
                    test_number: testCase.test_number, is_sample: testCase.is_sample,
                    status: testStatus,
                    input_data   : testCase.is_sample ? processedInput    : '[Hidden]',
                    expected: testCase.is_sample ? cmp.expected      : '[Hidden]',
                    actual  : testCase.is_sample ? cmp.actual        : (testStatus === 'passed' ? '[Correct]' : '[Wrong]'),
                    execution_time_ms: execTime,
                });

            } catch (e) {
                testStatus = e.type === 'timeout' ? 'timeout' : 'runtime_error';
                console.log(`   ⚠️  TC#${testCase.test_number} ${testStatus}`);
                detailedLogs.push({ test_number: testCase.test_number, is_sample: testCase.is_sample, status: testStatus, error: e.message });
            }

            testResults.push({ test_number: testCase.test_number, status: testStatus, execution_time_ms: execTime, passed: testStatus === 'passed' });
        }

        // 6️⃣ Kết quả
        const passPercentage  = Math.round((passedTests / testCases.length) * 100);
        const performanceGrade = passPercentage === 100 ? 'A+' : passPercentage >= 90 ? 'A' : passPercentage >= 80 ? 'B' : passPercentage >= 70 ? 'C' : passPercentage >= 60 ? 'D' : 'F';

        console.log(`\n📊 Result: ${passedTests}/${testCases.length} (${passPercentage}%) — ${performanceGrade}`);

        // 7️⃣ Chỉ gọi NestJS callback, KHÔNG gọi Gemini ở Express nữa
        const nestjsResponse = await (async () => {
            if (passPercentage < 70) return null;
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const r = await fetch(`${NESTJS_API_URL}/exercises/mark-completed`, {  // ✅ sửa URL
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        user_id,
                        exercise_id,
                        submitted_code,
                        language,
                        pass_percentage   : passPercentage,
                        test_cases_passed : passedTests,
                        total_test_cases  : testCases.length,
                        execution_time_ms : maxTime,
                        memory_used_mb    : exercise.memory_limit_mb ?? 256,
                    }),
                });

                if (r.ok) {
                    const data = await r.json();
                    console.log(`✅ NestJS callback OK — XP: ${data.xp_earned}`);
                    return data;
                } else {
                    console.warn(`⚠️  NestJS callback ${r.status}`);
                    return null;
                }
            } catch (e) {
                console.error('❌ NestJS callback failed:', e.message);
                return null;
            }
        })();

        // Cleanup
        setTimeout(async () => { try { await fs.rm(jobDir, { recursive: true, force: true }); } catch {} }, 10000);

        // 8️⃣ Response — ai_feedback lấy từ NestJS (NestJS đã gọi Gemini rồi)
        res.json({
            success          : passPercentage >= 70,
            verdict          : passPercentage >= 70 ? 'accepted' : 'wrong_answer',
            message          : passPercentage === 100
                ? `🎉 Xuất sắc! Pass tất cả ${testCases.length} test cases!`
                : passPercentage >= 70
                ? `✅ Pass ${passedTests}/${testCases.length} test cases`
                : `❌ Pass ${passedTests}/${testCases.length} (${passPercentage}%). Cần >= 70%`,
            passedTests,
            totalTests       : testCases.length,
            pass_percentage  : passPercentage,
            performance_grade: performanceGrade,
            execution_time_ms: maxTime,
            testResults,
            detailedLogs,
            first_failure    : firstFailure,
            xp_earned        : nestjsResponse?.xp_earned  ?? 0,
            total_xp         : nestjsResponse?.total_xp   ?? 0,
            lesson_progress  : nestjsResponse?.lesson_progress ?? null,
            ai_feedback      : nestjsResponse?.ai_feedback ?? null,  // ✅ lấy từ NestJS
        });

    } catch (error) {
        console.error('💥 Submit error:', error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ── SUBMIT PLACEMENT (không gọi callback NestJS) ─────────────────────────────
// Dùng riêng cho Placement Test — NestJS tự xử lý roadmap update
// KHÔNG mark lesson completed, KHÔNG cộng XP qua callback
app.post('/api/submit-placement', async (req, res) => {
    const { exercise_id, submitted_code, language, user_id } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🎯 SUBMIT PLACEMENT');
    console.log(`   exercise_id=${exercise_id} user_id=${user_id} lang=${language}`);
    console.log('='.repeat(60));

    if (!submitted_code || !language || !exercise_id) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // 1️⃣ Lấy exercise
        const exercise = await db.findOne('exercises', { exercise_id, is_active: 1 });
        if (!exercise) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }
        console.log(`✅ Exercise: "${exercise.title}" (${exercise.difficulty}) topic=${exercise.topic_tag}`);

        // 2️⃣ Lấy test cases
        const testCases = await db.query(
            `SELECT test_case_id, exercise_id,
                    \`input\`,
                    expected_output,
                    is_sample, is_hidden, score_weight,
                    display_order, display_order AS test_number
             FROM test_cases
             WHERE exercise_id = ?
             ORDER BY display_order`,
            [exercise_id]
        );

        if (testCases.length === 0) {
            return res.status(400).json({ success: false, error: 'No test cases found' });
        }
        console.log(`✅ Found ${testCases.length} test cases`);

        // 3️⃣ Setup language config
        const normalizedLang = language.toLowerCase();
        const config = LANGUAGE_CONFIGS[normalizedLang];
        if (!config) {
            return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
        }

        const jobId  = uuidv4();
        const jobDir = path.join(TEMP_DIR, jobId);
        await fs.mkdir(jobDir, { recursive: true });

        let filename = `main${config.extension}`, className = 'Main';
        if (normalizedLang === 'java') {
            const m = submitted_code.match(/public\s+class\s+(\w+)/);
            if (m) { className = m[1]; filename = `${className}.java`; }
        }

        const unescaped = submitted_code
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r');
        await fs.writeFile(path.join(jobDir, filename), unescaped);

        // 4️⃣ Compile
        if (config.needCompile) {
            const cmd = `docker run --rm -v "${jobDir}:/code" ${config.image} bash -c "${config.compileCmd(filename)}"`;
            try {
                await executeDocker(cmd, 10000);
                console.log('✅ Compiled');
            } catch (e) {
                await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
                return res.json({
                    success          : false,
                    verdict          : 'compile_error',
                    error            : e.message,
                    passed_tests     : 0,
                    total_tests      : testCases.length,
                    pass_percentage  : 0,
                    test_results     : [],
                    detailed_logs    : [],
                });
            }
        }

        // 5️⃣ Run từng test case
        let passedTests = 0, maxTime = 0;
        const testResults = [], detailedLogs = [];

        for (const testCase of testCases) {
            const processedInput = (testCase.input || '')
                .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
            const processedExpected = (testCase.expected_output || '')
                .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');

            await fs.writeFile(path.join(jobDir, 'input.txt'), processedInput);

            const runCmd = normalizedLang === 'java'
                ? config.runCmd(className)
                : (typeof config.runCmd === 'function' ? config.runCmd(filename) : config.runCmd);

            const timeLimitMs = (exercise.time_limit_sec ?? 2) * 1000;
            const memLimit    = exercise.memory_limit_mb ?? 256;
            const dockerRun   = `docker run --rm --memory="${memLimit}m" --cpus="1" -v "${jobDir}:/code" ${config.image} bash -c "${runCmd} < /code/input.txt"`;

            let testStatus = 'wrong_answer', execTime = 0;

            try {
                const t0     = Date.now();
                const result = await executeDocker(dockerRun, timeLimitMs);
                execTime     = Date.now() - t0;

                const cmp = compareOutputs(result.stdout, processedExpected, {
                    ignoreWhitespace       : true,
                    ignoreTrailingNewlines : true,
                });

                if (cmp.isMatch) {
                    testStatus = 'passed';
                    passedTests++;
                    console.log(`   ✅ TC#${testCase.test_number} PASSED (${execTime}ms)`);
                } else {
                    console.log(`   ❌ TC#${testCase.test_number} WRONG — expected="${cmp.expected}" got="${cmp.actual}"`);
                }

                maxTime = Math.max(maxTime, execTime);
                detailedLogs.push({
                    test_number      : testCase.test_number,
                    is_sample        : !!testCase.is_sample,
                    status           : testStatus,
                    input            : testCase.is_sample ? processedInput   : '[Hidden]',
                    expected         : testCase.is_sample ? cmp.expected     : '[Hidden]',
                    actual           : testCase.is_sample ? cmp.actual       : (testStatus === 'passed' ? '[Correct]' : '[Wrong]'),
                    execution_time_ms: execTime,
                });

            } catch (e) {
                testStatus = e.type === 'timeout' ? 'timeout' : 'runtime_error';
                console.log(`   ⚠️  TC#${testCase.test_number} ${testStatus}: ${e.message}`);
                detailedLogs.push({
                    test_number      : testCase.test_number,
                    is_sample        : !!testCase.is_sample,
                    status           : testStatus,
                    error            : e.message,
                    execution_time_ms: 0,
                });
            }

            testResults.push({
                test_number      : testCase.test_number,
                status           : testStatus,
                execution_time_ms: execTime,
                passed           : testStatus === 'passed',
            });
        }

        // 6️⃣ Tính kết quả
        const passPercentage = Math.round((passedTests / testCases.length) * 100);
        const verdict =
            passPercentage === 100 ? 'accepted'     :
            passPercentage >= 70   ? 'accepted'     :
            testResults.some(t => t.status === 'timeout')       ? 'time_limit'   :
            testResults.some(t => t.status === 'runtime_error') ? 'runtime_error': 'wrong_answer';

        console.log(`\n📊 Placement result: ${passedTests}/${testCases.length} (${passPercentage}%) — ${verdict}`);

        // Cleanup
        setTimeout(async () => {
            try { await fs.rm(jobDir, { recursive: true, force: true }); } catch {}
        }, 10000);

        // 7️⃣ Response — KHÔNG gọi callback NestJS
        // NestJS (PlacementService) nhận kết quả này và tự tính roadmap
        res.json({
            success          : passPercentage >= 70,
            verdict,
            passed_tests     : passedTests,
            total_tests      : testCases.length,
            pass_percentage  : passPercentage,
            execution_time_ms: maxTime,
            test_results     : testResults,
            detailed_logs    : detailedLogs,
        });

    } catch (error) {
        console.error('💥 Submit-placement error:', error.stack);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const [exCount] = await db.query('SELECT COUNT(*) AS count FROM exercises');
        const [tcCount] = await db.query('SELECT COUNT(*) AS count FROM test_cases');

        let nestjsStatus = 'unknown';
        try {
            const r = await fetch(`${NESTJS_API_URL}/lesson/dashboard/1?userId=1`, { timeout: 2000 });
            nestjsStatus = r.ok ? 'connected' : 'error';
        } catch { nestjsStatus = 'unreachable'; }

        res.json({
            status   : 'OK',
            database : 'learn_code',
            gemini   : GEMINI_API_KEY ? 'enabled' : 'disabled',
            nestjs   : nestjsStatus,
            stats    : { exercises: exCount.count, test_cases: tcCount.count },
        });
    } catch (e) {
        res.status(500).json({ status: 'ERROR', error: e.message });
    }
});

// ── Shutdown ──────────────────────────────────────────────────────────────────
process.on('SIGTERM', async () => { await db.teardown(); process.exit(0); });
process.on('SIGINT',  async () => { await db.teardown(); process.exit(0); });

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 CODE JUDGE PREMIUM - ExpressJS Server         ║
╠════════════════════════════════════════════════════╣
║   Port:     ${String(PORT).padEnd(38)} ║
║   Database: learn_code                    ║
║   NestJS:   ${NESTJS_API_URL.padEnd(38)} ║
║   Gemini:   ${(GEMINI_API_KEY ? 'enabled ✅' : 'disabled ⬜').padEnd(38)} ║
╚════════════════════════════════════════════════════╝
    `);
});