// const waitPort = require('wait-port');
// const fs = require('fs');
// const mysql = require('mysql2');

// const {
//     MYSQL_HOST: HOST,
//     MYSQL_HOST_FILE: HOST_FILE,
//     MYSQL_USER: USER,
//     MYSQL_USER_FILE: USER_FILE,
//     MYSQL_PASSWORD: PASSWORD,
//     MYSQL_PASSWORD_FILE: PASSWORD_FILE,
//     MYSQL_DB: DB,
//     MYSQL_DB_FILE: DB_FILE,
// } = process.env;

// let pool;

// async function init() {
//     const host = HOST_FILE ? fs.readFileSync(HOST_FILE) : HOST;
//     const user = USER_FILE ? fs.readFileSync(USER_FILE) : USER;
//     const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE) : PASSWORD;
//     const database = DB_FILE ? fs.readFileSync(DB_FILE) : DB;

//     await waitPort({ 
//         host, 
//         port: 3306,
//         timeout: 10000,
//         waitForDns: true,
//     });

//     pool = mysql.createPool({
//         connectionLimit: 5,
//         host,
//         user,
//         password,
//         database,
//         charset: 'utf8mb4',
//     });

//     return new Promise((acc, rej) => {
//         pool.query(
//             'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean) DEFAULT CHARSET utf8mb4',
//             err => {
//                 if (err) return rej(err);

//                 console.log(`Connected to mysql db at host ${HOST}`);
//                 acc();
//             },
//         );
//     });
// }

// async function teardown() {
//     return new Promise((acc, rej) => {
//         pool.end(err => {
//             if (err) rej(err);
//             else acc();
//         });
//     });
// }

// async function getItems() {
//     return new Promise((acc, rej) => {
//         pool.query('SELECT * FROM todo_items', (err, rows) => {
//             if (err) return rej(err);
//             acc(
//                 rows.map(item =>
//                     Object.assign({}, item, {
//                         completed: item.completed === 1,
//                     }),
//                 ),
//             );
//         });
//     });
// }

// async function getItem(id) {
//     return new Promise((acc, rej) => {
//         pool.query('SELECT * FROM todo_items WHERE id=?', [id], (err, rows) => {
//             if (err) return rej(err);
//             acc(
//                 rows.map(item =>
//                     Object.assign({}, item, {
//                         completed: item.completed === 1,
//                     }),
//                 )[0],
//             );
//         });
//     });
// }

// async function storeItem(item) {
//     return new Promise((acc, rej) => {
//         pool.query(
//             'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
//             [item.id, item.name, item.completed ? 1 : 0],
//             err => {
//                 if (err) return rej(err);
//                 acc();
//             },
//         );
//     });
// }

// async function updateItem(id, item) {
//     return new Promise((acc, rej) => {
//         pool.query(
//             'UPDATE todo_items SET name=?, completed=? WHERE id=?',
//             [item.name, item.completed ? 1 : 0, id],
//             err => {
//                 if (err) return rej(err);
//                 acc();
//             },
//         );
//     });
// }

// async function removeItem(id) {
//     return new Promise((acc, rej) => {
//         pool.query('DELETE FROM todo_items WHERE id = ?', [id], err => {
//             if (err) return rej(err);
//             acc();
//         });
//     });
// }

// module.exports = {
//     init,
//     teardown,
//     getItems,
//     getItem,
//     storeItem,
//     updateItem,
//     removeItem,
// };


const mysql = require('mysql2/promise');

let pool;

async function init() {
    pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '123456',
        database: process.env.MYSQL_DB || 'learn_code',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });

    // Test connection
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL connected successfully!');
        connection.release();
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        throw error;
    }
}

async function teardown() {
    if (pool) {
        await pool.end();
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
}

async function insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
    
    const [result] = await pool.execute(sql, values);
    return result.insertId;
}

async function update(table, data, where) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(',');
    
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const [result] = await pool.execute(sql, [...values, ...whereValues]);
    return result.affectedRows;
}

async function remove(table, where) {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
    
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const [result] = await pool.execute(sql, whereValues);
    return result.affectedRows;
}

async function findOne(table, where) {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
    
    const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
    const [rows] = await pool.execute(sql, whereValues);
    return rows[0] || null;
}

async function findMany(table, where = {}, options = {}) {
    let sql = `SELECT * FROM ${table}`;
    let values = [];
    
    if (Object.keys(where).length > 0) {
        const whereKeys = Object.keys(where);
        const whereValues = Object.values(where);
        const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values = whereValues;
    }
    
    if (options.orderBy) {
        sql += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
    }
    
    const [rows] = await pool.execute(sql, values);
    return rows;
}

module.exports = {
    init,
    teardown,
    query,
    insert,
    update,
    remove,
    findOne,
    findMany
};