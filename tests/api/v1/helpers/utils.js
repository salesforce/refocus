/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/helpers/utils.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const adminUser = require('../../../../config').db.adminUser;
const Subject = tu.db.Subject;
const expect = require('chai').expect;
const apiUtils = require('../../../../api/v1/helpers/verbs/utils.js');

describe('tests/api/v1/helpers/utils.js >', () => {
  const subjects = {
    na: {},
    eu: {},
  };
  const na = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
  };
  const eu = {
    name: `${tu.namePrefix}Europe`,
    description: 'continent',
  };
  let regularUser;
  let regularUserToken;
  let secondUser;
  let adminUserToken;

  before((done) => {
    tu.createUserAndToken()
      .then((ut) => {
        regularUser = ut.user;
        regularUserToken = ut.token;
      })
      .then(() => tu.createSecondUser())
      .then((u2) => {
        secondUser = u2;
      })
      .then(() => tu.createAdminToken())
      .then((a) => {
        adminUserToken = a;
      })
      .then(() => Subject.bulkCreate([na, eu]))
      .then((created) => {
        subjects.na = created[0];
        subjects.eu = created[1];
      })
      .then(() => subjects.eu.addWriter(regularUser))
      .then(() => done())
      .catch(done);
  });

  after(tu.forceDeleteSubject);
  after(tu.forceDeleteUser);

  describe('isWritable >', () => {
    describe('object has no writers >', () => {
      it('with req object containing username', (done) => {
        const fakeReq = { user: { name: 'myUserName' } };
        apiUtils.isWritable(fakeReq, subjects.na)
          .then((ok) => {
            expect(ok).to.equal(subjects.na);
            done();
          })
          .catch(done);
      });

      it('req object does not contain the user', (done) => {
        const fakeReq = {};
        apiUtils.isWritable(fakeReq, subjects.na)
          .then((ok) => {
            expect(ok).to.equal(subjects.na);
            done();
          })
          .catch(done);
      });
    });

    describe('object has writer >', () => {
      it('authorized user is authorized', (done) => {
        const fakeReq = { user: { name: regularUser.name } };
        apiUtils.isWritable(fakeReq, subjects.eu)
          .then((w) => done())
          .catch((err) => done(err));
      });

      it('regular user not authorized', (done) => {
        const fakeReq = { user: { name: secondUser.name } };
        apiUtils.isWritable(fakeReq, subjects.eu)
          .then((w) => {
            done(new Error('expecting ForbiddenError'));
          })
          .catch((err) => {
            expect(err).to.have.property('status', 403);
            expect(err).to.have.property('name', 'ForbiddenError');
            done();
          });
      });

      it('admin user not authorized', (done) => {
        const fakeReq = {
          user: { name: adminUser },
          headers: {
            IsAdmin: true,
          },
        };
        apiUtils.isWritable(fakeReq, subjects.eu)
          .then((w) => {
            done(new Error('expecting ForbiddenError'));
          })
          .catch((err) => {
            expect(err).to.have.property('status', 403);
            expect(err).to.have.property('name', 'ForbiddenError');
            done();
          });
      });

      it('regular user not authorized even if query has override=admin',
        (done) => {
          const fakeReq = {
            user: { name: secondUser.name },
            query: { override: 'admin' },
          };
          apiUtils.isWritable(fakeReq, subjects.eu)
            .then((w) => {
              done(new Error('expecting ForbiddenError'));
            })
            .catch((err) => {
              expect(err).to.have.property('status', 403);
              expect(err).to.have.property('name', 'ForbiddenError');
              done();
            });
        });

      it('admin user not authorized when query has bad override param',
        (done) => {
          const fakeReq = {
            user: { name: adminUser },
            headers: { IsAdmin: true },
            query: { override: true },
          };
          apiUtils.isWritable(fakeReq, subjects.eu)
            .then((w) => {
              done(new Error('expecting ForbiddenError'));
            })
            .catch((err) => {
              expect(err).to.have.property('status', 403);
              expect(err).to.have.property('name', 'ForbiddenError');
              done();
            });
        });

      it('admin user is authorized when query has override=admin', (done) => {
        const fakeReq = {
          user: { name: adminUser },
          headers: {
            IsAdmin: true,
          },
          query: { override: 'admin' },
        };
        apiUtils.isWritable(fakeReq, subjects.eu)
          .then((w) => done())
          .catch((err) => done(err));
      });
    });
  });
});
