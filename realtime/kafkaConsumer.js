const debug = require('debug')('k');
const Kafka = require('no-kafka');

const clientId = 'consumer-' + process.pid;

// FOR LOCALHOST...
// const consumer = new Kafka.SimpleConsumer({
//   idleTimeout: 10,
// });

// FOR HEROKU...
const consumer = new Kafka.SimpleConsumer({
  clientId,
  connectionString: process.env.KAFKA_URL.replace(/\+ssl/g,''),
  ssl: {
    cert: process.env.KAFKA_CLIENT_CERT || '.ssl/client.crt',
    key: process.env.KAFKA_CLIENT_CERT_KEY || '.ssl/client.key'
  },
  maxWaitTime: +process.env.KAFKA_CONSUMER_MAX_WAIT_TIME_MS || 100,
  maxBytes: +process.env.KAFKA_CONSUMER_MAX_BYTES || (1024 * 1024),
  idleTimeout: +process.env.KAFKA_CONSUMER_IDLE_TIMEOUT || 1000,
});

console.log(`Kafka consumer ${clientId} has been started`);

consumer.init();
debug('Kafka Consumer %s %o', clientId, consumer);

module.exports = {
  subscribe: (handler) => {
    consumer.subscribe('perspectives', handler);
  }
};
