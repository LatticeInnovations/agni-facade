const redis = require("redis");

const client = redis.createClient();

// on the connection
client.on("connect", () => console.info("Connected to Redis"));

(async () => {
    await client.connect();
})();

module.exports = {
    client
}