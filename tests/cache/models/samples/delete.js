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
const u = require('./utils');
const allDeletePath = '/v1/samples/{key}/relatedLinks';
const oneDeletePath = '/v1/samples/{key}/relatedLinks/{akey}';
const samstoinit = require('../../../../cache/sampleStoreInit');
const Sample = tu.db.Sample;
const ZERO = 0;

describe('tests/cache/models/samples/delete.js >', () => {
  describe(`api: redisStore: DELETE ${path} >`, () => {
    const sampleName = '___Subject1.___Subject2|___Aspect1';
    let token;

    before((done) => {
      tu.toggleOverride('enableRedisSampleStore', true);
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach(rtu.populateRedis);
    afterEach(rtu.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride('enableRedisSampleStore', false));

    it('basic delete', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        if (tu.gotExpectedLength(res.body, ZERO)) {
          throw new Error('expecting sample');
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

    it('returns aspectId, subjectId, and aspect object', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.aspect).to.be.an('object');
        expect(tu.looksLikeId(res.body.aspectId)).to.be.true;
        expect(tu.looksLikeId(res.body.subjectId)).to.be.true;
        done();
      });
    });

    it('does not return id', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(sampleName);
        done();
      });
    });

    it('does not return isDeleted field', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.isDeleted).to.equal(undefined);
        done();
      });
    });

    it('createdAt and updatedAt fields have the expected format', (done) => {
      api.delete(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const { updatedAt, createdAt } = res.body;
        expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
        expect(createdAt).to.equal(new Date(createdAt).toISOString());
        done();
      });
    });

    it('is case in-sensitive', (done) => {
      api.delete(`${path}/${sampleName.toLowerCase()}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(sampleName);
        done();
      });
    });
  });

  describe('api: redisStore: samples: DELETE RelatedLinks >', () => {
    let token;
    let sampleName;

    before((done) => {
      tu.toggleOverride('enableRedisSampleStore', true);
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      u.doSetup()
      .then((samp) => {
        samp.relatedLinks = [
          {
            name: 'rlink0',
            url: 'https://samples.com',
          },
          {
            name: 'rlink1',
            url: 'https://samples.com',
          },
        ];
        return Sample.create(
          samp
        );
      })
      .then((samp) => {
        sampleName = samp.name;
        return samstoinit.eradicate();
      })
      .then(() => samstoinit.init())
      .then(() => done())
      .catch(done);
    });

    afterEach(rtu.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride('enableRedisSampleStore', false));

    it('delete all related links', (done) => {
      api.delete(allDeletePath.replace('{key}', sampleName))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.relatedLinks).to.have.length(ZERO);
        done();
      });
    });

    it('delete one relatedLink', (done) => {
      api.delete(
        oneDeletePath.replace('{key}', sampleName).replace('{akey}', 'rlink0')
      )
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(1);
        expect(res.body.relatedLinks)
          .to.have.deep.property('[0].name', 'rlink1');
      })
      .end(done);
    });

    it('delete related link by name', (done) => {
      api.delete(oneDeletePath.replace('{key}', sampleName)
        .replace('{akey}', 'rlink0'))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(1);
        expect(res.body.relatedLinks)
        .to.have.deep.property('[0].name', 'rlink1');
      })
      .end(done);
    });
  });
});
