const Kafka = require('node-rdkafka');

const producer = new Kafka.Producer({
  'debug' : 'all',
  'metadata.broker.list': process.env.KAFKA_URL,
});

const topicName = 'perspectives';

producer.connect();

// Wait for the ready event before proceeding
producer.on('ready', () => {
  try {
    producer.produce(
      topicName, // topic name
      null, // partition
      Buffer.from('Hello, World!'), // // Message to send. Must be a buffer
      'key.a.b.c', // for keyed messages, we also specify the key
      Date.now(), // timestamp
      // you can send an opaque token here, which gets passed along
      // to your delivery reports
    );
  } catch (err) {
    console.error('A problem occurred when sending our message');
    console.error(err);
  }
});

// Any errors we encounter, including connection errors
producer.on('event.error', (err) => {
  console.error('Error from producer');
  console.error(err);
});

module.exports = {
  init: () => {

  },
}
