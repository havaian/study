const { createClient } = require('redis');

// Initialize Redis client
const redisClient = createClient({
    url: process.env.REDIS_URI
});

// Connect to Redis
const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('✅ Connected to Redis');
    } catch (error) {
        console.error('❌ Redis connection error:', error);
        // Retry connection after 5 seconds
        setTimeout(connectRedis, 5000);
    }
};

// Handle Redis errors
redisClient.on('error', (error) => {
    console.error('❌ Redis error:', error);
});

// Handle Redis reconnections
redisClient.on('reconnecting', () => {
    console.log('❌ Redis reconnecting...');
});

// Handle Redis ready
redisClient.on('ready', () => {
    console.log('✅ Redis client ready');
});

// Connect to Redis on startup
connectRedis();

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await redisClient.quit();
        console.log('❌ Redis client disconnected');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing Redis connection:', error);
        process.exit(1);
    }
});

module.exports = {
    redisClient
};