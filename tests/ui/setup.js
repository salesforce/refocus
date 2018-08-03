const puppeteer = require('puppeteer');
const sinon = require('sinon');

//const authenticate = require('../../api/v1/controllers/authenticate');
//const authStub = sinon.stub(authenticate, 'authenticateUser')
//authStub.returns('aaa');
//authStub.callsArg(2);
//console.log(authenticate.authenticateUser())

const app = require('./../../index.js').app;

const opts = {
  //headless: false,
  //slowMo: 10,
  //timeout: 10000,
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