const Sequelize = require('sequelize');
const conf = require('../config'); // Adjust the path as needed
const env = conf.environment[conf.nodeEnv];

console.log('env.dbUrl', env.dbUrl);
// Create a Sequelize instance
const seq = new Sequelize(env.dbUrl, {
  logging: (msg) => console.log('Sequelize:', msg),
});

// console.log('seq', seq);
// Test the connection
async function testConnection() {
  try {
    const auth = await seq.authenticate();
    console.log('Sequelize connection has been established successfully.', auth);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    // Close the connection when testing is complete
    console.log('in finally\n\n');
    await seq.close();
  }
}

// Call the testConnection function
testConnection();

