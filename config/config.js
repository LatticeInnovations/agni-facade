require('dotenv').config(); // this is important!
module.exports = {
    "local": {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "dialect": process.env.DB_DIALECT,
        "logging": false,
        pool: {
            max: 100,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },
    "dev": {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "dialect": process.env.DB_DIALECT,
        "logging": false,
        pool: {
            max: 100,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },
    "test": {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "dialect": process.env.DB_DIALECT,
        "logging": false,
        pool: {
            max: 100,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },
    "prod": {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_NAME,
        "host": process.env.DB_HOST,
        "dialect": process.env.DB_DIALECT,
        "logging": false,
        "port" : process.env.DB_PORT,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 100,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
}; 