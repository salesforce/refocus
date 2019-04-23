const debug = require('debug')('k');
const Kafka = require('no-kafka');

const clientId = 'consumer-' + process.pid;

const consumer = new Kafka.SimpleConsumer({
  idleTimeout: 1000,
  clientId,
  connectionString: process.env.KAFKA_URL.replace(/\+ssl/g,''),
  ssl: {
    cert: process.env.KAFKA_CLIENT_CERT || '.ssl/client.crt',
    key: process.env.KAFKA_CLIENT_CERT_KEY || '.ssl/client.key'
  }
});

console.log(`Kafka consumer ${clientId} has been started`);

consumer.init();

module.exports = {
  subscribe: (handler) => {
    consumer.subscribe('perspectives', handler);
  }
};
