/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/helpers/aspectUtils.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../testUtils');
const u = require('../model/aspect/utils');
const aspectUtils = require('../../../db/helpers/aspectUtils');
const Aspect = tu.db.Aspect;

/**
 * aspect json object
 * @return {Object} aspect json object
 */
function getAspectJson() {
  return JSON.parse(JSON.stringify({
    name: `${tu.namePrefix}TestAspect`,
    description: 'This is an awesome aspect I\'m testing here',
    helpEmail: 'jolson@dailyplanet.com',
    helpUrl: 'http://www.dailyplanet.com',
    isPublished: true,
    timeout: '10m',
    valueLabel: 'ms',
    valueType: aspectUtils.aspValueTypes.boolean,
  }));
}

describe('tests/db/model/aspect/aspectUtils.js >', () => {
  afterEach(u.forceDelete);

  describe('validateAspectStatusRanges >', () => {
    it('ok, aspect valueType=boolean, valid status ranges', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [0, 0];
      aspToCreate.okRange = [1, 1];
      aspToCreate.valueType = aspectUtils.aspValueTypes.boolean;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('not ok, aspect valueType=boolean, duplicate status ranges', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [0, 0];
      aspToCreate.okRange = [0, 0];
      aspToCreate.valueType = aspectUtils.aspValueTypes.boolean;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done('Expecting error');
      } catch (err) {
        const msg = 'Same value range to multiple statuses is not allowed for ' +
        'value type: BOOLEAN';
        expect(err.name).to.be.equal('InvalidAspectStatusRange');
        expect(err.message).to.be.equal(msg);
        done();
      }
    });

    it('not ok, aspect valueType=boolean, >2 status set', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [1, 1];
      aspToCreate.okRange = [0, 0];
      aspToCreate.infoRange = [1, 1];
      aspToCreate.valueType = aspectUtils.aspValueTypes.boolean;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done('Expecting error');
      } catch (err) {
        const msg = 'More than 2 status ranges cannot be assigned for value ' +
        'type: BOOLEAN';
        expect(err.name).to.be.equal('InvalidAspectStatusRange');
        expect(err.message).to.be.equal(msg);
        done();
      }
    });

    it('not ok, aspect valueType=boolean, invalid status ranges', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [1, 0];
      aspToCreate.okRange = [0, 0];
      aspToCreate.valueType = aspectUtils.aspValueTypes.boolean;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done('Expecting error');
      } catch (err) {
        const msg = 'Value type: BOOLEAN can only have ranges: [0,0] or [1,1]';
        expect(err.name).to.be.equal('InvalidAspectStatusRange');
        expect(err.message).to.be.equal(msg);
        done();
      }
    });

    it('ok, aspect valueType=numeric, valid status ranges', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [-1234, -123];
      aspToCreate.warningRange = [-122, 0];
      aspToCreate.infoRange = [0, 5678];
      aspToCreate.okRange = [5679, 56789];
      aspToCreate.valueType = aspectUtils.aspValueTypes.numeric;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('ok, aspect valueType=numeric, some statuses undefined', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [-1234, -123];
      aspToCreate.warningRange = [-122, 0];
      delete aspToCreate.infoRange;
      delete aspToCreate.okRange;
      aspToCreate.valueType = aspectUtils.aspValueTypes.numeric;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('ok, aspect valueType=numeric, same/overlapping statuses', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [-1234, -123];
      aspToCreate.warningRange = [-1234, -123];
      aspToCreate.infoRange = [0, 5678];
      aspToCreate.okRange = [5678, 56789];
      aspToCreate.valueType = aspectUtils.aspValueTypes.numeric;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('not ok, aspect valueType=numeric, invalid status ranges', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [Number.MIN_SAFE_INTEGER - 5, -123];
      aspToCreate.warningRange = [-122, 0];
      aspToCreate.infoRange = [0, 5678];
      aspToCreate.okRange = [5678, Number.MAX_SAFE_INTEGER + 10];
      aspToCreate.valueType = aspectUtils.aspValueTypes.numeric;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done('Expecting error');
      } catch (err) {
        const msg = 'Value type: NUMERIC can only have ranges with ' +
        'min value: -9007199254740991, max value: 9007199254740991';
        expect(err.name).to.be.equal('InvalidAspectStatusRange');
        expect(err.message).to.be.equal(msg);
        done();
      }
    });

    it('ok, aspect valueType=percent, valid status ranges', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [0, 20];
      aspToCreate.warningRange = [21, 40];
      aspToCreate.infoRange = [41, 50];
      aspToCreate.okRange = [51, 100];
      aspToCreate.valueType = aspectUtils.aspValueTypes.percent;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('ok, aspect valueType=percent, some statuses undefined', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [0, 10];
      aspToCreate.warningRange = [20, 50];
      delete aspToCreate.infoRange;
      delete aspToCreate.okRange;
      aspToCreate.valueType = aspectUtils.aspValueTypes.percent;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('ok, aspect valueType=percent, same/overlapping statuses', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [0, 60];
      aspToCreate.okRange = [50, 80];
      aspToCreate.valueType = aspectUtils.aspValueTypes.percent;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done();
      } catch (err) {
        done(err);
      }
    });

    it('not ok, aspect valueType=percent, invalid status ranges', (done) => {
      const aspToCreate = getAspectJson();
      aspToCreate.criticalRange = [-1, 1];
      aspToCreate.okRange = [0, 110];
      aspToCreate.valueType = aspectUtils.aspValueTypes.percent;

      const aspInst = Aspect.build(aspToCreate);
      try {
        aspectUtils.validateAspectStatusRanges(aspInst);
        done('Expecting error');
      } catch (err) {
        const msg = 'Value type: PERCENT can only have ranges with ' +
        'min value: 0, max value: 100';
        expect(err.name).to.be.equal('InvalidAspectStatusRange');
        expect(err.message).to.be.equal(msg);
        done();
      }
    });
  });
});
