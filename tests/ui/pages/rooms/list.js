/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/ui/pages/rooms/list.js
 */
const expect = require('chai').expect;

const utils = require('../../utils/utils.js');
const tu = require('../../../testUtils.js');
const setup = require('../../setup.js');
const ru = require('../../../db/model/room/utils.js');
const rtu = require('../../../db/model/roomType/utils.js');
const pom = require('../../utils/pageObjectModels/rooms');

const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const { baseUrl } = utils;

describe('tests/ui/pages/rooms/list.js >', function() {
  let browser, page;

  // Setting up browser, creating roomType, creating room
  before((done) => {
    setup.puppeteer()
    .then((b) => {
      browser = b;
      return utils.loginInBrowser(browser);
    })
    .then((p) => {
      page = p;
      return RoomType.create(rtu.getStandard());
    })
    .then((roomType) => {
      const room = ru.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then(() => {
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteUser);
  after(ru.forceDelete);

  after(() => {
    browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(baseUrl + '/rooms');
  });

  it('ok, rooms list page renders', async function () {
    expect(page.url()).to.equal(`${baseUrl}/rooms`);
    // Wait for the DOM to render subtitle
    await page.waitFor((args) => {
      return document.querySelector(`#${args}`).innerText.length;
    }, {}, pom.subTitleId);

    expect(await page.$eval(pom.subTitle,
      label => label.innerText)).to.contain('Number of rooms: 1');
  });
});
