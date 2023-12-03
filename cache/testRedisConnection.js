const { client } = require('./redisCache');

async function testRedisConnection() {
  try {
    // const resolvedClient = await redisCachePromise;
    console.log('resolvedClient.sampleStore', client.cache);

    const key = 'someKey';
    const valueToSet = 'someValue';

    // Set a value for the key 'someKey'
    const setResult = await client.cache.set(key, valueToSet);

    if (setResult === 'OK') {
      console.log(`Value successfully set for key ${key}`);
    } else {
      console.log(`Failed to set value for key ${key}`);
    }

    // Get the value for the key 'someKey'
    const retrievedValue = await client.cache.get(key);

    if (retrievedValue !== undefined) {
      console.log(`Retrieved value for key ${key}:`, retrievedValue);
    } else {
      console.log(`No value found for key ${key}`);
    }
    // You can access individual clients like client.cache, client.clock, etc.
  } catch (error) {
    console.error('Error testing Redis connection:', error);
  } finally {
    console.log('Finally block executed');
    process.exit(1);
  }
}

testRedisConnection();
console.log('After testRedisConnection');
