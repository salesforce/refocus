/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/upsertBulkCaseSensitive.js
 */
'use strict';
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.db.Sample;
const path = '/v1/samples/upsert/bulk';

describe('tests/api/v1/samples/upsertBulkCaseSensitive.js, ' +
`POST ${path} >`, () => {
  const sampleName = `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`;
  let token;
  let subjectId = '';
  let aspectId = '';

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then((aspectOne) => {
      aspectId = aspectOne.id;
      return Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      });
    })
    .then((subject) => {
      subjectId = subject.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('when sample EXISTS >', () => {
    beforeEach((done) => {
      Sample.create({
        subjectId,
        aspectId: aspectId,
      })
      .then(() => done())
      .catch(done);
    });

    it('different case name should NOT modify sample name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send([
        {
          name: sampleName.toLowerCase(),
          value: '6',
        },
      ])
      .then(() => {
        setTimeout(() => {
          api.get('/v1/samples?name=' + sampleName)
          .set('Authorization', token)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body).to.have.length(1);
            expect(res.body[0].name).to.equal(sampleName);
            done();
          });
        }, 100);
      });
    });
  });

  describe('when sample DOES NOT exist >', () => {
    it('different case name should NOT modify sample name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send([
        {
          name: sampleName.toLowerCase(),
          value: '6',
        },
      ])
      .then(() => {

        /*
         * the bulk api is asynchronous. The delay is used to give sometime for
         * the upsert operation to complete
         */
        setTimeout(() => {
          api.get('/v1/samples?name=' + sampleName)
          .set('Authorization', token)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body).to.have.length(1);
            expect(res.body[0].name).to.equal(sampleName);
            done();
          });
        }, 100);
      });
    });
  });
});
