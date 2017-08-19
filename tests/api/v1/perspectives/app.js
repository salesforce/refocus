/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const getValuesObject = require('../../../../view/perspective/utils.js').getValuesObject;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe('tests/api/v1/perspectives/app.js, dropdown and modal data >', () => {
  let lensId;
  let perspectiveId;
  let perspectiveName;
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
      perspectiveName = createdPersp.name;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('basic get', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body).to.have.deep.property('[0].id');
      expect(res.body).to.have.deep.property(
        '[0].rootSubject', 'myMainSubject'
      );
      expect(res.body).to.have.deep.property('[0].lensId', lensId);
      expect(res.body[ZERO].aspectFilter).to.eql(['temperature', 'humidity']);
      expect(res.body[ZERO].aspectTagFilter).to.eql(['temp', 'hum']);
      expect(res.body[ZERO].subjectTagFilter).to.eql(['ea', 'na']);
      expect(res.body[ZERO].statusFilter).to.eql(['Critical', '-OK']);

      done();
    });
  });
});
