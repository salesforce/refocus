/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/post.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/aspects';
const expect = require('chai').expect;

describe(`api: POST ${path}`, () => {
  let token;
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('OK', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  describe('post aspect with Tags', () => {
    it('post aspect with tags', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}HeartRate`,
        timeout: '110s',
      };
      const tags = ['___na','___continent'];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.tags).to.have.length(tags.length);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }
        done();
      });
    });
    it('cannot post aspect with tags names starting with -', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}HeartRate`,
        timeout: '110s',
      };
      const tags = ['-___na', '___continent'];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body).to.property('errors');
        expect(res.body.errors[0].type)
          .to.equal(tu.schemaValidationErrorName);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }
        done();
      });
    });
    it('posting aspect with duplicate tags', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Pressure`,
        timeout: '110s',
      };
      const tags = ['___na', '___na'];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect((res) => {
        expect(res.body.tags).to.have.length(1);
        expect(res.body.tags).to.include.members(tags);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }
        done();
      });
    });

    it('post aspect with tags of size zero', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
      };
      const tags = [];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.tags).to.have.length(tags.length);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });
});
