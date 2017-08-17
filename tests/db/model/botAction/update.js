/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/update.js
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
const BotAction = tu.db.BotAction;
const v = require('../roomType/utils');

describe('tests/db/model/botAction/update.js >', () => {
  beforeEach((done) => {
    const testBotAction = u.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotAction.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotAction.botId = bot.id;
      return BotAction.create(testBotAction);
    })
    .then((o) => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, update bot action isPending', (done) => {
    BotAction.findOne({ where: { name: u.name } })
    .then((o) => o.update({ isPending: false }))
    .then((o) => {
      expect(o).to.have.property('isPending').to.equal(false);
      done();
    })
    .catch(done);
  });
});
