require('dotenv').config()
let config = function () {
    switch (process.env.NODE_ENV) {
        case 'prod': return {
            port: '3001',
            timeout: 20000,
            version: process.env.version,
            baseUrl: process.env.FHIRServerBaseURL
        };
        case 'local': return {
            port: process.env.PORT,
            timeout: 20000,
            version: process.env.version,
            baseUrl: process.env.FHIRServerBaseURL

        };
        case 'dev': return {
            port: process.env.PORT,
            timeout: 20000,
            version: process.env.version,
            baseUrl: process.env.FHIRServerBaseURL
        };
        case 'test': return {
            port: '3001',
            timeout: 20000,
            version: process.env.version,
            baseUrl: process.env.FHIRServerBaseURL
        };
    }
};
module.exports = new config();