/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/event/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const r = require('../room/utils');
const rt = require('../roomType/utils');
const b = require('../bot/utils');
const ba = require('../botAction/utils');
const bd = require('../botData/utils');
const Event = tu.db.Event;
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotAction = tu.db.BotAction;
const BotData = tu.db.BotData;

describe('tests/db/model/event/create.js >', () => {
  afterEach(u.forceDelete);

  it('ok, event created for room and bot', (done) => {
    const testEvent = u.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testEvent.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testEvent.botId = bot.id;
      return Event.create(testEvent);
    })
    .then((o) => {
      expect(o).to.have.property('id');
      expect(o).to.have.property('botId');
      expect(o).to.have.property('roomId');
      done();
    })
    .catch(done);
  });

  it('ok, event created for bot action', (done) => {
    const testBotAction = ba.getStandard();
    const testEvent = u.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotAction.roomId = room.id;
      testEvent.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotAction.botId = bot.id;
      testEvent.botId = bot.id;
      return BotAction.create(testBotAction);
    })
    .then((botAction) => {
      testEvent.botActionId = botAction.id;
      return Event.create(testEvent);
    })
    .then((o) => {
      expect(o).to.have.property('id');
      expect(o).to.have.property('botId');
      expect(o).to.have.property('roomId');
      expect(o).to.have.property('botActionId');
      done();
    })
    .catch(done);
  });

  it('ok, event created for bot data', (done) => {
    const testBotData = bd.getStandard();
    const testEvent = u.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotData.roomId = room.id;
      testEvent.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotData.botId = bot.id;
      testEvent.botId = bot.id;
      return BotData.create(testBotData);
    })
    .then((botData) => {
      testEvent.botDataId = botData.id;
      return Event.create(testEvent);
    })
    .then((o) => {
      expect(o).to.have.property('id');
      expect(o).to.have.property('botId');
      expect(o).to.have.property('roomId');
      expect(o).to.have.property('botDataId');
      done();
    })
    .catch(done);
  });
});
