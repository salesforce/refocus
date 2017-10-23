/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/utils/jwtUtil.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const jwtUtil = require('../../utils/jwtUtil');
const tu = require('../testUtils');
const Bot = tu.db.Bot;
const n = `${tu.namePrefix}Testing`;
const User = tu.db.User;
const Profile = tu.db.Profile;
const Collector = tu.db.Collector;
const adminUser = require('../../config').db.adminUser;

describe('tests/utils/jwtUtil.js >', () => {
  const newBot = {
    name: n,
    url: 'http://www.bar.com',
    active: true,
  };

  let userInst;
  let collectorInst;
  let userToken;
  let collectorToken;
  const testStartTime = new Date();

  const predefinedAdminUserToken = jwtUtil.createToken(
      adminUser.name, adminUser.name
  );

  // dummy callback that returns a promise.
  const dummyCallback = function dummy () {
    return new Promise((resolve) => {
      resolve(true);
    });
  };

  before((done) => {
    Profile.create({ name: tu.namePrefix + 'myProfile' })
    .then((createdProfile) => User.create({
      email: 'testToken@refocus.com',
      profileId: createdProfile.id,
      name: `${tu.namePrefix}myRefocusUser`,
      password: 'abcd',
    }))
    .then((user) => {
      userInst = user;
      return Collector.create({
        name: 'myCollector',
        version: '1.0.0',
        createdBy: user.id,
      });
    })
    .then((collector) => {
      collectorInst = collector;
      return tu.createTokenFromUserName(userInst.name);
    })
    .then((token) => {
      userToken = token;
      return tu.createTokenFromUserName(collectorInst.name);
    })
    .then((token) => {
      collectorToken = token;
      done();
    });
  });

  after((done) => {
    tu.forceDelete(tu.db.User, testStartTime)
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.Collector, testStartTime))
    .then(() => done())
    .catch(done);
  });

  it('ok, bot verified', (done) => {
    Bot.create(newBot)
    .then((o) => {
      const token = jwtUtil.createToken(o.name, o.name);
      jwtUtil.verifyBotToken(token).then((check) => {
        expect(check).to.not.equal(undefined);
      });
    })
    .then(() => tu.forceDelete(tu.db.Bot, testStartTime))
    .then(() => done())
    .catch(done);
  });

  it('ok, bot failed', (done) => {
    const randomToken = jwtUtil.createToken('failure', 'failure');
    jwtUtil.verifyBotToken(randomToken)
    .then((check) => {
      expect(check).to.equal(null);
    })
    .then(() => done());
  });

  describe('verifyToken tests', () => {
    it('verifyCollectorToken and make sure the request header has ' +
      'info attached', (done) => {
      const request = {
        headers: { },
        session: { },
      };
      request.headers.authorization = collectorToken;
      jwtUtil.verifyToken(request, dummyCallback)
      .then(() => {
        expect(request.headers.UserName).to.equal(collectorInst.name);
        expect(request.headers.ProfileName).to.equal('');
        expect(request.headers.TokenName).to.equal(collectorInst.name);
        expect(request.headers.IsAdmin).to.equal(false);
        expect(request.headers.IsBot).to.equal(false);
        expect(request.headers.IsCollector).to.equal(true);
        return done();
      }).catch(done);
    });

    it('verifyUserToken with admin user and make sure the request header has ' +
      'info attached', (done) => {
      const request = {
        headers: { },
        session: { },
      };
      request.headers.authorization = predefinedAdminUserToken;
      jwtUtil.verifyToken(request, dummyCallback)
      .then(() => {
        expect(request.headers.UserName).to.equal(adminUser.name);
        expect(request.headers.ProfileName).to.equal('Admin');
        expect(request.headers.TokenName).to.equal(adminUser.name);
        expect(request.headers.IsAdmin).to.equal(true);
        expect(request.headers.IsBot).to.equal(false);
        expect(request.headers.IsCollector).to.equal(false);
        return done();
      }).catch(done);
    });

    it('verifyToken with token added to session object', (done) => {
      const request = {
        headers: { },
        session: { },
      };
      request.session.token = userToken;
      jwtUtil.verifyToken(request, dummyCallback)
      .then(() => {
        expect(request.headers.UserName).to.equal(userInst.name);
        expect(request.headers.ProfileName).to.equal('___myProfile');
        expect(request.headers.TokenName).to.equal('___myRefocusUser');
        expect(request.headers.IsAdmin).to.equal(false);
        expect(request.headers.IsBot).to.equal(false);
        expect(request.headers.IsCollector).to.equal(false);
        return done();
      }).catch(done);
    });

    it('verifyToken with invalid token', (done) => {
      const request = {
        headers: { },
        session: { },
      };
      request.headers.authorization = 'invalid';
      jwtUtil.verifyToken(request, dummyCallback)
      .then(() => {
        expect(Object.keys(request.headers)).to.deep.equal(['authorization']);
        expect(request.headers.UserName).to.equal(undefined);
        expect(request.headers.ProfileName).to.equal(undefined);
        expect(request.headers.TokenName).to.equal(undefined);
        return done();
      }).catch(done);
    });
  });
});
