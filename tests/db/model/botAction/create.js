/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/create.js
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
const ZERO = 0;
const ONE = 1;

describe('db/model/botAction/create.js >', () => {
  afterEach(u.forceDelete);

  it('ok, bot action created', (done) => {
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
    .then((o) => {
      expect(o).to.have.property('name');
      done();
    })
    .catch(done);
  });

  it('fail, bot action name not found', (done) => {
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
      testBotAction.name = 'actionNotFound';
      return BotAction.create(testBotAction);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.message).to.equal('Action was not found');
      done();
    });
  });

  it('ok, bot action created by botName', (done) => {
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
      testBotAction.botId = bot.name;
      return BotAction.create(testBotAction);
    })
    .then((o) => {
      expect(o).to.have.property('name');
      done();
    })
    .catch(done);
  });

  it('ok, bot action response created', (done) => {
    const testBotAction = u.getResponse();
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
    .then((o) => {
      expect(o).to.have.property('name');
      done();
    })
    .catch(done);
  });

  it('ok, multiple of the same bot action created', (done) => {
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
    .then((o) => {
      expect(o).to.have.property('name');
    })
    .then(() => BotAction.create(testBotAction))
    .then((o) => {
      expect(o).to.have.property('name');
      done();
    })
    .catch(done);
  });

  it('fail, bot action missing value', (done) => {
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
      testBotAction.parameters[ZERO] = { name: 'Fake1' };
      return BotAction.create(testBotAction);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      done();
    });
  });

  it('fail, bot action missing parameters', (done) => {
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
      testBotAction.parameters = [
        {
          name: 'Param1',
          value: true,
        },
        {
          name: 'Param2',
          value: 4,
        },
        {
          name: 'Param3',
          value: 62.2,
        },
      ];
      return BotAction.create(testBotAction);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.message).to.equal(
        'Wrong number of parameters sent to run this action'
      );
      done();
    });
  });

  it('ok, bot action no parameters', (done) => {
    const testBotAction = {
      isPending: true,
      name: 'Action1',
    };
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
      testBotAction.parameters = null;
      return BotAction.create(testBotAction);
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.message).to.equal('Action must contain parameters');
      done();
    });
  });
});
