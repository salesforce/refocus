var Kafka = require('no-kafka');

console.log('KAFKA entered realtime/kafka.js');

const producer = new Kafka.Producer({
  connectionString: process.env.KAFKA_URL,
  ssl: {
    cert: process.env.KAFKA_CLIENT_CERT || '.ssl/client.crt',
    key: process.env.KAFKA_CLIENT_CERT_KEY || '.ssl/client.key'
  }
});

module.exports = {
  init: () => {
    return producer.init()
      .then(() => console.log("KAFKA INIT"));
  },
  producer,
};
