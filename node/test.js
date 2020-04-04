config = require('../config');
const { promisify } = require('util');
const redis = require('redis');
client = redis.createClient(config.redis.RDS_PORT, config.redis.RDS_HOST, config.redis.RDS_OPTS);
const lpushAsync = promisify(client.lpush).bind(client);
const rpopAsync = promisify(client.rpop).bind(client);
const delAsync = promisify(client.del).bind(client);

lpushAsync('EngineQueue', 'hehe')