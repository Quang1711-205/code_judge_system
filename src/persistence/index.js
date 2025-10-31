// if (process.env.MYSQL_HOST) module.exports = require('./mysql');
// else module.exports = require('./sqlite');


const mysql = require('./mysql');

module.exports = {
    init: mysql.init,
    teardown: mysql.teardown,
    query: mysql.query,
    insert: mysql.insert,
    update: mysql.update,
    remove: mysql.remove,
    findOne: mysql.findOne,
    findMany: mysql.findMany
};