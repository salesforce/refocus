var Kafka = require('no-kafka');

console.log('KAFKA entered realtime/kafka.js');

const producer = new Kafka.Producer({
  connectionString: process.env.KAFKA_URL,
  ssl: {
    cert: process.env.KAFKA_CLIENT_CERT || '.ssl/client.crt',
    key: process.env.KAFKA_CLIENT_CERT_KEY || '.ssl/client.key'
  }
});

console.log('KAFKA PRODUCER', producer);

return producer.init().then(function (initResponse) {
  console.log('KAFKA AFTER INIT', initResponse);
  return producer.send({
    topic: 'perspectives',
    partition: 0,
    message: {
      key: 'a.b.c|def',
      value: 'Hello!'
    }
  });
})
  .then(function (sendResponse) {
    console.log('KAFKA AFTER SEND', sendResponse);
  });

// const Kafka = require('node-rdkafka');
//
// const producer = new Kafka.Producer({
//   'debug' : 'all',
//   'metadata.broker.list': process.env.KAFKA_URL,
//   'dr_cb': true , // delivery report callback
// });
//
// const topicName = 'perspectives';
//
// // Wait for the ready event before proceeding
// producer.on('ready', (arg) => {
//   console.log('KAFKA producer is ready', JSON.stringify(arg));
//   try {
//     producer.produce(
//       topicName, // topic name
//       null, // partition
//       Buffer.from('Hello, World!'), // // Message to send. Must be a buffer
//       'key.a.b.c', // for keyed messages, we also specify the key
//       Date.now(), // timestamp
//       // you can send an opaque token here, which gets passed along
//       // to your delivery reports
//     );
//     console.log('KAFKA producer produced a message')
//   } catch (err) {
//     console.error('KAFKA A problem occurred when sending message');
//     console.error(err);
//   }
//
//   setInterval(producer.poll, 1000);
// });
//
// // Any errors we encounter, including connection errors
// producer.on('event.error', (err) => {
//   console.error('KAFKA Error from producer', JSON.stringify(err));
// });
//
// producer.on('disconnected', (arg) => {
//   console.log('KAFKA producer disconnected', JSON.stringify(arg));
// });
//
// producer.connect();
//
// module.exports = {
//   init: () => {
//
//   },
// }

