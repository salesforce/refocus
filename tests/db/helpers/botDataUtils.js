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
const serialize = require('serialize-javascript');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const bdUtil = require('../../../db/helpers/botDataUtils');
const tu = require('../../testUtils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotData = tu.db.BotData;
const bd = require('../model/botData/utils');
/* eslint-disable no-magic-numbers */
const bot1 = {
  name: 'TestBot1',
  url: 'http://www.bar.com',
  active: true,
  settings: [],
  actions: [],
  data: [
    { name: 'response', type: 'STRING' },
  ],
  version: '1.0.0',
};
const bot2 = {
  name: 'TestBot2',
  url: 'http://www.bar2.com',
  active: true,
  settings: [],
  actions: [],
  data: [
    { name: 'data', type: 'STRING' },
  ],
  version: '1.0.0',
};
const bot3 = {
  name: 'TestBot3',
  url: 'http://www.bar3.com',
  active: true,
  settings: [],
  actions: [],
  data: [
    { name: 'data', type: 'STRING' },
  ],
  version: '1.0.0',
};
const roomType = {
  name: 'roomTypeTests',
  isEnabled: true,
  settings: {
    sharedContext: {
      TestBot1: {
        TestBot2: {
          data: 'this is a ${TestBot1.response}',
        },
      },
    },
  },
  bots: [
    'TestBot1', 'TestBot2',
  ],
};
const roomType2 = {
  name: 'roomTypeTests2',
  isEnabled: true,
  settings: {
    sharedContext: {
      TestBot1: {
        TestBot2: {
          data: {
            response: 'this is a ${TestBot1.response}',
          },
        },
      },
    },
  },
  bots: [
    'TestBot1', 'TestBot2',
  ],
};
const roomType3 = {
  name: 'roomTypeTests3',
  isEnabled: true,
  settings: {
    sharedContext: {
      TestBot1: {
        TestBot2: {
          data: {
            response: 'this is a ${TestBot1.response}',
          },
        },
        TestBot3: {
          stringName: '${TestBot1.response}',
        },
      },
    },
  },
  bots: [
    'TestBot1', 'TestBot2', 'TestBot3',
  ],
};
const room = {
  name: 'roomTest',
  active: true,
};
const bot1data = {
  name: 'response',
  value: 'test of replacement.',
};
const bot2data = {
  name: 'data',
  value: 'empty',
};
const bot3data = {
  name: 'data',
  value: '{"name": "tausif"}',
};
const bot4data = {
  name: 'stringName',
  value: 'tausif',
};
let bot1Id;
let bot2Id;
let bot3Id;
let roomId;

describe('tests/db/helpers/botDataUtils.js >', () => {
  afterEach(bd.forceDelete);

  it('ok, JSON string is JSON', (done) => {
    const testJSON = {
      key1: 'value1',
      key2: {
        key21: 'value 2',
      },
    };

    expect(bdUtil.isJson(JSON.stringify(testJSON))).to.equal(true);
    done();
  });

  it('ok, JSON is JSON', (done) => {
    const testJSON = {
      key1: 'value1',
      key2: {
        key21: 'value 2',
      },
    };

    expect(bdUtil.isJson(testJSON)).to.equal(true);
    done();
  });

  it('ok, JSON escape is JSON', (done) => {
    const testJSON =
      '{\"key1\": \"value1\",\"key2\": {\"key2.1\": \"value 2\"}}';

    expect(bdUtil.isJson(testJSON)).to.equal(true);
    done();
  });

  it('fail, String escape is not stringify JSON', (done) => {
    const testString = '\'Test\'';

    expect(bdUtil.isJson(JSON.stringify(testString))).to.equal(false);
    done();
  });

  it('fail, String escape is not JSON', (done) => {
    const testString = '\'Test\'';

    expect(bdUtil.isJson(testString)).to.equal(false);
    done();
  });

  it('ok, regular string replaced with regular string', (done) => {
    const oldVal = 'this is a string';
    const newVal = 'this is a new string';

    expect(bdUtil.combineValue(oldVal, newVal))
      .to.equal(newVal);
    done();
  });

  it('ok, JSON string replaced with regular string', (done) => {
    const oldVal = '{\"test\": \"test value\"}';
    const newVal = 'this is a new string';

    expect(bdUtil.combineValue(oldVal, newVal))
      .to.equal(newVal);
    done();
  });

  it('ok, regular string replaced with JSON string', (done) => {
    const oldVal = 'this is a new string';
    const newVal = '{\"test\": \"test value\"}';

    expect(bdUtil.combineValue(oldVal, newVal))
      .to.equal(newVal);
    done();
  });

  it('ok, JSON string replaced key value from new JSON string', (done) => {
    const oldVal = '{\"test\":\"test value\",\"test2\":\"test value3\"}';
    const newVal = '{\"test\":\"test value2\"}';

    expect(bdUtil.combineValue(oldVal, newVal))
      .to.equal('{\"test\":\"test value2\",\"test2\":\"test value3\"}');
    done();
  });

  it('ok, JSON string add key value from new JSON string', (done) => {
    const oldVal = '{\"test\":\"test value\",\"test2\":\"test value3\"}';
    const newVal = '{\"test3\":\"test value4\"}';

    expect(bdUtil.combineValue(oldVal, newVal))
      .to.equal(
        '{\"test\":\"test value\",' +
        '\"test2\":\"test value3\",' +
        '\"test3\":\"test value4\"}'
      );
    done();
  });

  it('ok, Sync one botData with another on creation', (done) => {
    Bot.create(bot1)
    .then((botRes) => {
      bot1Id = botRes.id;
      return Bot.create(bot2);
    })
    .then((botRes2) => {
      bot2Id = botRes2.id;
      return RoomType.create(roomType);
    })
    .then((rtRes) => {
      room.type = rtRes.id;
      return Room.create(room);
    })
    .then((roomRes) => {
      roomId = roomRes.id;
      bot2data.botId = bot2Id;
      bot2data.roomId = roomId;
      return BotData.create(bot2data);
    })
    .then(() => {
      bot1data.botId = bot1Id;
      bot1data.roomId = roomId;
      return BotData.create(bot1data);
    })
    .then(() => BotData.findOne({ where: { botId: bot2Id } }))
    .then((bdRes) => {
      expect(bdRes.value).to.equal('this is a test of replacement.');
      done();
    }).catch(done);
  });

  it('ok, Sync one botData with another on update', (done) => {
    Bot.create(bot1)
    .then((botRes) => {
      bot1Id = botRes.id;
      return Bot.create(bot2);
    })
    .then((botRes2) => {
      bot2Id = botRes2.id;
      return RoomType.create(roomType);
    })
    .then((rtRes) => {
      room.type = rtRes.id;
      return Room.create(room);
    })
    .then((roomRes) => {
      roomId = roomRes.id;
      bot2data.botId = bot2Id;
      bot2data.roomId = roomId;
      return BotData.create(bot2data);
    })
    .then(() => {
      bot1data.botId = bot1Id;
      bot1data.roomId = roomId;
      return BotData.create(bot1data);
    })
    .then((bdRes) => bdRes.update({ value: 'NewValue' }))
    .then(() => BotData.findOne({ where: { botId: bot2Id } }))
    .then((bdRes2) => {
      expect(bdRes2.value).to.equal('this is a NewValue');
      done();
    }).catch(done);
  });

  it('ok, Sync one botData with another on creation and append JSON',
  (done) => {
    Bot.create(bot1)
    .then((botRes) => {
      bot1Id = botRes.id;
      return Bot.create(bot2);
    })
    .then((botRes2) => {
      bot2Id = botRes2.id;
      return RoomType.create(roomType2);
    })
    .then((rtRes) => {
      room.type = rtRes.id;
      return Room.create(room);
    })
    .then((roomRes) => {
      roomId = roomRes.id;
      bot3data.botId = bot2Id;
      bot3data.roomId = roomId;
      return BotData.create(bot3data);
    })
    .then(() => {
      bot1data.botId = bot1Id;
      bot1data.roomId = roomId;
      return BotData.create(bot1data);
    })
    .then(() => BotData.findOne({ where: { botId: bot2Id } }))
    .then((bdRes) => {
      expect(bdRes.value).to
        .equal('{"name":"tausif","response":"this is a test of replacement."}');
      done();
    }).catch(done);
  });

  it('ok, Sync two botData with another on creation and append JSON',
  (done) => {
    Bot.create(bot1)
    .then((botRes) => {
      bot1Id = botRes.id;
      return Bot.create(bot2);
    })
    .then((botRes2) => {
      bot2Id = botRes2.id;
      return Bot.create(bot3);
    })
    .then((botRes3) => {
      bot3Id = botRes3.id;
      return RoomType.create(roomType3);
    })
    .then((rtRes) => {
      room.type = rtRes.id;
      return Room.create(room);
    })
    .then((roomRes) => {
      roomId = roomRes.id;
      bot3data.botId = bot2Id;
      bot3data.roomId = roomId;
      return BotData.create(bot3data);
    })
    .then(() => {
      bot4data.botId = bot3Id;
      bot4data.roomId = roomId;
      return BotData.create(bot4data);
    })
    .then(() => {
      bot1data.botId = bot1Id;
      bot1data.roomId = roomId;
      return BotData.create(bot1data);
    })
    .then(() => BotData.findOne({ where: { botId: bot3Id } }))
    .then((bdRes) => {
      expect(bdRes.value).to.equal('test of replacement.');
      return BotData.findOne({ where: { botId: bot2Id } });
    })
    .then((bdRes2) => {
      expect(bdRes2.value).to
        .equal('{"name":"tausif","response":"this is a test of replacement."}');
      done();
    }).catch(done);
  });

  it('fail, source botData went in before botData to be synced',
  (done) => {
    Bot.create(bot1)
    .then((botRes) => {
      bot1Id = botRes.id;
      return Bot.create(bot2);
    })
    .then((botRes2) => {
      bot2Id = botRes2.id;
      return Bot.create(bot3);
    })
    .then((botRes3) => {
      bot3Id = botRes3.id;
      return RoomType.create(roomType3);
    })
    .then((rtRes) => {
      room.type = rtRes.id;
      return Room.create(room);
    })
    .then((roomRes) => {
      roomId = roomRes.id;
      bot1data.botId = bot1Id;
      bot1data.roomId = roomId;
      return BotData.create(bot1data);
    })
    .then(() => {
      bot3data.botId = bot2Id;
      bot3data.roomId = roomId;
      return BotData.create(bot3data);
    })
    .then(() => BotData.findOne({ where: { botId: bot2Id } }))
    .then((bdRes) => {
      expect(bdRes.value).to.equal('{"name": "tausif"}');
      done();
    }).catch(done);
  });

  describe('Check replacement', () => {
    it('String must be replaced with single depth', (done) => {
      const toReplace = 'this is a ${TestBot.response}';
      const expectedReplacement = 'this is a test of replacement.';

      const replacementToken = '${TestBot.response}';
      const instance = { name: 'response', value: 'test of replacement.', };

      expect(bdUtil.replaceValue(toReplace, replacementToken, instance))
        .to.equal(expectedReplacement);
      done();
    });

    it('String must be replaced with special chars, single depth', (done) => {
      const toReplace = 'this is a ${TestBot.response}';
      const replacementToken = '${TestBot.response}';
      const specialCharString = '!@£$%^&*()":][/|.,/;\n\n\t%';
      const expectedReplacement = 'this is a !@£$%^&*()":][/|.,/;\n\n\t%';

      const instance = { name: 'response', value: specialCharString, };

      expect(bdUtil.replaceValue(toReplace, replacementToken, instance))
        .to.equal(expectedReplacement);
      done();
    });

    it('Replacement must not happen when token is not matched', (done) => {
      const toReplace = 'this is a ${TestBot.response}';
      const replacementToken = '${TestBot.response2}';
      const instance = { name: 'response', value: 'blah', };

      expect(bdUtil.replaceValue(toReplace, replacementToken, instance))
        .to.equal('this is a ${TestBot.response}');
      done();
    });

    it('Must be replaced when multiple depth', (done) => {
      const toReplace = 'this is a ${TestBot.response.newMessage}';
      const replacementToken = '${TestBot.response.newMessage}';
      const instance = {
        name: 'response',
        value: '{' +
          '\"oldMessage\": \"test of replacement.\",' +
          '\"newMessage\": \"test of replacement depth."' +
          '}',
      };
      const expectedReplacement = 'this is a test of replacement depth.';

      expect(bdUtil.replaceValue(toReplace, replacementToken, instance))
        .to.equal(expectedReplacement);
      done();
    });

    it('Must replace special char with multiple depth', (done) => {
      const toReplace = 'this is a ${TestBot.response.newMessage}';
      const replacementToken = '${TestBot.response.newMessage}';
      const specialCharString = '!@£$%^&*()":][/|.,/;\n\n\t%';
      const instance = {
        name: 'response',
        value:
          serialize({
            newMessage: specialCharString,
          }),
      };
      const expectedReplacement = 'this is a !@£$%^&*()":][/|.,/;\n\n\t%';

      expect(bdUtil.replaceValue(toReplace, replacementToken, instance))
        .to.equal(expectedReplacement);
      done();
    });

    it('Must be able to replace and convert to an object the value in depth',
      (done) => {
        const toReplace = '{"onCallTTe": "${Oncall-Bot.onCallTTx.tte}"}';
        const replacementToken = '${Oncall-Bot.onCallTTx.tte}';
        const instance = {
          name: 'onCallTTx',
          value: '{"tte":' +
            '[' +
            '{' +
            '"startTime":"2019-10-02T13:37:16Z",' +
            '"endTime":"2019-10-02T14:04:47Z",' +
            '"team":"Oncall-Bot-Test-Service"' +
            '},' +
            '{' +
            '"startTime":"2019-10-02T14:04:00Z",' +
            '"endTime":' +
            '"2019-10-02T14:04:54Z",' +
            '"team":"Oncall-Bot-Test-Service"' +
            '},' +
            '{' +
            '"startTime":"2019-10-02T14:04:00Z",' +
            '"endTime":"2019-10-02T14:04:59Z",' +
            '"team":"Oncall-Bot-Test-Service"' +
            '}' +
            ']' +
            '}',
        };

        const replaced = bdUtil.replaceValue(toReplace, replacementToken,
          instance);
        const list = JSON.parse(JSON.parse(replaced).onCallTTe);
        expect(list.length === 3).to.be.equal(true);
        done();
      });
  });
});
