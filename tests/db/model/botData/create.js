/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botData/create.js
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
const ZERO = 0;
const ONE = 1;

describe('tests/db/model/botData/create.js >', () => {
  afterEach(u.forceDelete);

  it('ok, bot data created', (done) => {
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
    .then((o) => {
      expect(o).to.have.property('name');
      done();
    })
    .catch(done);
  });

  it('ok, bot data with large value created', (done) => {
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
      testBotData.value =
        'yeDqFOAvhPjCBpZ67YdoNZZRRQFFQjbsf0yNVtxjKHe7C25FYX' +
        'e6DAyMVA7Y2RQ5Q6vJrYrufPLcQKy7ZYWycI01IZa4bv23Abxf' +
        'MlXkFmAOx51wV7Hg3yVeNYVMkoTLxPu8bmlCUnSLvVxD9a7j5g' +
        '60EZwhh3m3MlqXnXq5qPdhGfysaKjAKpA3EnRQAxmFI3vd0GbM' +
        'aHLPF33ZcYpsDz35tixhDc3tAm4AHh4Wu3LjTQlgWV9vuFUAmE' +
        'UHIFfrkE3LmadNGzPgzebGPQvsgMshHqnecaRp42OR6LYivS3Q';
      return BotData.create(testBotData);
    })
    .then((o) => {
      expect(o).to.have.property('name');
      done();
    })
    .catch(done);
  });

  it('ok, bot data created with name', (done) => {
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
      testBotData.botId = bot.name;
      return BotData.create(testBotData);
    })
    .then((o) => {
      expect(o).to.have.property('name');
      done();
    })
    .catch(done);
  });

  it('ok, bot data created room different', (done) => {
    const testBotData = u.getStandard();
    const testBotData2 = u.getStandard();
    const room2 = r.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      room2.type = room.type;
      room2.name = 'Room2';
      testBotData.roomId = room.id;
      return Room.create(room2);
    })
    .then((room) => {
      testBotData2.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotData.botId = bot.id;
      return BotData.create(testBotData);
    })
    .then((botData) => {
      testBotData2.botId = botData.botId;
      return BotData.create(testBotData2);
    })
    .then(() => BotData.findAll())
    .then((o) => {
      expect(o[ZERO].name).to.equal(o[ONE].name);
      expect(o[ZERO].botId).to.equal(o[ONE].botId);
      expect(o[ZERO].roomId).to.not.equal(o[ONE].roomId);
      done();
    })
    .catch(done);
  });

  it('ok, bot data created bot different', (done) => {
    const testBotData = u.getStandard();
    const testBotData2 = u.getStandard();
    const bot2 = b.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotData.roomId = room.id;
      testBotData2.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotData.botId = bot.id;
      bot2.name = 'NewBot';
      return Bot.create(bot2);
    })
    .then((bot) => {
      testBotData2.botId = bot.id;
      return BotData.create(testBotData);
    })
    .then(() => BotData.create(testBotData2))
    .then(() => BotData.findAll())
    .then((o) => {
      expect(o[ZERO].name).to.equal(o[ONE].name);
      expect(o[ZERO].botId).to.not.equal(o[ONE].botId);
      expect(o[ZERO].roomId).to.equal(o[ONE].roomId);
      done();
    })
    .catch(done);
  });

  it('fail, bot data already been created', (done) => {
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
    .then(() => BotData.create(testBotData))
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.message).to.contain('is in use');
      done();
    })
  .catch(done);
  });
});
