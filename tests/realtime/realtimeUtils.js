/**
 * tests/realtime/realtimeUtils.js
 */
'use strict';

const expect = require('chai').expect;
const realtimeUtils = require('../../realtime/utils');
const tu = require('../testUtils');
const u = require('./utils');

describe('realtime utils Tests:', () => {
  const newSubject = {
    absolutePath: 'NA.US.CA.SF',
    name: 'SF',
  };

  const updatedSubject = {
    new: {
      absolutePath: 'NA.US.CA.SF',
      name: 'SF',
      helpurl: 'helpme.com'
    },
    old: {
      absolutePath: 'NA.US.CA.SF',
      name: 'SF',
      helpurl: ''
    },
  };

  const looksLikeSampleObjNA = {
    value: '10',
    name: 'NA|temperature',
    absolutePath: 'NA',
    status: 'OK',
    aspect: {
      name: 'temperature',
      tags: [
          { name: 'temp' },
      ]
    },
    subject: {
      tags: [
          { name: 'ea' },
      ],
    }
  };
  const looksLikeSampleObjNAUS = {
    value: '1',
    name: 'NA.US|temperature',
    absolutePath: 'NA.US',
    status: 'INVALID',
    aspect: {
      name: 'temperature',
      tags: [
          { name: 'temp' },
      ]
    },
    subject: {
      tags: [
          { name: 'ea' },
      ],
    }
  };
  const rootSubjNAUS = 'NA.US';
  const rootSubjNA = 'NA';
  const rootSubjNAUSCA = 'NA.US.CA';

  let persRootNAUS;
  let persRootNA;
  let persRootNAUSCA;

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
        aspectTagFilter: ['temp', 'hum'],
        subjectTagFilter: ['ea', 'na'],
        statusFilter: ['OK'],
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
    })
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  describe('utility function tests', () => {
    describe('shouldIEmitThisObject functon tests', () => {
      it('should return false for some randomSubjectRoot', () => {
        const nspString = '/SomRadomSubjectRoo';
        expect(realtimeUtils.shouldIEmitThisObj(nspString, rootSubjNAUS))
          .to.equal(false);
      });
      it('should return true for pers rootNA', () => {
        const nspString = realtimeUtils.getNamespaceString(persRootNA);
        expect(realtimeUtils
          .shouldIEmitThisObj(nspString, looksLikeSampleObjNA))
          .to.equal(true);
      });
      it('should return true for pers rootNAUS', () => {
        const nspString = realtimeUtils.getNamespaceString(persRootNAUS);
        expect(realtimeUtils.shouldIEmitThisObj(nspString,
          looksLikeSampleObjNAUS)).to.equal(true);
      });
    });

    describe('getNamespaceString tests', () => {
      it('for perspective persNAUS', () => {
        const nspString = realtimeUtils.getNamespaceString(persRootNAUS);
        expect(nspString).to.equal('/NA.US&INCLUDE&INCLUDE&INCLUDE&INCLUDE');
      });
      it('for perspective persNA', () => {
        const nspString = realtimeUtils.getNamespaceString(persRootNA);
        expect(nspString)
          .to.equal('/NA&INCLUDE=temperature;humidity&INCLUDE=ea;na' +
            '&INCLUDE=temp;hum&INCLUDE=OK');
      });
      it('for perspective persNAUSCA', () => {
        const nspString = realtimeUtils.getNamespaceString(persRootNAUSCA);
        expect(nspString)
          .to.equal('/NA.US.CA&INCLUDE=temperature;humidity' +
                                  '&INCLUDE&INCLUDE&INCLUDE=OK');
      });
    });
    describe('parseObject tests', () => {
      it('parse updated object', () => {
        const obj = realtimeUtils.parseObject(newSubject);
        expect(obj.hasOwnProperty('new')).to.equal(false);
      });
      it('parse newObject', () => {
        const obj = realtimeUtils.parseObject(updatedSubject);
        expect(obj.hasOwnProperty('new')).to.equal(false);
      });
    });
  });
});
