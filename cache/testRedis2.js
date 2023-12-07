const redisCachePromise = require('./redisCache');

function testRedisConnection() {
  return redisCachePromise
    .then(redisCache => {

      const key = 'someKey';
      const valueToSet = 'someValue';

      console.log('redisCache', redisCache.client.cache);
      // Get the value for the key 'someKey'
      return redisCache.client.cache.get('someKey');
    })
    .then(retrievedValue => {
      if (retrievedValue !== undefined) {
        console.log(`Retrieved value for key someKey:`, retrievedValue);
      } else {
        console.log(`No value found for key someKey`);
      }

      // ... (other usage)
    })
    .catch(error => {
      console.error('Error testing Redis connection:', error);
    })
    .finally(() => {
      console.log('Finally block executed');
      process.exit(0); // Use process.exit(0) for success
    });
}

testRedisConnection();
console.log('After testRedisConnection');