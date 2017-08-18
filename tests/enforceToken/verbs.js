/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/enforceToken/verbs.js
 *
 * Checks whether token-enforced path behaves as expected.
 */
const expect = require('chai').expect;
const constants = require('../../api/v1/constants');
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const u = require('../testUtils');
const registerPath = '/v1/register';
const { OK, CREATED, FORBIDDEN } = constants.httpStatus;

const STABLE_PATH = '/v1/subjects';
const NEW_SUBJECT = 'NEW_SUBJECT';

describe('tests/enforceToken/verbs.js, API verb token enforced tests', () => {
  it('GET docs without token should succeed', (done) => {
    api.get('/v1/docs/')
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  describe('CRUD should require tokens >', () => {
    let defaultToken;

    // before: create a resource with NO token should succeed
    before((done) => {
      api.post(registerPath)
      .send(u.fakeUserCredentials)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.token).to.be.defined;
        defaultToken = res.body.token;
        done();
      });
    });
    after(u.forceDeleteToken);

    describe('operation on existing resources >', () => {
      beforeEach((done) => {
        // post profile with token should pass
        api.post(STABLE_PATH)
        .set('Authorization', defaultToken)
        .send({ name: NEW_SUBJECT })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.name).to.equal(NEW_SUBJECT);
          done();
        });
      });

      afterEach(u.forceDeleteSubject);

      /**
       * Calls the specified path with different authentication
       * header to check response status
       *
       * @param {String} verb HTTP verb in lowercase
       * @param {String} path Relative url to resource
       * @param {Object} OBJ Object to send
       * @param {String} expectedSuccessStatus A successful http status
       */
      function testProtectedPath(verb, path, OBJ, expectedSuccessStatus) {
        const VERB = verb.toUpperCase();
        it(`${VERB} ${path} missing token returns FORBIDDEN`, (done) => {
          const call = api[verb](path);
          if (OBJ) {
            call.send(OBJ);
          }

          call
          .expect(FORBIDDEN)
          .expect(/No authorization token was found/)
          .end((err /* res */) => {
            if (err) {
              done(err);
            }

            done();
          });
        });

        it(`${VERB} ${path} wrong token provided returns FORBIDDEN`,
        (done) => {
          const call = api[verb](path);
          if (OBJ) {
            call.send(OBJ);
          }

          call
          .set('Authorization', `${defaultToken}xyz`)
          .expect(FORBIDDEN)
          .expect(/Invalid Token/)
          .end(done);
        });

        it(`${VERB} ${path} appropriate token returns OK`, (done) => {
          const call = api[verb](path);
          if (OBJ) {
            call.send(OBJ);
          }

          const expectedStatus = expectedSuccessStatus || OK;
          call
          .set('Authorization', defaultToken)
          .expect(expectedStatus)
          .end(done);
        });
      }

      testProtectedPath('get', STABLE_PATH + '/' + NEW_SUBJECT);
      testProtectedPath('post', STABLE_PATH + '/',
        { name: NEW_SUBJECT + NEW_SUBJECT + NEW_SUBJECT }, CREATED);
      testProtectedPath('patch', STABLE_PATH + '/' + NEW_SUBJECT,
        { name: NEW_SUBJECT + NEW_SUBJECT });
      testProtectedPath('put', STABLE_PATH + '/' + NEW_SUBJECT,
        { name: NEW_SUBJECT + NEW_SUBJECT });
      testProtectedPath('delete', STABLE_PATH + '/' + NEW_SUBJECT);
    });
  });
});
