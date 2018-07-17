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
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const realtimeUtils = require('../../realtime/utils');
const rtConstants = require('../../realtime/constants');
const tu = require('../testUtils');
const u = require('./utils');

describe('tests/realtime/realtimeUtils.js, realtime utils Tests >', () => {
  const rootSubjNA = tu.namePrefix + 'NA';
  const rootSubjNAUS = rootSubjNA + '.US';
  const rootSubjNAUSCA = rootSubjNA + '.CA';
  const newSubject = {
    absolutePath: rootSubjNAUSCA + '.SF',
    name: 'SF',
  };
  const rootSubjNAObj = {
    name: rootSubjNA,
    isPublished: true,
    tags: ['ea'],
    relatedLinks: [
      { name: 'population', value: 'http://popl.io' },
    ],
  };
  const updatedSubject = {
    new: {
      absolutePath: rootSubjNAUSCA + '.SF',
      name: 'SF',
      helpurl: 'helpme.com',
    },
    old: {
      absolutePath: rootSubjNAUSCA + '.SF',
      name: 'SF',
      helpurl: '',
    },
  };
  const aspectOne = {
    name: tu.namePrefix + 'temperature',
    timeout: '30s',
    okRange: [1, 5],
    isPublished: true,
    tags: ['temp'],
  };
  const sampleToCreateNA = {
    value: '2',
    name: rootSubjNA + '|' + aspectOne.name,
    absolutePath: rootSubjNA,
    status: 'OK',
    aspect: aspectOne,
    subject: {
      tags: ['ea'],
    },
  };

  const looksLikeSampleObjNAUS = {
    value: '1',
    name: rootSubjNAUS + '|' + aspectOne.name,
    absolutePath: rootSubjNAUS,
    status: 'INVALID',
    aspect: aspectOne,
    subject: {
      tags: ['ea'],
    },
  };

  let persRootNAUS;
  let persRootNA;
  let persRootNAUSCA;
  let roomTest;
  let roomID;
  let botID;
  let botActionTest;
  let botEventTest;
  let botDataTest;
  let createdLensId;
  let sampleInstNA;

  before((done) => {
    tu.db.Aspect.create(aspectOne)
    .then(() => tu.db.Subject.create(rootSubjNAObj))
    .then(() => tu.Sample.upsertByName(sampleToCreateNA))
    .then((sample) => {
      sampleInstNA = sample;
      /*
       * Attach absolutePath and subject object to the sample to make it a
       * complete object for publishing.
       */
      sampleInstNA.absolutePath = rootSubjNA;
      sampleInstNA.subject = rootSubjNAObj;
    })
    .then(() => u.doSetup())
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
        aspectFilter: [aspectOne.name, 'humidity'],
        aspectFilterType: 'INCLUDE',
        aspectTagFilter: ['temp', 'hum'],
        aspectTagFilterType: 'INCLUDE',
        subjectTagFilter: ['ea', rootSubjNA],
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
        aspectFilter: [aspectOne.name, 'humidity'],
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
      roomTest.pubOpts = rtConstants.pubOpts.room;
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
      botActionTest.pubOpts = rtConstants.pubOpts.botAction;
    })
    .then(() => {
      const botEvent = u.getStandardEvent();
      return tu.db.Event.create(botEvent);
    })
    .then((event) => {
      botEventTest = event.toJSON();
      botEventTest.pubOpts = rtConstants.pubOpts.event;
      const botData = u.getStandardBotData();
      botData.roomId = roomID;
      botData.botId = botID;
      return tu.db.BotData.create(botData);
    })
    .then((bd) => {
      botDataTest = bd.toJSON();
      botDataTest.pubOpts = rtConstants.pubOpts.botData;
    }).then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  describe('utility function tests >', () => {
    describe('shouldIEmitThisObject function tests >', () => {
      it('should return false for some randomSubjectRoot', () => {
        const nspString = '/SomRadomSubjectRoo';
        expect(realtimeUtils.shouldIEmitThisObj(nspString, rootSubjNAUS))
          .to.equal(false);
      });

      it('should return true for pers rootNA', () => {
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNA);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, sampleInstNA))
          .to.equal(true);
      });

      it('should return true for pers rootNAUS', () => {
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNAUS);
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

      it('should return true for botEventTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(botEventTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, botEventTest, true))
        .to.equal(true);
      });

      it('should return true for botDataTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(botDataTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, botDataTest, true))
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
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNAUS);
        expect(nspString)
        .to.equal('/' + rootSubjNAUS + '&EXCLUDE&EXCLUDE&EXCLUDE&EXCLUDE');
      });

      it('for roomTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(roomTest);
        expect(nspString).to.equal('/Bots&' + roomTest.name);
      });

      it('for perspective persNA', () => {
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNA);
        expect(nspString)
          .to.equal('/' + rootSubjNA + '&INCLUDE=' + aspectOne.name +
            ';humidity&INCLUDE=ea;' + rootSubjNA +
            '&INCLUDE=temp;hum&INCLUDE=OK');
      });

      it('for perspective persNAUSCA', () => {
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNAUSCA);
        expect(nspString)
          .to.equal('/' + rootSubjNAUSCA + '&EXCLUDE=' + aspectOne.name +
            ';humidity&EXCLUDE&EXCLUDE&EXCLUDE=OK');
      });
    });

    describe('getNewObjAsString tests >', () => {
      const testEvents = {
        'refocus.internal.realtime.subject.add': {
          absolutePath: '___TEST_SUBJECT',
          childCount: 0,
          id: '9f346893-8cdd-4982-980e-fc662719772c',
          isDeleted: '0',
          relatedLinks: [],
          tags: [],
          sortBy: '',
          description: 'this is sample description',
          imageUrl: 'http://www.bar.com/a0.jpg',
          isPublished: true,
          name: '___TEST_SUBJECT',
          updatedAt: '2018-07-13T23:27:12.708Z',
          createdAt: '2018-07-13T23:27:12.708Z',
          hierarchyLevel: 1,
          geolocation: null,
          helpEmail: null,
          helpUrl: null,
          parentAbsolutePath: null,
          deletedAt: null,
          parentId: null,
          createdBy: null,
        },
        'refocus.internal.realtime.perspective.namespace.initialize': {
          id: '2cc04471-86c9-49bc-bac7-18fa571c207c',
          isDeleted: '0',
          aspectFilterType: 'EXCLUDE',
          aspectTagFilterType: 'EXCLUDE',
          subjectTagFilterType: 'EXCLUDE',
          statusFilterType: 'EXCLUDE',
          name: '___testPersp',
          lensId: '3d557baa-17e4-449b-9112-dd7f798523a0',
          rootSubject: 'myMainSubject',
          aspectFilter: ['temperature', 'humidity'],
          aspectTagFilter: ['temp', 'hum'],
          subjectTagFilter: ['ea', 'na'],
          statusFilter: ['Critical', '-OK'],
          updatedAt: '2018-07-13T23:27:46.859Z',
          createdAt: '2018-07-13T23:27:46.859Z',
          deletedAt: null,
          createdBy: null,
        },
        'refocus.internal.realtime.bot.event.add': {
          id: '21dea92c-bb8e-4fd9-b57d-ede256909700',
          log: 'Sample Event',
          context: { Sample: 'DATA' },
          updatedAt: '2018-07-13T23:27:31.224Z',
          createdAt: '2018-07-13T23:27:31.224Z',
          roomId: null,
          botId: null,
          botDataId: null,
          botActionId: null,
          userId: null,
          pubOpts: {
            client: 'pubBot',
            channel: 'botChannelName',
            filterIndex: 3,
            filterField: 'id',
          },
        },
        'refocus.internal.realtime.bot.namespace.initialize': {
          id: 66,
          name: '___TestRoom',
          active: true,
          type: '7ddb30e3-b5da-4d7c-b095-f44a2eb0d510',
          updatedAt: '2018-07-13T23:27:31.105Z',
          createdAt: '2018-07-13T23:27:31.105Z',
          settings: { Key1: 'Value1', Key2: 'Value2' },
          bots: null,
          externalId: null,
          pubOpts: {
            client: 'pubBot',
            channel: 'botChannelName',
            filterIndex: 0,
            filterField: 'name',
          },
        },
        'refocus.internal.realtime.sample.add': {
          value: '10',
          subjectId: 'c8fb7723-4319-4b22-98b2-70ecd140e7b0',
          aspectId: 'a5ebf6e3-bc97-49c2-ba8b-00a14a3792d4',
          name: '___NorthAmerica|___humidity',
          status: 'Invalid',
          relatedLinks: '[]',
          previousStatus: 'Invalid',
          statusChangedAt: '2018-07-13T23:28:34.260Z',
          updatedAt: '2018-07-13T23:28:34.260Z',
          createdAt: '2018-07-13T23:28:34.260Z',
          aspect: {
            id: 'a5ebf6e3-bc97-49c2-ba8b-00a14a3792d4',
            isDeleted: '0',
            valueType: 'BOOLEAN',
            relatedLinks: [],
            tags: [],
            name: '___humidity',
            timeout: '60s',
            isPublished: 'true',
            updatedAt: '2018-07-13T23:28:34.246Z',
            createdAt: '2018-07-13T23:28:34.246Z',
          },
          subject: {
            absolutePath: '___NorthAmerica',
            childCount: '0',
            id: 'c8fb7723-4319-4b22-98b2-70ecd140e7b0',
            isDeleted: '0',
            relatedLinks: [],
            tags: [],
            sortBy: '',
            name: '___NorthAmerica',
            isPublished: 'true',
            updatedAt: '2018-07-13T23:28:34.236Z',
            createdAt: '2018-07-13T23:28:34.236Z',
            hierarchyLevel: '1',
          },
          absolutePath: '___NorthAmerica',
        },
        'refocus.internal.realtime.sample.update': {
          value: '10',
          subjectId: 'c8fb7723-4319-4b22-98b2-70ecd140e7b0',
          aspectId: 'a5ebf6e3-bc97-49c2-ba8b-00a14a3792d4',
          name: '___NorthAmerica|___humidity',
          status: 'Invalid',
          relatedLinks: '[]',
          previousStatus: 'Invalid',
          statusChangedAt: '2018-07-13T23:28:34.260Z',
          updatedAt: '2018-07-13T23:28:34.260Z',
          createdAt: '2018-07-13T23:28:34.260Z',
          aspect: {
            id: 'a5ebf6e3-bc97-49c2-ba8b-00a14a3792d4',
            isDeleted: '0',
            valueType: 'BOOLEAN',
            relatedLinks: [],
            tags: [],
            name: '___humidity',
            timeout: '60s',
            isPublished: 'true',
            updatedAt: '2018-07-13T23:28:34.246Z',
            createdAt: '2018-07-13T23:28:34.246Z',
          },
          subject: {
            absolutePath: '___NorthAmerica',
            childCount: '0',
            id: 'c8fb7723-4319-4b22-98b2-70ecd140e7b0',
            isDeleted: '0',
            relatedLinks: [],
            tags: [],
            sortBy: '',
            name: '___NorthAmerica',
            isPublished: 'true',
            updatedAt: '2018-07-13T23:28:34.236Z',
            createdAt: '2018-07-13T23:28:34.236Z',
            hierarchyLevel: '1',
          },
          absolutePath: '___NorthAmerica',
        },
        'refocus.internal.realtime.sample.remove': {
          aspectId: '63328a37-7d2c-4c71-a5ea-6eba4205db2b',
          subjectId: '02ed7ee4-fc7d-41d4-911f-ef53d331fd2f',
          name: '___Subject|___Aspect',
          status: 'Invalid',
          value: '',
          relatedLinks: '[]',
          previousStatus: 'Invalid',
          statusChangedAt: '2018-07-13T23:28:28.443Z',
          updatedAt: '2018-07-13T23:28:28.443Z',
          createdAt: '2018-07-13T23:28:28.443Z',
          subject: {
            absolutePath: '___Subject',
            childCount: 0,
            description: null,
            geolocation: null,
            helpEmail: null,
            helpUrl: null,
            id: '02ed7ee4-fc7d-41d4-911f-ef53d331fd2f',
            imageUrl: null,
            isDeleted: 1531524508457,
            isPublished: true,
            name: '___Subject',
            parentAbsolutePath: null,
            relatedLinks: [],
            tags: [],
            sortBy: '',
            createdAt: '2018-07-13T23:28:28.432Z',
            updatedAt: '2018-07-13T23:28:28.457Z',
            deletedAt: '2018-07-13T23:28:28.459Z',
            hierarchyLevel: 1,
            parentId: null,
            createdBy: null,
            user: null,
          },
          aspect: {
            id: '63328a37-7d2c-4c71-a5ea-6eba4205db2b',
            isDeleted: '0',
            relatedLinks: [],
            tags: [],
            isPublished: 'true',
            name: '___Aspect',
            timeout: '30s',
            valueType: 'NUMERIC',
            updatedAt: '2018-07-13T23:28:28.429Z',
            createdAt: '2018-07-13T23:28:28.429Z',
          },
          absolutePath: '___Subject',
        },
        'refocus.internal.realtime.subject.remove': {
          absolutePath: '___Subject',
          childCount: 0,
          description: null,
          geolocation: null,
          helpEmail: null,
          helpUrl: null,
          id: '02ed7ee4-fc7d-41d4-911f-ef53d331fd2f',
          imageUrl: null,
          isDeleted: 1531524508457,
          isPublished: true,
          name: '___Subject',
          parentAbsolutePath: null,
          relatedLinks: [],
          tags: [],
          sortBy: '',
          createdAt: '2018-07-13T23:28:28.432Z',
          updatedAt: '2018-07-13T23:28:28.457Z',
          deletedAt: '2018-07-13T23:28:28.459Z',
          hierarchyLevel: 1,
          parentId: null,
          createdBy: null,
          user: null,
        },
        'refocus.internal.realtime.sample.nochange': {
          value: '10',
          subjectId: 'c8fb7723-4319-4b22-98b2-70ecd140e7b0',
          aspectId: 'a5ebf6e3-bc97-49c2-ba8b-00a14a3792d4',
          name: '___NorthAmerica|___humidity',
          status: 'Invalid',
          relatedLinks: '[]',
          previousStatus: 'Invalid',
          statusChangedAt: '2018-07-13T23:28:34.260Z',
          updatedAt: '2018-07-13T23:28:34.260Z',
          createdAt: '2018-07-13T23:28:34.260Z',
          aspect: {
            id: 'a5ebf6e3-bc97-49c2-ba8b-00a14a3792d4',
            isDeleted: '0',
            valueType: 'BOOLEAN',
            relatedLinks: [],
            tags: [],
            name: '___humidity',
            timeout: '60s',
            isPublished: 'true',
            updatedAt: '2018-07-13T23:28:34.246Z',
            createdAt: '2018-07-13T23:28:34.246Z',
          },
          subject: {
            absolutePath: '___NorthAmerica',
            childCount: '0',
            id: 'c8fb7723-4319-4b22-98b2-70ecd140e7b0',
            isDeleted: '0',
            relatedLinks: [],
            tags: [],
            sortBy: '',
            name: '___NorthAmerica',
            isPublished: 'true',
            updatedAt: '2018-07-13T23:28:34.236Z',
            createdAt: '2018-07-13T23:28:34.236Z',
            hierarchyLevel: '1',
          },
          absolutePath: '___NorthAmerica',
        },
      };

      it('getNewObjAsString for subject.add', () => {
        const key = 'refocus.internal.realtime.subject.add';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        expect(obj[key]).to.deep.equal(testEvents[key]);
      });

      it('getNewObjAsString for perspective.namespace.initialize', () => {
        const key =
          'refocus.internal.realtime.perspective.namespace.initialize';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        expect(obj[key]).to.deep.equal(testEvents[key]);
      });

      it('getNewObjAsString for bot.event.add', () => {
        const key =
          'refocus.internal.realtime.bot.event.add';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        expect(obj[key]).to.deep.equal(testEvents[key]);
      });

      it('getNewObjAsString for bot.namespace.initialize', () => {
        const key =
          'refocus.internal.realtime.bot.namespace.initialize';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        expect(obj[key]).to.deep.equal(testEvents[key]);
      });

      it('getNewObjAsString for sample.add', () => {
        const key = 'refocus.internal.realtime.sample.add';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        expect(obj[key]).to.deep.equal(testEvents[key]);
      });

      it('getNewObjAsString for sample.update', () => {
        const key = 'refocus.internal.realtime.sample.update';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        expect(obj[key].new).to.deep.equal(testEvents[key]);
      });

      it('getNewObjAsString for sample.remove', () => {
        const key = 'refocus.internal.realtime.sample.remove';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        expect(obj[key]).to.deep.equal(testEvents[key]);
      });

      it('getNewObjAsString for sample.nochange', () => {
        const key = 'refocus.internal.realtime.sample.nochange';
        const str = realtimeUtils.getNewObjAsString(key, testEvents[key]);
        expect(str).to.be.a('string');
        const obj = JSON.parse(str);
        const nc = {
          name: testEvents[key].name,
          updatedAt: testEvents[key].updatedAt,
          aspect: {
            name: testEvents[key].aspect.name,
            timeout: testEvents[key].aspect.timeout,
          },
        };
        expect(obj[key]).to.deep.equal(nc);
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
    describe('attachAspectSubject tests >', () => {
      describe('with data from sampleStore >', () => {
        it('without sample having subject and aspect objects attached',
        (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.aspect;
          delete sampleObj.subject;

          realtimeUtils.attachAspectSubject(sampleObj)
          .then((sample) => {
            expect(sample.aspect.name).to.include(aspectOne.name);
            expect(sample.subject.name).to.equal(rootSubjNA);
            sampleObj.aspect = sample.aspect;
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('with sample having subject and aspect objects attached',
        (done) => {
          realtimeUtils.attachAspectSubject(sampleInstNA)
          .then((sample) => {
            expect(sample).to.deep.equals(sampleInstNA);
            return done();
          })
          .catch(done);
        });

        it('with sample having aspect attached but not subject attached',
        (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.subject;
          realtimeUtils.attachAspectSubject(sampleObj)
          .then((sample) => {
            expect(sample.subject.name).to.equal(rootSubjNA);
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('same output with upper sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toUpperCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            expect(sample.absolutePath).to.equal(sampleInstNA.absolutePath);
            done();
          })
          .catch(done);
        });

        it('same output with lower sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toLowerCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            done();
          })
          .catch(done);
        });

        it('should return null when passing in a sample without name',
        (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.name;
          realtimeUtils.attachAspectSubject(sampleObj, tu.db.Aspect)
          .then((sample) => {
            expect(sample).to.equal(null);
            return done();
          })
          .catch(done);
        });
      });

      describe('with data from db >', () => {
        before(() => tu.toggleOverride('attachSubAspFromDB', true));
        after(() => tu.toggleOverride('attachSubAspFromDB', false));

        it('without sample having subject and aspect objects attached',
        (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.aspect;
          delete sampleObj.subject;
          realtimeUtils.attachAspectSubject(sampleObj, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.aspect.name).to.include(aspectOne.name);
            expect(sample.subject.name).to.equal(rootSubjNA);
            sampleObj.aspect = sample.aspect;
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('with sample already having subject and aspect objects attached',
        (done) => {
          realtimeUtils.attachAspectSubject(sampleInstNA)
          .then((sample) => {
            expect(sample).to.deep.equals(sampleInstNA);
            return done();
          })
          .catch(done);
        });

        it('with sample having aspect attached but not subject attached',
        (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.subject;
          realtimeUtils.attachAspectSubject(sampleObj, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.subject.name).to.equal(rootSubjNA);
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('same output with upper sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toUpperCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            expect(sample.absolutePath).to.equal(sampleInstNA.absolutePath);
            done();
          })
          .catch(done);
        });

        it('same output with lower sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toLowerCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            done();
          })
          .catch(done);
        });

        describe('with attachSubAspFromDBuseScopes >', () => {
          before(() => tu.toggleOverride('attachSubAspFromDBuseScopes', true));
          after(() => tu.toggleOverride('attachSubAspFromDBuseScopes', false));

          it('without sample having subject and aspect objects attached',
          (done) => {
            const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
            delete sampleObj.aspect;
            delete sampleObj.subject;
            realtimeUtils.attachAspectSubject(sampleObj, tu.db.Subject,
              tu.db.Aspect)
            .then((sample) => {
              expect(sample.aspect.name).to.include(aspectOne.name);
              expect(sample.subject.name).to.equal(rootSubjNA);
              sampleObj.aspect = sample.aspect;
              sampleObj.subject = sample.subject;
              expect(sample).to.deep.equal(sampleObj);
              return done();
            })
            .catch(done);
          });

          it('with sample already having subject and aspect objects attached',
          (done) => {
            realtimeUtils.
              attachAspectSubject(sampleInstNA, tu.db.Subject, tu.db.Aspect)
            .then((sample) => {
              expect(sample).to.deep.equals(sampleInstNA);
              return done();
            })
            .catch(done);
          });

          it('with sample having aspect attached but not subject attached',
          (done) => {
            const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
            delete sampleObj.subject;
            realtimeUtils.attachAspectSubject(sampleObj, tu.db.Subject,
              tu.db.Aspect)
            .then((sample) => {
              expect(sample.subject.name).to.equal(rootSubjNA);
              sampleObj.subject = sample.subject;
              expect(sample).to.deep.equal(sampleObj);
              return done();
            })
            .catch(done);
          });

          it('same output with upper sample name', (done) => {
            const copySample = JSON.parse(JSON.stringify(sampleInstNA));
            copySample.name = copySample.name.toUpperCase();
            delete copySample.aspect;
            delete copySample.subject;
            realtimeUtils.attachAspectSubject(copySample, tu.db.Subject,
              tu.db.Aspect)
            .then((sample) => {
              expect(sample.name).equal(copySample.name);
              expect(sample.absolutePath).to.equal(sampleInstNA.absolutePath);
              done();
            })
            .catch(done);
          });

          it('same output with lower sample name', (done) => {
            const copySample = JSON.parse(JSON.stringify(sampleInstNA));
            copySample.name = copySample.name.toLowerCase();
            delete copySample.aspect;
            delete copySample.subject;
            realtimeUtils.attachAspectSubject(copySample, tu.db.Subject,
              tu.db.Aspect)
            .then((sample) => {
              expect(sample.name).equal(copySample.name);
              done();
            })
            .catch(done);
          });
        });
      });
    });
  });
});
