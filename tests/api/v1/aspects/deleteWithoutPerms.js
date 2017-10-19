/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/deleteWithoutPerms.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const User = tu.db.User;
const deleteOneRelLink = '/v1/aspects/{key}/relatedLinks/{akey}';
const deleteOneTag = '/v1/aspects/{key}/tags/{akey}';
const path = '/v1/aspects/{key}';

describe('tests/api/v1/aspects/deleteWithoutPerms.js >', () => {
  // let token;
  let i;
  let aspect;
  let otherValidToken;

  // let user;

  const n = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    relatedLinks: [
      { name: 'rlink0', url: 'https://samples.com' },
      { name: 'rlink1', url: 'https://samples.com' },
    ],
    tags: ['tag0', 'tag1'],
  };

  before((done) => {
    tu.createToken()
    .then(() => done())
    .catch(done);
  });

  before((done) => {
    Aspect.create(n)
    .then((asp) => {
      i = asp.id;
      aspect = asp;
    })
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => aspect.addWriter(usr))
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

  it('403 deleting aspect without permission', (done) => {
    api.delete(path.replace('{key}', i))
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('403 deleting relatedlinks without permission', (done) => {
    api.delete(deleteOneRelLink.replace('{key}', i).replace('{akey}', 'rlink0'))
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });
  it('403 deleting tags without permission', (done) => {
    api.delete(deleteOneTag.replace('{key}', i).replace('{akey}', 'tag0'))
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });
});

