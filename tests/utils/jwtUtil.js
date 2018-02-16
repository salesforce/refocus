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
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const jwtVerifyAsync = Promise.promisify(jwt.verify);
const conf = require('../../config');
const adminUser = require('../../config').db.adminUser;
const adminProfile = require('../../config').db.adminProfile;
const secret = conf.environment[conf.nodeEnv].tokenSecret;
const Bot = tu.db.Bot;
const n = `${tu.namePrefix}Testing`;
const User = tu.db.User;
const Profile = tu.db.Profile;
const Collector = tu.db.Collector;


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
  let profile;
  const testStartTime = new Date();

  const predefinedAdminUserToken = tu.createAdminToken();

  // dummy callback that returns a promise.
  const dummyCallback = function dummy () {
    return new Promise((resolve) => {
      resolve(true);
    });
  };

  before((done) => {
    Profile.create({ name: tu.namePrefix + 'myProfile' })
    .then((createdProfile) => {
      profile = createdProfile;
      return User.create({
        email: 'testToken@refocus.com',
        profileId: createdProfile.id,
        name: `${tu.namePrefix}myRefocusUser`,
        password: 'abcd',
      });
    })
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
      return jwtUtil.createToken(
        userInst.name,
        userInst.name,
        { IsAdmin: false, ProfileName: profile.name }
      );
    })
    .then((token) => {
      userToken = token;
      return jwtUtil.createToken(
        collectorInst.name, collectorInst.name, { IsCollector: true }
      );
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

    it('verifyUserToken - a header with default value - true, and ' +
      'token with that header value false - false should be set in req',
    (done) => {
      jwtUtil.headersWithDefaults.newBooleanHeader = true;
      const dummyToken = jwtUtil.createToken(
        'myTokenName', userInst.name,
        { newBooleanHeader: false, IsCollector: true }
      );
      const request = {
        headers: { },
        session: { },
      };
      request.headers.authorization = dummyToken;
      jwtUtil.verifyToken(request, dummyCallback)
      .then(() => {
        expect(request.headers.UserName).to.equal(userInst.name);
        expect(request.headers.ProfileName).to.equal(profile.name);
        expect(request.headers.TokenName).to.equal('myTokenName');
        expect(request.headers.IsAdmin).to.equal(false);
        expect(request.headers.IsBot).to.equal(false);
        expect(request.headers.IsCollector).to.equal(true);
        expect(request.headers.newBooleanHeader).to.equal(false);
        return done();
      }).catch(done);
    });

    it('verifyUserToken - non admin user - no ProfileName or IsAdmin in ' +
      'token, both should be set in req', (done) => {
      const dummyToken = jwtUtil.createToken('myTokenName', userInst.name);

      const request = {
        headers: { },
        session: { },
      };
      request.headers.authorization = dummyToken;
      jwtUtil.verifyToken(request, dummyCallback)
      .then(() => {
        expect(request.headers.UserName).to.equal(userInst.name);
        expect(request.headers.ProfileName).to.equal(profile.name);
        expect(request.headers.TokenName).to.equal('myTokenName');
        expect(request.headers.IsAdmin).to.equal(false);
        expect(request.headers.IsBot).to.equal(false);
        expect(request.headers.IsCollector).to.equal(false);
        return done();
      }).catch(done);
    });

    it('verifyUserToken - admin user - no ProfileName or IsAdmin in ' +
      'token, both should be set in req', (done) => {
      const dummyToken = jwtUtil.createToken('myTokenName', adminUser.name);

      const request = {
        headers: { },
        session: { },
      };
      request.headers.authorization = dummyToken;
      jwtUtil.verifyToken(request, dummyCallback)
      .then(() => {
        expect(request.headers.UserName).to.equal(adminUser.name);
        expect(request.headers.ProfileName).to.equal(adminProfile.name);
        expect(request.headers.TokenName).to.equal('myTokenName');
        expect(request.headers.IsAdmin).to.equal(true);
        expect(request.headers.IsBot).to.equal(false);
        expect(request.headers.IsCollector).to.equal(false);
        return done();
      }).catch(done);
    });
  });

  describe('createToken tests', () => {
    it('No additional payload - no extra headers set',
    (done) => {
      const token = jwtUtil.createToken('myTokenName', 'myUserName');
      jwtVerifyAsync(token, secret, {})
      .then((decodedData) => {
        expect(decodedData.username).to.be.equal('myUserName');
        expect(decodedData.tokenname).to.be.equal('myTokenName');
        expect(decodedData.timestamp).to.be.an('number');
        expect(decodedData.ProfileName).to.be.equal(undefined);
        expect(decodedData.IsAdmin).to.be.equal(undefined);
        expect(decodedData.isBot).to.be.equal(undefined);
        expect(decodedData.IsCollector).to.be.equal(undefined);
        return done();
      }).catch(done);
    });

    it('With payload - all headers in payload present in default headers',
    (done) => {
      const token = jwtUtil.createToken(
        'myTokenName',
        'myUserName',
        { ProfileName: 'myProfile', IsAdmin: false }
      );
      jwtVerifyAsync(token, secret, {})
      .then((decodedData) => {
        expect(decodedData.username).to.be.equal('myUserName');
        expect(decodedData.tokenname).to.be.equal('myTokenName');
        expect(decodedData.timestamp).to.be.an('number');
        expect(decodedData.ProfileName).to.be.equal('myProfile');
        expect(decodedData.IsAdmin).to.be.equal(false);
        expect(decodedData.isBot).to.be.equal(undefined);
        expect(decodedData.IsCollector).to.be.equal(undefined);
        return done();
      }).catch(done);
    });

    it('With payload - some headers in payload present in default headers',
    (done) => {
      const token = jwtUtil.createToken(
        'myTokenName',
        'myUserName',
        { IsCollector: true, RandomHeader: 'randomStr' }
      );
      jwtVerifyAsync(token, secret, {})
      .then((decodedData) => {
        expect(decodedData.username).to.be.equal('myUserName');
        expect(decodedData.tokenname).to.be.equal('myTokenName');
        expect(decodedData.timestamp).to.be.an('number');
        expect(decodedData.IsCollector).to.be.equal(true);
        expect(decodedData.ProfileName).to.be.equal(undefined);
        expect(decodedData.IsAdmin).to.be.equal(undefined);
        expect(decodedData.isBot).to.be.equal(undefined);
        expect(decodedData.RandomHeader).to.be.equal(undefined);
        return done();
      }).catch(done);
    });

    it('Create token with empty payload', (done) => {
      const token = jwtUtil.createToken('myTokenName', 'myUserName', {});
      jwtVerifyAsync(token, secret, {})
      .then((decodedData) => {
        expect(decodedData.username).to.be.equal('myUserName');
        expect(decodedData.tokenname).to.be.equal('myTokenName');
        expect(decodedData.timestamp).to.be.an('number');
        expect(decodedData.ProfileName).to.be.equal(undefined);
        expect(decodedData.IsAdmin).to.be.equal(undefined);
        expect(decodedData.isBot).to.be.equal(undefined);
        expect(decodedData.IsCollector).to.be.equal(undefined);
        return done();
      }).catch(done);
    });
  });

  describe('assignHeaderValues tests', () => {
    it('decodedTokenData empty', (done) => {
      const req = { headers: {} };
      jwtUtil.assignHeaderValues(req, {});
      expect(req.headers.UserName).to.be.equal(undefined);
      expect(req.headers.TokenName).to.be.equal(undefined);
      expect(req.headers.ProfileName).to.be.equal('');
      expect(req.headers.IsAdmin).to.be.equal(false);
      expect(req.headers.IsCollector).to.be.equal(false);
      expect(req.headers.IsBot).to.be.equal(false);
      return done();
    });

    it('decodedTokenData with all valid headers', (done) => {
      const req = { headers: {} };
      jwtUtil.assignHeaderValues(
        req,
        {
          username: 'myUserName',
          tokenname: 'myTokenName',
          IsAdmin: true,
          ProfileName: 'Admin',
        }
      );
      expect(req.headers.UserName).to.be.equal('myUserName');
      expect(req.headers.TokenName).to.be.equal('myTokenName');
      expect(req.headers.ProfileName).to.be.equal('Admin');
      expect(req.headers.IsAdmin).to.be.equal(true);
      expect(req.headers.IsCollector).to.be.equal(false);
      expect(req.headers.IsBot).to.be.equal(false);
      return done();
    });

    it('decodedTokenData with some invalid headers - invalid headers ignored',
    (done) => {
      const req = { headers: {} };
      jwtUtil.assignHeaderValues(
        req,
        {
          username: 'myUserName',
          tokenname: 'myTokenName',
          IsAdmin: true,
          ProfileName: 'Admin',
          Random: 'randomVal', //ignored
        }
      );
      expect(req.headers.UserName).to.be.equal('myUserName');
      expect(req.headers.TokenName).to.be.equal('myTokenName');
      expect(req.headers.ProfileName).to.be.equal('Admin');
      expect(req.headers.IsAdmin).to.be.equal(true);
      expect(req.headers.IsCollector).to.be.equal(false);
      expect(req.headers.IsBot).to.be.equal(false);
      expect(req.headers.Random).to.be.equal(undefined);
      return done();
    });
  });
});
