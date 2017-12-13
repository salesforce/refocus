/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/helpers/botDataUtils.js
 */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const bdUtil = require('../../../db/helpers/botDataUtils');
const testStartTime = new Date();
const tu = require('../../testUtils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotData = tu.db.BotData;
const r = require('../model/room/utils');
const rt = require('../model/roomType/utils');
const b = require('../model/bot/utils');
const bd = require('../model/botData/utils');


describe('tests/db/helpers/botDataUtils.js >', () => {
  // beforeEach((done) => {
  // });

  afterEach(bd.forceDelete);

  it('ok, JSON string is JSON', (done) => {
    const testJSON = {
      "key1" : "value1",
      "key2" : {
        "key2.1" : "value 2"
      }
    };

    expect(bdUtil.isJson(JSON.stringify(testJSON))).to.equal(true);
    done();
  });

  it('ok, JSON is JSON', (done) => {
    const testJSON = {
      "key1" : "value1",
      "key2" : {
        "key2.1" : "value 2"
      }
    };

    expect(bdUtil.isJson(testJSON)).to.equal(true);
    done();
  });

  it('ok, JSON escape is JSON', (done) => {
    const testJSON = "{\"key1\" : \"value1\",\"key2\" : {\"key2.1\" : \"value 2\"}}";

    expect(bdUtil.isJson(testJSON)).to.equal(true);
    done();
  });

  it('fail, String escape is not stringify JSON', (done) => {
    const testString = "\"Test\"";

    expect(bdUtil.isJson(JSON.stringify(testString))).to.equal(false);
    done();
  });

  it('fail, String escape is not JSON', (done) => {
    const testString = "\"Test\"";

    expect(bdUtil.isJson(testString)).to.equal(false);
    done();
  });

  it('ok, String value is replaced single depth', (done) => {
    const testString = "this is a {$TestBot.response$}";
    const replacment = "{$TestBot.response$}";
    const instance = {
      "name" : "response",
      "value": "test of replacement.",
    };

    expect(bdUtil.replaceValue(testString,replacment,instance)).to.equal("this is a test of replacement.");
    done();
  });

  it('ok, String value is replaced multiple depth', (done) => {
    const testString = "this is a {$TestBot.response.newMessage$}";
    const replacment = "{$TestBot.response.newMessage$}";
    const instance = {
      "name" : "response",
      "value" : "{" +
        "\"oldMessage\" : \"test of replacement.\"," +
        "\"newMessage\" : \"test of replacement depth.\"" +
      "}",
    };

    expect(bdUtil.replaceValue(testString,replacment,instance)).to.equal("this is a test of replacement depth.");
    done();
  });

  it('ok, Sync one botData with another on creation', (done) => {
    const bot1 = {
      name: "TestBot1",
      url: 'http://www.bar.com',
      active: true,
      settings: [],
      actions: [],
      data: [
        { name: 'response', type: 'STRING' },
      ],
    };
    const bot2 = {
      name: "TestBot2",
      url: 'http://www.bar2.com',
      active: true,
      settings: [],
      actions: [],
      data: [
        { name: 'data', type: 'STRING' },
      ],
    };
    const roomType = {
      "name":"roomTypeTests",
      "isEnabled":true,
      "settings":{
        "sharedContext": {
          "TestBot1": {
            "TestBot2": {
              "data": "this is a {$TestBot1.response$}"
            }
          }
        }
      },
      "bots":[
        "TestBot1", "TestBot2"
      ]
    }
    const room = {
      "name": "roomTest",
      "active": true,
    }
    const bot1data = {
      name: 'response',
      value: 'test of replacement.',
    };
    const bot2data = {
      name: 'data',
      value: 'empty',
    };
    let bot1Id;
    let bot2Id;
    let roomId;

    Bot.create(bot1)
    .then((bot) => {
      bot1Id = bot.id;
      return Bot.create(bot2);
    })
    .then((bot2) => {
      bot2Id = bot2.id;
      return RoomType.create(roomType);
    })
    .then((rt) => {
      room.type = rt.id;
      return Room.create(room);
    })
    .then((room) => {
      roomId = room.id;
      bot2data.botId = bot2Id;
      bot2data.roomId = roomId;
      return BotData.create(bot2data);
    })
    .then((bd) => {
      bot1data.botId = bot1Id;
      bot1data.roomId = roomId;
      return BotData.create(bot1data);
    })
    .then((bd) => {
      return BotData.findOne({ where: { botId: bot2Id } })
    })
    .then((bd) => {
      expect(bd.value).to.equal("\"this is a test of replacement.\"");
      done();
    }).catch(done);
  });

  it('ok, Sync one botData with another on update', (done) => {
    const bot1 = {
      name: "TestBot1",
      url: 'http://www.bar.com',
      active: true,
      settings: [],
      actions: [],
      data: [
        { name: 'response', type: 'STRING' },
      ],
    };
    const bot2 = {
      name: "TestBot2",
      url: 'http://www.bar2.com',
      active: true,
      settings: [],
      actions: [],
      data: [
        { name: 'data', type: 'STRING' },
      ],
    };
    const roomType = {
      "name":"roomTypeTests",
      "isEnabled":true,
      "settings":{
        "sharedContext": {
          "TestBot1": {
            "TestBot2": {
              "data": "this is a {$TestBot1.response$}"
            }
          }
        }
      },
      "bots":[
        "TestBot1", "TestBot2"
      ]
    }
    const room = {
      "name": "roomTest",
      "active": true,
    }
    const bot1data = {
      name: 'response',
      value: 'test of replacement.',
    };
    const bot2data = {
      name: 'data',
      value: 'empty',
    };
    let bot1Id;
    let bot2Id;
    let roomId;

    Bot.create(bot1)
    .then((bot) => {
      bot1Id = bot.id;
      return Bot.create(bot2);
    })
    .then((bot2) => {
      bot2Id = bot2.id;
      return RoomType.create(roomType);
    })
    .then((rt) => {
      room.type = rt.id;
      return Room.create(room);
    })
    .then((room) => {
      roomId = room.id;
      bot2data.botId = bot2Id;
      bot2data.roomId = roomId;
      return BotData.create(bot2data);
    })
    .then((bd) => {
      bot1data.botId = bot1Id;
      bot1data.roomId = roomId;
      return BotData.create(bot1data);
    })
    .then((bd) => {
      return bd.update({ value: 'NewValue' })
    })
    .then((bd) => {
      return BotData.findOne({ where: { botId: bot2Id } })
    })
    .then((bd) => {
      expect(bd.value).to.equal("\"this is a NewValue\"");
      done();
    }).catch(done);
  });

});
