/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/patch.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const User = tu.db.User;
const path = '/v1/samples';

describe(`api: PATCH ${path} without permission`, () => {
  let sampleName;
  let aspect;
  let otherValidToken;
  before((done) => {
    tu.toggleOverride('enforceWritePermission', true);
    tu.createToken()
    .then(() => {
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      sampleName = samp.name;
      return samp.getAspect();
    })
    .then((asp) => {
      aspect = asp;
      return User.findOne({ where: { name: tu.userName } });
    })
    .then((usr) => {
      return aspect.addWriter(usr);
    })
    .then(() => tu.createUser('myUNiqueUser'))
    .then((_usr) => tu.createTokenFromUserName(_usr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enforceWritePermission', false));

  describe('Patch without permission should fail', () => {
    it('single related link', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', otherValidToken)
      .send({
        value: '2',
        relatedLinks: [
          { name: 'link', url: 'https://samples.com' },
        ],
      })
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err /* , res */) => {
        return err ? done(err) : done();
      });
    });
  });
});
