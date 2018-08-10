/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/ui/pages/rooms/room.js
 */
const expect = require('chai').expect;

const utils = require('../../utils/utils.js');
const tu = require('../../../testUtils.js');
const setup = require('../../utils/setup.js');
const ru = require('../../../db/model/room/utils.js');
const rtu = require('../../../db/model/roomType/utils.js');
const bu = require('../../../db/model/bot/utils.js');
const pom = require('../../utils/pageObjectModels/room');

const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const { baseUrl } = utils;

describe('tests/ui/pages/rooms/list.js >', function() {
  let browser, page;

  before((done) => {
    setup.puppeteer()
    .then((b) => {
      browser = b;
      return utils.loginInBrowser(browser);
    })
    .then((p) => {
      page = p;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteUser);

  after(() => {
    browser.close();
  });
  
  describe('Room with one bot', function() {
    let bot, room, roomType;
    // Setting up browser, creating bot, creating roomType, creating room
    before((done) => {
      Bot.create(bu.getStandard())
      .then((b) => {
        bot = b;
        const roomType = rtu.getStandard();
        roomType.bots = [bot.name]
        return RoomType.create(roomType);
      })
      .then((rt) => {
        roomType = rt;
        const r = ru.getStandard();
        r.type = roomType.id;
        return Room.create(r);
      })
      .then((r) => {
        room = r;
        done();
      })
      .catch(done);
    });

    after(ru.forceDelete);
    after(bu.forceDelete);

    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(baseUrl + `/rooms/${room.id}`);
    });

    it('ok, room renders', async function () {
      botSection = `${bot.name}-section`;
      expect(page.url()).to.equal(`${baseUrl}/rooms/${room.id}`);

      // Wait for the DOM to render the subtitle section
      await page.waitFor((args) => {
        return document.querySelector(`#${args}`).innerText.length;
      }, {}, pom.subTitleId);

      expect(await page.$eval(pom.subTitle,
        label => label.innerText)).to.contain(`${room.name} - ${roomType.name}`);

      // Wait for the DOM to render the bot section
      await page.waitFor((args) => {
        return document.querySelector(`#${args}`);
      }, {}, botSection);

      expect(await page.$eval(`div[id=${bot.name}-section]`,
        label => label.innerText)).to.contain(`Version ${bot.version}`);
    });
  });
});
