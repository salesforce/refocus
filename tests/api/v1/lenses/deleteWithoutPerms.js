/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/deleteWithoutPerms.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const User = tu.db.User;
const u = require('./utils');
const path = '/v1/lenses';

describe('tests/api/v1/lenses/deleteWithoutPerms.js >', () => {
  let lens;
  let otherValidToken;

  before((done) => {
    tu.createToken()
    .then(() => done())
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((lns) => {
      lens = lns;
    })
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => lens.addWriter(usr))
    .then(() => tu.createUser('myUNiqueUser22'))
    .then((fusr) => tu.createTokenFromUserName(fusr.name))
    .then((tkn) => {
      otherValidToken = tkn;
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('deleting a lens without permission is forbidden', (done) => {
    api.delete(`${path}/${lens.id}`)
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });
});
