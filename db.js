const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'zhu1999520',
    database: 'world',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

function query(sql, values) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
                return;
            }
            connection.query(sql, values, (error, results, fields) => {
                connection.release();
                if (error) {
                    reject(error);
                    return;
                }
                resolve(results);
            });
        });
    });
}

module.exports = { query };