/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botData/update.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const r = require('../room/utils');
const rt = require('../roomType/utils');
const b = require('../bot/utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotData = tu.db.BotData;
const v = require('../roomType/utils');

describe('tests/db/model/botData/update.js >', () => {
  beforeEach((done) => {
    const testBotData = u.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotData.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotData.botId = bot.id;
      return BotData.create(testBotData);
    })
    .then((o) => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, update bot data value', (done) => {
    BotData.findOne({ where: { name: u.name } })
    .then((o) => o.update({ value: 'NewValue' }))
    .then((o) => {
      expect(o).to.have.property('value').to.equal('NewValue');
      done();
    })
    .catch(done);
  });
});
