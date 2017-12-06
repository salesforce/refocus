/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/realtimeUtils.js
 */
'use strict';
const expect = require('chai').expect;
const realtimeUtils = require('../../realtime/utils');
const tu = require('../testUtils');
const u = require('./utils');

describe('tests/realtime/realtimeUtils.js, realtime utils Tests >', () => {
  const newSubject = {
    absolutePath: 'NA.US.CA.SF',
    name: 'SF',
  };
  const updatedSubject = {
    new: {
      absolutePath: 'NA.US.CA.SF',
      name: 'SF',
      helpurl: 'helpme.com',
    },
    old: {
      absolutePath: 'NA.US.CA.SF',
      name: 'SF',
      helpurl: '',
    },
  };
  const looksLikeSampleObjNA = {
    value: '10',
    name: 'NA|temperature',
    absolutePath: 'NA',
    status: 'OK',
    aspect: {
      name: 'temperature',
      tags: ['temp'],
    },
    subject: {
      tags: ['ea'],
    },
  };
  const looksLikeSampleObjNAUS = {
    value: '1',
    name: 'NA.US|temperature',
    absolutePath: 'NA.US',
    status: 'INVALID',
    aspect: {
      name: 'temperature',
      tags: ['temp'],
    },
    subject: {
      tags: ['ea'],
    },
  };
  const rootSubjNAUS = 'NA.US';
  const rootSubjNA = 'NA';
  const rootSubjNAUSCA = 'NA.US.CA';

  let persRootNAUS;
  let persRootNA;
  let persRootNAUSCA;
  let roomTest;
  let roomID;
  let botID;
  let botActionTest;

  let createdLensId;
  before((done) => {
    u.doSetup()
    .then((createdLens) => {
      createdLensId = createdLens.id;
    })
    .then(() => tu.db.Perspective.create({
      name: `${tu.namePrefix}firstPersp`,
      lensId: createdLensId,
      rootSubject: rootSubjNAUS,
    }))
    .then((pers1) => {
      persRootNAUS = pers1;
      return tu.db.Perspective.create({
        name: `${tu.namePrefix}secondPersp`,
        lensId: createdLensId,
        rootSubject: rootSubjNA,
        aspectFilter: ['temperature', 'humidity'],
        aspectFilterType: 'INCLUDE',
        aspectTagFilter: ['temp', 'hum'],
        aspectTagFilterType: 'INCLUDE',
        subjectTagFilter: ['ea', 'na'],
        subjectTagFilterType: 'INCLUDE',
        statusFilter: ['OK'],
        statusFilterType: 'INCLUDE',
      });
    })
    .then((pers2) => {
      persRootNA = pers2;
      return tu.db.Perspective.create({
        name: `${tu.namePrefix}thirdPersp`,
        lensId: createdLensId,
        rootSubject: rootSubjNAUSCA,
        aspectFilter: ['temperature', 'humidity'],
        statusFilter: ['OK'],
      });
    })
    .then((pers3) => {
      persRootNAUSCA = pers3;
      return tu.db.RoomType.create(u.getStandardRoomType());
    })
    .then((roomType) => {
      const room = u.getStandardRoom();
      room.type = roomType.id;
      return tu.db.Room.create(room);
    })
    .then((room) => {
      roomID = room.id;
      roomTest = room.toJSON();
    })
    .then(() => {
      const bot = u.getStandardBot();
      return tu.db.Bot.create(bot);
    })
    .then((bot) => {
      botID = bot.id;
      const botAction = u.getStandardBotAction();
      botAction.roomId = roomID;
      botAction.botId = botID;
      return tu.db.BotAction.create(botAction);
    })
    .then((ba) => {
      botActionTest = ba.toJSON();
    }).then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  describe('utility function tests >', () => {
    describe('shouldIEmitThisObject functon tests >', () => {
      it('should return false for some randomSubjectRoot', () => {
        const nspString = '/SomRadomSubjectRoo';
        expect(realtimeUtils.shouldIEmitThisObj(nspString, rootSubjNAUS))
          .to.equal(false);
      });

      it('should return true for pers rootNA', () => {
        const nspString = realtimeUtils.getPerspectiveNamespaceString(persRootNA);
        expect(realtimeUtils
          .shouldIEmitThisObj(nspString, looksLikeSampleObjNA))
          .to.equal(true);
      });

      it('should return true for pers rootNAUS', () => {
        const nspString = realtimeUtils.getPerspectiveNamespaceString(persRootNAUS);
        expect(realtimeUtils.shouldIEmitThisObj(nspString,
          looksLikeSampleObjNAUS)).to.equal(true);
      });

      it('for should return true for roomTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(roomTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, roomTest, true))
        .to.equal(true);
      });

      it('should return true for botActionTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(botActionTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, botActionTest, true))
        .to.equal(true);
      });

      it('should return false for some random absolutePath', () => {
        const nspString = '/SomRandomRoom';
        expect(realtimeUtils.shouldIEmitThisObj(nspString, roomTest, true))
          .to.equal(false);
      });
    });

    describe('getPerspectiveNamespaceString tests >', () => {
      it('for perspective persNAUS', () => {
        const nspString = realtimeUtils.getPerspectiveNamespaceString(persRootNAUS);
        expect(nspString)
        .to.equal('/NA.US&EXCLUDE&EXCLUDE&EXCLUDE&EXCLUDE');
      });

      it('for roomTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(roomTest);
        expect(nspString).to.equal('/Bots&' + roomTest.name);
      });

      it('for perspective persNA', () => {
        const nspString = realtimeUtils.getPerspectiveNamespaceString(persRootNA);
        expect(nspString)
        .to.equal('/NA&INCLUDE=temperature;humidity&INCLUDE=ea;na' +
          '&INCLUDE=temp;hum&INCLUDE=OK');
      });

      it('for perspective persNAUSCA', () => {
        const nspString = realtimeUtils.getPerspectiveNamespaceString(persRootNAUSCA);
        expect(nspString)
        .to.equal('/NA.US.CA&EXCLUDE=temperature;humidity' +
          '&EXCLUDE&EXCLUDE&EXCLUDE=OK');
      });
    });

    describe('getNewObjAsString tests >', () => {
      it('getNewObjAsString returns the expected string', () => {
        const SAMPLE_ADD_KEY = 'refocus.internal.realtime.sample.add';
        const string = realtimeUtils.getNewObjAsString(SAMPLE_ADD_KEY,
          newSubject);
        expect(string).to.be.a('string');
        const obj = JSON.parse(string);
        expect(obj.hasOwnProperty(SAMPLE_ADD_KEY)).to.equal(true);
        expect(obj[SAMPLE_ADD_KEY]).to.deep.equal(newSubject);
      });
    });

    describe('parseObject tests >', () => {
      it('parse updated object', () => {
        const obj = realtimeUtils.parseObject(newSubject);
        expect(obj.hasOwnProperty('new')).to.equal(false);
      });

      it('parse newObject', () => {
        const obj = realtimeUtils.parseObject(updatedSubject);
        expect(obj.hasOwnProperty('new')).to.equal(false);
      });
    });

    describe('isIpWhitelisted >', () => {
      it('ok', () => {
        const addr = '5.6.7.805';
        const whitelist = [['1.2.3.4', '2.3.4.5'], ['5.6.7.0', '5.6.7.805']];
        expect(realtimeUtils.isIpWhitelisted(addr, whitelist)).to.equal(true);
      });

      it('not in range', () => {
        const addr = '5.6.7.805';
        const whitelist = [['1.2.3.4', '2.3.4.5'], ['5.6.7.9', '5.7.7.7']];
        try {
          realtimeUtils.isIpWhitelisted(addr, whitelist);
          expect(false);
        } catch (err) {
          expect(err).to.have.property('message',
            'IP address "5.6.7.805" is not whitelisted');
        }
      });

      it('ok when whitelist is not defined', () => {
        const addr = '5.6.7.805';
        expect(realtimeUtils.isIpWhitelisted(addr)).to.equal(true);
      });

      it('range not legit', () => {
        const addr = '5.6.7.805';
        const whitelist = [[0], ['1.2.3.4', '9.3.4.5']];
        try {
          realtimeUtils.isIpWhitelisted(addr, whitelist);
          expect(false);
        } catch (err) {
          expect(err).to.have.property('message',
            'IP address "5.6.7.805" is not whitelisted');
        }
      });
    });

    // need done in these tests, otherwise tests pass before promise returns
    describe('attachAspectSubject tests', () => {
      it('useSampleStore = true', (done) => {
        realtimeUtils.attachAspectSubject(looksLikeSampleObjNA, true)
        .then((sample) => {
          expect(sample).deep.equal(looksLikeSampleObjNA);
          done();
        })
        .catch(done);
      });

      it('useSampleStore = false', (done) => {
        let sampleFromDb = {
          get: () => looksLikeSampleObjNA,
        };
        realtimeUtils.attachAspectSubject(sampleFromDb, false)
        .then((sample) => {
          expect(sample).deep.equal(looksLikeSampleObjNA);
          done();
        })
        .catch(done);
      });
    });
  });
});
