const redisCachePromise = require('./redisCache');
const createCustomMultiProxy = require('./createCustomMultiProxy');

(async () => {
  try {
    // Access the client object directly
    const redisCache = redisCachePromise;
    const redisClient = redisCache.client.cache;

    console.log('redisClient $$$$ ===>>>>>>>>>>>>>>>>>', redisClient);

    const key = 'someKey';
    const valueToSet = 'someValue123';

    redisClient.set(key, valueToSet);

    const getValue = await redisClient.get('someKey');

    console.log('getValue ===>>>>>>>>>>>>>>>>>', getValue);

    const customMulti = createCustomMultiProxy(redisClient);

    // Add commands to the multi object

        // Queue Redis commands with callbacks
    customMulti.set('key1', 'value1')
    customMulti.get('key1')
    customMulti.set('key2', 'value2')
    customMulti.get('key2')
    

    console.log('customMulti', customMulti);


    console.log('here')

    customMulti.commands.forEach((cmd, i) => {
      // Modify the callback function for each command
      cmd.callback = ((err, res) => {
        console.log('cmd executed and result', cmd, res);
        return res + 'CALLBACK';
      });
    });
    // Execute the multi commands
    const results = await customMulti.exec();

    console.log('Results:', results);
  } catch (error) {
    console.error('Error using Redis client:', error);
  } finally {
    process.exit(1);
  }
})();
