/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/getWithCacheEnabled.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;

describe(`api: GET ${path}`, () => {
  let lensId;
  let perspectiveId;
  let token;

  before((done) => {
    tu.toggleOverride('enableApiActivityLogs', true);
    tu.toggleOverride('enableCachePerspective', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      lensId = createdPersp.lensId;
      perspectiveId = createdPersp.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  after(() => tu.toggleOverride('enableApiActivityLogs', false));
  after(() => tu.toggleOverride('enableCachePerspective', false));


  it('basic get by id', (done) => {
    api.get(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((_err, _res) => {
      if (_err) {
        done(_err);
      }

      // get the same perspective again to hit the cache
      api.get(`${path}/${perspectiveId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }
        expect(res.body.name).to.equal(`${tu.namePrefix}testPersp`);
        expect(res.body.rootSubject).to.equal('myMainSubject');
        expect(res.body.lensId).to.equal(lensId);
        expect(res.body).to.have.property('lens');
        expect(res.body.aspectFilter).to.eql(['temperature', 'humidity']);
        expect(res.body.aspectTagFilter).to.eql(['temp', 'hum']);
        expect(res.body.subjectTagFilter).to.eql(['ea', 'na']);
        expect(res.body.statusFilter).to.eql(['Critical', '-OK']);
        // done();
      });
      done();
    });
  });
});
