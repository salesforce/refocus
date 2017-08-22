/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/put.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;

describe('tests/api/v1/lenses/put.js >', () => {
  let lensId;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((lens) => {
      lensId = lens.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('update name to different case', (done) => {
    const newName = u.name.toLowerCase();
    api.put(`${path}/${lensId}`)
    .set('Authorization', token)
    .field('name', newName)
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(newName);
      done();
    });
  });

  it('update description', (done) => {
    api.put(`${path}/${lensId}`)
    .set('Authorization', token)
    .field('description', 'changed description')
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.description).to.equal('changed description');
      done();
    });
  });

  it('isPublished set to default', (done) => {
    api.put(`${path}/${lensId}`)
    .set('Authorization', token)
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.isPublished).to.not.be.true;
      done();
    });
  });

  it('name overwritten by sourceName', (done) => {
    api.put(`${path}/${lensId}`)
    .set('Authorization', token)
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(res.body.sourceName);
      done();
    });
  });
});
