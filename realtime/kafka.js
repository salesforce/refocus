const Kafka = require('node-rdkafka');
//
// const producer = new Kafka.Producer({
//   'metadata.broker.list': 'localhost:9092',
//   'dr_cb': true
// });
//
// // Connect to the broker manually
// producer.connect();
//
//
// // Wait for the ready event before proceeding
// producer.on('ready', function() {
//   try {
//     producer.produce(
//       // Topic to send the message to
//       'topic',
//       // optionally we can manually specify a partition for the message
//       // this defaults to -1 - which will use librdkafka's default partitioner (consistent random for keyed messages, random for unkeyed messages)
//       null,
//       // Message to send. Must be a buffer
//       Buffer.from('Awesome message'),
//       // for keyed messages, we also specify the key - note that this field is optional
//       'Stormwind',
//       // you can send a timestamp here. If your broker version supports it,
//       // it will get added. Otherwise, we default to 0
//       Date.now(),
//       // you can send an opaque token here, which gets passed along
//       // to your delivery reports
//     );
//   } catch (err) {
//     console.error('A problem occurred when sending our message');
//     console.error(err);
//   }
// });
//
// // Any errors we encounter, including connection errors
// producer.on('event.error', function(err) {
//   console.error('Error from producer');
//   console.error(err);
// })
//
// module.exports = {
//   init: () => {
//
//   },
// }
//
