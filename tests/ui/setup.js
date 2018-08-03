const puppeteer = require('puppeteer');

const app = require('./../../index.js').app;

/*
 * If you would like to see the UI tests happening in the broweser,
 * add the following fields: headless: false, slowMo: 10
 */
const opts = {
  // 'args' option is needed for this to work in travis
  args:['--no-sandbox', '--disable-setuid-sandbox']
};

module.exports = {
  baseUrl: 'http://localhost:3000',
  puppeteer() {
    // Promise which returns a browser object
    return puppeteer.launch(opts);
  },
}
