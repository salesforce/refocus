/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/postWithCreatedBy.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generators';
const expect = require('chai').expect;

describe('tests/api/v1/generators/postWithCreatedBy.js >', () => {
  let token;
  let user;

  const generatorToCreate = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  u.createSGtoSGTMapping(generatorTemplate, generatorToCreate);

  before((done) => {
    tu.toggleOverride('returnUser', true);
    tu.createUserAndToken()
    .then((obj) => {
      token = obj.token;
      user = obj.user;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(u.createGeneratorAspects())
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('returnUser', false));

  it('toggle returnUser on, createdBy and user fields returned', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(generatorToCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.createdBy).to.equal(user.id);
      expect(res.body.user.name).to.equal(user.name);
      expect(res.body.user.email).to.equal(user.email);
      done();
    });
  });
});
