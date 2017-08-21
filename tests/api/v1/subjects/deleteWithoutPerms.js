/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/deleteWithoutPerms.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const User = tu.db.User;
const path = '/v1/subjects';
const deleteSubjectTag = '/v1/subjects/{key}/tags';
const deleteSubjectRelLink = '/v1/subjects/{key}/relatedLinks';

describe('tests/api/v1/subjects/deleteWithoutPerms.js >', () => {
  let subject;
  let otherValidToken;
  let user;
  const n = { name: `${tu.namePrefix}NorthAmerica` };

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
      return Subject.create(n);
    })
    .then((subj) => {
      subject = subj;
    })
    .then(() => subject.addWriters(user))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('deleting subject without permission should return 403', (done) => {
    api.delete(`${path}/${subject.id}`)
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('403 for deleting relatedLinks without permission', (done) => {
    api.delete(
      deleteSubjectRelLink.replace('{key}', subject.id)
      .replace('{akey}', 'rlink0')
    )
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('403 for deleting the tags without permission', (done) => {
    api.delete(
      deleteSubjectTag.replace('{key}', subject.id)
    )
    .set('Authorization', otherValidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });
});
