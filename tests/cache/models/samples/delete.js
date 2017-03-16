/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/delete.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1/samples';
const rtu = require('../redisTestUtil');
const redisOps = require('../../../../cache/redisOps');
const objectType = require('../../../../cache/sampleStore')
                    .constants.objectType;
const expect = require('chai').expect;
const ZERO = 0;

describe(`api: redisStore: DELETE ${path}`, () => {
  const sampleName = '___Subject1.___Subject2|___Aspect1';
  let token;

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach(rtu.populateRedis);
  afterEach(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('basic delete', (done) => {
    api.delete(`${path}/${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, ZERO)) {
        throw new Error('expecting sample');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      const subjAspArr = sampleName.toLowerCase().split('|');

      const cmds = [];
      cmds.push(redisOps.getHashCmd(objectType.sample, sampleName));
      cmds.push(redisOps.keyExistsInIndexCmd(objectType.sample, sampleName));
      cmds.push(redisOps.aspExistsInSubjSetCmd(subjAspArr[0], subjAspArr[1]));

      redisOps.executeBatchCmds(cmds)
      .then((response) => {
        expect(response[0]).to.be.equal(null);
        expect(response[1]).to.be.equal(0);
        expect(response[2]).to.be.equal(0);
      });
      done();
    });
  });

  it('does not return id', (done) => {
    api.delete(`${path}/${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.equal(sampleName);
      done();
    });
  });

  it('is case in-sensitive', (done) => {
    api.delete(`${path}/${sampleName.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.equal(sampleName);
      done();
    });
  });
});

