/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/room/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotData = tu.db.botData;
const u = require('./utils');
const b = require('../bot/utils');
const v = require('../roomType/utils');
const bd = require('../botData/utils');
const invalidValue = '^thisValueisAlwaysInvalid#';

describe('tests/db/model/room/create.js >', () => {
  afterEach(u.forceDelete);
  after(b.forceDelete);

  it('ok, room created', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((o) => {
      expect(o).to.have.property('name');
      expect(o).to.have.property('externalId');
      expect(o).to.have.property('active').to.equal(true);
      done();
    })
    .catch(done);
  });

  it('ok, room created settings default', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((o) => {
      expect(o).to.have.property('settings');
      expect(o.settings.Key1).to.equal('Value1');
      done();
    })
    .catch(done);
  });

  it('ok, room created active false', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      room.active = false;
      return Room.create(room);
    })
    .then((o) => {
      expect(o).to.have.property('name');
      expect(o).to.have.property('externalId');
      expect(o).to.have.property('active').to.equal(false);
      done();
    })
    .catch(done);
  });

  it('ok, room created with bots', (done) => {
    let botName;
    Bot.create(b.getStandard())
    .then((bots) => {
      botName = bots.name;
      const rt = v.getStandard();
      rt.bots = [bots.name];
      return RoomType.create(rt);
    })
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      expect(room).to.have.property('bots');
      expect(room.bots[0]).to.equal(botName);
      done();
    })
    .catch(done);
  });

  it('ok, room created with bots and initial botData was created', (done) => {
    const botDataString = `I'm the best bot!`;
    let botName;
    Bot.create(b.getStandard())
    .then((bots) => {
      botName = bots.name;
      const rt = v.getStandard();
      rt.bots = [bots.name];
      return RoomType.create(rt);
    })
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      room.settings = {
        initialBotData: {
          [roomType.bots[0]]: {
            initialData: botDataString,
          },
        },
      };

      return Room.create(room);
    })
    .then((room) => BotData.findOne({ room: room.id }))
    .then((botData) => {
      expect(BotData.value).to.equal(botDataString);
      done();
    })
    .catch(done);
  });

  it('fail, room name invalid', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.name = invalidValue;
      room.type = roomType.id;
      return Room.create(room);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
    .catch(done);
  });

  it('fail, externalId invalid', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.externalId = invalidValue;
      room.type = roomType.id;
      return Room.create(room);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('validation error');
      done();
    })
    .catch(done);
  });

  it('fail, settings field sharedContext is invalid', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      room.settings = {
        sharedContext: 123,
      };

      return Room.create(room);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.source).to.equal('settings');
      expect(err.message.toLowerCase()).to.contain('sharedContext');
      expect(err.message.toLowerCase()).to.contain('must be an object');
      done();
    })
    .catch(done);
  });

  it('fail, settings field initialBotData is invalid', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      room.settings = {
        initialBotData: 'THIS IS A STRING',
      };

      return Room.create(room);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.source).to.equal('settings');
      expect(err.message.toLowerCase()).to.contain('initialBotData');
      expect(err.message.toLowerCase()).to.contain('must be an object');
      done();
    })
    .catch(done);
  });

  it('fail, room type null', (done) => {
    RoomType.create(v.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = null;
      return Room.create(room);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.message.toLowerCase()).to.contain('notnull violation');
      done();
    })
    .catch(done);
  });
});
