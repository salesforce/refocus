const redisCachePromise = require('./redisCache');

// (async () => {
//   try {
//     debugger
//     // Access the client object directly
//     const redisCache = await redisCachePromise;
//     console.log("\n\n\n test Redis Connnection redisCache.client.cache ==>>>>", redisCache.client.cache);
//     process.exit(1);
//     // ... (other usage)
//   } catch (error) {
//     console.error('Error using Redis client:', error);
//   }
// })();

redisCachePromise
  .then(redisCache => {
    console.log("cache ==>>>>", redisCache);
    // ... (other usage)
  })
  .catch(error => {
    console.error('Error using Redis client:', error);
  })
  .finally(() => {
    process.exit(1);
  });






  const redisCachePromise = require('./redisCache');

function testRedisConnection() {
  return redisCachePromise
    .then(redisCache => {

      const key = 'someKey';
      const valueToSet = 'someValue';

      console.log('redisCache', redisCache.isReady);
      // Set a value for the key 'someKey'
      return redisCache.client.cache.set(key, valueToSet);
    })
    .then(setResult => {
      if (setResult === 'OK') {
        console.log(`Value successfully set for key someKey`);
      } else {
        console.log(`Failed to set value for key someKey`);
      }

      // Get the value for the key 'someKey'
      return redisCachePromise.then(redisCache =>
        redisCache.client.cache.get('someKey')
      );
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









=============



const redisCachePromise = require('./redisCache');

function testRedisConnection() {
  return redisCachePromise
    .then(redisCache => {

      const redisClient = redisCache.client.sampleStore;

      const subjectKey = "samsto:subaspmap:usa";

      console.log('subjectKey', subjectKey);
      // console.log('redisClient', redisClient);
      // Set a value for the key 'someKey'
      return redisClient.get(subjectKey);
    })
    .then(aspectNames => {
      console.log("aspectNames ===>>>>>>>>>>>>", aspectNames);
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
