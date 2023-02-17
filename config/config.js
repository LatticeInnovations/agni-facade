require('dotenv').config()
let config = function () {
    switch (process.env.NODE_ENV) {
        case 'prod': return {
            port: '3001',
            timeout: 20000,
            version: process.env.version
        };
        case 'local': return {
            port: process.env.PORT,
            timeout: 20000,
            version: process.env.version
        };
        case 'dev': return {
            port: '3001',
            timeout: 20000,
            version: process.env.version
        };
        case 'test': return {
            port: '3001',
            timeout: 20000,
            version: process.env.version
        };
    }
};
module.exports = new config();