import { createClient } from 'redis';
import { config } from './index';

const redisClient = createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
});

redisClient.on('error', (err) => console.log('Redis Client Error:', err.message));
redisClient.on('connect', () => console.log('Redis connected successfully'));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis Connection has been established successfully.');
  } catch (error) {
    console.warn('Redis connection failed. Running without Redis cache.');
    console.warn('Some features like order status caching may be limited.');
  }
};

export default redisClient;
