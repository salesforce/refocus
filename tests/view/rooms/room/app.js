/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/rooms/room/app.js
 */

const expect = require('chai').expect;
const uPage = require('../../../../view/rooms/utils/page');
const app = require('../../../../view/rooms/app.js')();

const fs = require('fs');
const paths = require('path');
const botPackage = fs.readFileSync(paths.join(__dirname, './test.zip'));
const botPackage2 = fs.readFileSync(paths.join(__dirname, './test2.zip'));
const botPackage3 = null;
const testHTML = '<div>test</div>';

describe('tests/view/rooms/room/app.js, /rooms/{key} =>', () => {
  it('ok, parsed javascript and html', () => {
    const bot = {
      name: 'test-bot',
      ui: {
        data: botPackage,
      },
    };
    const parsedBot = app.parseBot(bot);
    expect(parsedBot.js.text).to.contain('function test()');
    expect(parsedBot.html.innerHTML).to.contain('<div id="Test-Bot"></div>');
    expect(parsedBot.html.innerHTML).not.contain('index_bundle');
  });

  it('ok, parsed javascript and html has other script', () => {
    const bot = {
      name: 'test-bot',
      ui: {
        data: botPackage2,
      },
    };
    const parsedBot = app.parseBot(bot);
    expect(parsedBot.js.text).to.contain('function test()');
    expect(parsedBot.html.innerHTML).to.contain('<div id="Test-Bot"></div>');
    expect(parsedBot.html.innerHTML).to.contain('other.js');
  });

  it('fail, bot doesnt contain UI', () => {
    const bot = {
      name: 'test-bot',
      ui: {
        data: botPackage3,
      },
    };
    const parsedBot = app.parseBot(bot);
    expect(parsedBot.js).to.equal(undefined);
    expect(parsedBot.html).to.equal(undefined);
  });

  it('ok, push data to iframe', () => {
    const bot = {
      name: 'test-bot',
      ui: {
        data: botPackage,
      },
    };
    const parsedBot = app.parseBot(bot);
    const newIframe = document.createElement('iframe');
    newIframe.id = 'iframe_id';
    document.body.appendChild(newIframe);
    app.iframeBot(newIframe, bot, parsedBot, { name: 'Test Name' });
    const output = document.getElementById('iframe_id')
      .contentWindow.document.body.innerHTML;
    expect(output).to.contain('function test()');
    expect(output).to.contain('<div id="Test-Bot"></div>');
    expect(output).not.contain('index_bundle');
    expect(output).to.contain('observe(document.getElementById("test-bot")');
  });

  it('ok, place content into iframe', () => {
    const newIframe = document.createElement('iframe');
    document.body.appendChild(newIframe);
    const iframedoc = newIframe.contentDocument;
    uPage.writeInIframedoc(iframedoc, testHTML);
    const content = newIframe.contentDocument.body.innerHTML;
    expect(content).to.contain(testHTML);
  });
});
