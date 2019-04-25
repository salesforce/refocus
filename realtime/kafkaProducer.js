const debug = require('debug')('k');
const KafkaProducer = require('no-kafka');

console.log('KAFKA entered realtime/kafkaProducer.js');

// FOR LOCALHOST...
// const producer = new KafkaProducer.Producer();

// FOR HEROKU...
const producer = new KafkaProducer.Producer({
  connectionString: process.env.KAFKA_URL,
  ssl: {
    cert: process.env.KAFKA_CLIENT_CERT || '.ssl/client.crt',
    key: process.env.KAFKA_CLIENT_CERT_KEY || '.ssl/client.key'
  },
});

producer.init();

module.exports = {
  send: (key, value) => producer.send({
    topic: 'perspectives',
    partition: 0,
    message: {
      key,
      value: JSON.stringify(value),
    },
  })
    // .then((res) => debug('kafkaProducer|Sent|%o', res)),
};
