const redisCachePromise = require('./redisCache');

(async () => {
  try {
    // Access the client object directly
    const redisCache = redisCachePromise;
    console.log('redisCache', redisCache.client.cache);
    const redisClient = redisCache.client.cache;

    const key = 'someKey';
    const valueToSet = 'someValue123';

    redisClient.set(key, valueToSet);

    const getValue = await redisClient.get('someKey');

    console.log('getValue ===>>>>>>>>>>>>>>>>>', getValue);

    const multiR = redisClient.multi();
    console.log('multiR before ==>>>>>>', multiR.command_queue);

    // Add commands to the multi object
    multiR.set('key1', 'value1');
    multiR.get('key1');
    multiR.set('key2', 'value2');
    multiR.get('key2');

    console.log('multiR after ==>>>>>>', multiR.command_queue);

    // Execute the multi commands
    const results = await multiR.exec((err, results) => {
      if (err) {
        console.error('Error executing multi commands:', err);
        return;
      }

      // Handle the results of the multi commands      
      // Each result corresponds to the result of a single command in the order they were added
    });

    console.log('Results:', results);
    process.exit(1);
    // ... (other usage)
  } catch (error) {
    console.error('Error using Redis client:', error);
  }
})();
