const mysql = require("mysql2")

const pool = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "marco66090093",
}).promise()

pool.connect(function(error) {
    if (error) {
        console.log("Connect error")
    }
    else {
        console.log("Connection successful")
    }
});

module.exports = pool;

