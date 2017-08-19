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
'use strict';
const tu = require('../../../testUtils');
const Subject = tu.db.Subject;
const expect = require('chai').expect;
const apiUtils = require('../../../../api/v1/helpers/verbs/utils.js');

describe('tests/api/v1/helpers/utils.js >', () => {
  let token;
  let subject;
  let user;
  const na = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
  };
  before((done) => {
    Subject.create(na)
    .then((sub) => {
      subject = sub;
      return tu.createUser('myUNiqueUser');
    })
    .then((usr) => {
      user = usr;
      return tu.createTokenFromUserName(usr.name)
    })
    .then((tkn) => {
      token = tkn;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteSubject);
  after(tu.forceDeleteUser);
  describe('isWritable >', () => {
    it('return the instance no writers are added to the object', (done) => {
      const fakeReq = { headers: { authorization: token } };
      apiUtils.isWritable(fakeReq, subject)
      .then((ok) => {
        expect(ok).to.equal(subject);
        done();
      })
      .catch(done);
    });

    it('with req object containing username', (done) => {
      const fakeReq = { user: { name: 'myUserName' } };
      apiUtils.isWritable(fakeReq, subject)
      .then((ok) => {
        expect(ok).to.equal(subject);
        done();
      })
      .catch(done);
    });

    it('must throw an error for invalid tokens', (done) => {
      const fakeReq = { headers: { authorization: 'invalidtoken' } };
      apiUtils.isWritable(fakeReq, subject)
      .then(() => done(tu.malFormedTokenError))
      .catch((err) => {
        expect(err).to.not.equal('undefined');
        done();
      });
    });

    it('no token required if requireAccessToken is false and the resource is not' +
      ' write-protected', (done) => {
      tu.toggleOverride('requireAccessToken', false);
      const fakeReq = { headers: {} };
      apiUtils.isWritable(fakeReq, subject)
      .then((ok) => {
        expect(ok).to.equal(subject);
        done();
      })
      .catch(done);
    });

    it('token required if requireAccessToken is false and the resource is' +
      ' write-protected', (done) => {
      tu.toggleOverride('requireAccessToken', false);
      const fakeReq = { headers: {} };
      subject.addWriters([user])
      .then(() => apiUtils.isWritable(fakeReq, subject))
      .then(() => done('expecting error'))
      .catch((err) => {
        expect(err.name).to.equal('ForbiddenError');
        done();
      });
    });

  });

  describe('getUserNameFromToken >', () => {
    it('doDecode is true: should return the username', (done) => {
      const fakeReq = { headers: { authorization: token } };
      apiUtils.getUserNameFromToken(fakeReq)
      .then((ok) => {
        expect(ok).to.equal('___myUNiqueUser');
        done();
      })
      .catch(done);
    });

    it('with req object containing username', (done) => {
      const fakeReq = { user: { name: 'myUserName' } };
      apiUtils.getUserNameFromToken(fakeReq)
      .then((ok) => {
        expect(ok).to.equal('myUserName');
        done();
      })
      .catch(done);
    });

    it('must throw an error for invalid tokens', (done) => {
      const fakeReq = { headers: { authorization: 'invalidtoken' } };
      apiUtils.getUserNameFromToken(fakeReq)
      .then(() => done(tu.malFormedTokenError))
      .catch((err) => {
        expect(err).to.not.equal('undefined');
        done();
      });
    });
  });
});
