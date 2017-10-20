/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/deleteWithoutPerms.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const samstoinit = require('../../../../cache/sampleStoreInit');
const rtu = require('../redisTestUtil');
const Sample = tu.db.Sample;
const User = tu.db.User;
const path = '/v1/samples';
const deleteAllRelLinkPath = '/v1/samples/{key}/relatedLinks';
const deleteOneRelLinkPath = '/v1/samples/{key}/relatedLinks/{akey}';

describe('tests/cache/models/samples/deleteWithoutPerms.js, ' +
'api: DELETE Sample without permission >', () => {
  let sampleName;
  let otherValidToken;
  let user;

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then(() => tu.createUser('myUniqueUser'))
    .then((usr) => tu.createTokenFromUserName(usr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      done();
    })
    .catch(done);
  });

  before((done) => {
    User.findOne({ where: { name: tu.userName } })
    .then((usr) => {
      user = usr;
      return u.doSetup();
    })
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      sampleName = samp.name;
      return samp.getAspect();
    })
    .then((asp) => asp.addWriters(user))
    .then(() => samstoinit.populate())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('deleting sample without permission should return 403', (done) => {
    api.delete(`${path}/${sampleName}`)
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('403 for deleting relatedLinks without permission', (done) => {
    api.delete(
      deleteOneRelLinkPath.replace('{key}', sampleName)
      .replace('{akey}', 'rlink0')
    )
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('403 for deleting all the relatedLinks without permission', (done) => {
    api.delete(
      deleteAllRelLinkPath.replace('{key}', sampleName)
    )
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });
});
