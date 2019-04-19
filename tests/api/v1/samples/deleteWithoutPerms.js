/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/deleteWithoutPerms.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Sample = tu.Sample;
const User = tu.db.User;
const path = '/v1/samples';
const deleteAllRelLinkPath = '/v1/samples/{key}/relatedLinks';
const deleteOneRelLinkPath = '/v1/samples/{key}/relatedLinks/{akey}';
const Op = require('sequelize').Op;

describe('tests/api/v1/samples/deleteWithoutPerms.js >', () => {
  let sampleName;
  let otherValidToken;
  let user;

  before((done) => {
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
      return u.createBasic();
    })
    .then((samp) => {
      sampleName = samp.name;
      const aspectName = sampleName.split('|')[1].toLowerCase();
      return Aspect.findOne({ where: { name: { [Op.iLike]: aspectName } } });
    })
    .then((asp) => asp.addWriters(user))
    .then(() => done())
    .catch(done);
  });

  before(u.populateRedis);
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('deleting sample without permission should return 403', (done) => {
    api.delete(`${path}/${sampleName}`)
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('403 for deleting relatedLinks without permission', (done) => {
    api.delete(deleteOneRelLinkPath.replace('{key}', sampleName)
      .replace('{akey}', 'rlink0'))
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('403 for deleting all the relatedLinks without permission', (done) => {
    api.delete(deleteAllRelLinkPath.replace('{key}', sampleName))
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });
});
