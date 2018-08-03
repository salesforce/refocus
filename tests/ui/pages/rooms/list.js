const expect = require('chai').expect;

const utils = require('../../utils.js');
const testUtils = require('../../../testUtils.js');
const setup = require('../../setup.js');

const { baseUrl } = setup;

let browser;

describe('sample test', function() {
  // These tests seem to take longer than mocha default 2000ms
  this.timeout(5000);
  let page;

  before((done) => {
    setup.puppeteer()
    .then((b) => {
      browser = b;
      utils.loginAndGoToUrl(browser, `${baseUrl}/rooms/`)
      .then((p) => {
        page = p;
        done()
        })
    });
  });

  after(testUtils.forceDeleteUser);

  after (() => {
    browser.close();
  });


  it('ok, room renders', async function () {
    expect(page.url()).to.equal(`${baseUrl}/rooms/`)
  });
});
