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
const gu = require('../api/v1/generators/utils');

describe('tests/utils/jwtUtil.js >', () => {
  const newBot = {
    name: n,
    version: '1.0.0',
    url: 'http://www.bar.com',
    active: true,
  };

  let userInst;
  let collectorInst;
  let userToken;
  let collectorToken;
  let generatorToken;
  let profile;
  const testStartTime = new Date();
  const predefinedAdminUserToken = tu.createAdminToken();
  const generator = gu.getGenerator();
  const generatorTemplate = gu.gtUtil.getGeneratorTemplate();
  gu.createSGtoSGTMapping(generatorTemplate, generator);

  // dummy callback that returns a promise.
  const dummyCallback = () => Promise.resolve(true);

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
      return jwtUtil.createToken(collectorInst.name, userInst.name, { IsCollector: true }
      );
    })
    .then((token) => {
      collectorToken = token;
      return tu.db.GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => gu.createGeneratorAspects())
    .then(() => tu.db.Generator.create(generator))
    .then(() => jwtUtil.createToken(generator.name, userInst.name,
      { IsGenerator: true }))
    .then((token) => generatorToken = token)
    .then(() => done())
    .catch((err) => done());
  });

  after((done) => {
    tu.forceDelete(tu.db.User, testStartTime)
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.Collector, testStartTime))
    .then(() => tu.forceDelete(tu.db.Generator, testStartTime))
    .then(() => tu.forceDelete(tu.db.GeneratorTemplate, testStartTime))
    .then(() => tu.forceDelete(tu.db.Bot, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
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

  describe('verifyToken >', () => {
    it('verifyCollectorToken and make sure the request header has ' +
      'info attached', (done) => {
      const req = {
        headers: { },
        session: { },
      };
      req.headers.authorization = collectorToken;
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(req.headers.UserName).to.equal(userInst.name);
        expect(req.headers.ProfileName).to.equal(profile.name);
        expect(req.headers.TokenName).to.equal(collectorInst.name);
        expect(req.headers.IsAdmin).to.equal(false);
        expect(req.headers.IsBot).to.equal(false);
        expect(req.headers.IsCollector).to.equal(true);
        expect(req.headers.IsGenerator).to.equal(false);
        return done();
      }).catch(done);
    });

    it('verifyGeneratorToken and make sure the request header has ' +
      'info attached', (done) => {
      const req = {
        headers: { },
        session: { },
      };
      req.headers.authorization = generatorToken;
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(req.headers.UserName).to.equal(userInst.name);
        expect(req.headers.ProfileName).to.equal(profile.name);
        expect(req.headers.TokenName).to.equal(generator.name);
        expect(req.headers.IsAdmin).to.equal(false);
        expect(req.headers.IsBot).to.equal(false);
        expect(req.headers.IsCollector).to.equal(false);
        expect(req.headers.IsGenerator).to.equal(true);
        return done();
      }).catch(done);
    });

    it('verifyUserToken with admin user and make sure the request header has ' +
      'info attached', (done) => {
      const req = {
        headers: { },
        session: { },
      };
      req.headers.authorization = predefinedAdminUserToken;
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(req.headers.UserName).to.equal(adminUser.name);
        expect(req.headers.ProfileName).to.equal('Admin');
        expect(req.headers.TokenName).to.equal(adminUser.name);
        expect(req.headers.IsAdmin).to.equal(true);
        expect(req.headers.IsBot).to.equal(false);
        expect(req.headers.IsCollector).to.equal(false);
        expect(req.headers.IsGenerator).to.equal(false);
        expect(req.user.name).to.equal(adminUser.name);
        expect(req.user.profile.name).to.equal(adminProfile.name);
        expect(req.user).to.not.have.property('password');
        return done();
      }).catch(done);
    });

    it('verifyToken with token added to session object', (done) => {
      const req = {
        headers: { },
        session: { },
      };
      req.session.token = userToken;
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(req.headers.UserName).to.equal(userInst.name);
        expect(req.headers.ProfileName).to.equal('___myProfile');
        expect(req.headers.TokenName).to.equal('___myRefocusUser');
        expect(req.headers.IsAdmin).to.equal(false);
        expect(req.headers.IsBot).to.equal(false);
        expect(req.headers.IsCollector).to.equal(false);
        expect(req.headers.IsGenerator).to.equal(false);
        return done();
      }).catch(done);
    });

    it('verifyToken with invalid token', (done) => {
      const req = {
        headers: { },
        session: { },
      };
      req.headers.authorization = 'invalid';
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(Object.keys(req.headers)).to.deep.equal(['authorization']);
        expect(req.headers.UserName).to.equal(undefined);
        expect(req.headers.ProfileName).to.equal(undefined);
        expect(req.headers.TokenName).to.equal(undefined);
        return done();
      }).catch(done);
    });

    it('verifyUserToken - a header with default value - true, and ' +
      'token with that header value false - false should be set in req',
    (done) => {
      jwtUtil.headersWithDefaults.newBooleanHeader = true;
      const dummyToken = jwtUtil.createToken(
        'myCollector', userInst.name,
        { newBooleanHeader: false, IsCollector: true }
      );
      const req = {
        headers: { },
        session: { },
      };
      req.headers.authorization = dummyToken;
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(req.headers.UserName).to.equal(userInst.name);
        expect(req.headers.ProfileName).to.equal(profile.name);
        expect(req.headers.TokenName).to.equal('myCollector');
        expect(req.headers.IsAdmin).to.equal(false);
        expect(req.headers.IsBot).to.equal(false);
        expect(req.headers.IsCollector).to.equal(true);
        expect(req.headers.IsGenerator).to.equal(false);
        expect(req.headers.newBooleanHeader).to.equal(false);
        return done();
      }).catch(done);
    });

    it('verifyUserToken - non admin user - no ProfileName or IsAdmin in ' +
      'token, both should be set in req', (done) => {
      const dummyToken = jwtUtil.createToken('myTokenName', userInst.name);

      const req = {
        headers: { },
        session: { },
      };
      req.headers.authorization = dummyToken;
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(req.headers.UserName).to.equal(userInst.name);
        expect(req.headers.ProfileName).to.equal(profile.name);
        expect(req.headers.TokenName).to.equal('myTokenName');
        expect(req.headers.IsAdmin).to.equal(false);
        expect(req.headers.IsBot).to.equal(false);
        expect(req.headers.IsCollector).to.equal(false);
        expect(req.headers.IsGenerator).to.equal(false);
        expect(req.user.name).to.equal(userInst.name);
        expect(req.user.profile.name).to.equal(profile.name);
        expect(req.user).to.not.have.property('password');
        return done();
      }).catch(done);
    });

    it('verifyUserToken - admin user - no ProfileName or IsAdmin in ' +
      'token, both should be set in req', (done) => {
      const dummyToken = jwtUtil.createToken('myTokenName', adminUser.name);

      const req = {
        headers: { },
        session: { },
      };
      req.headers.authorization = dummyToken;
      jwtUtil.verifyToken(req, dummyCallback)
      .then(() => {
        expect(req.headers.UserName).to.equal(adminUser.name);
        expect(req.headers.ProfileName).to.equal(adminProfile.name);
        expect(req.headers.TokenName).to.equal('myTokenName');
        expect(req.headers.IsAdmin).to.equal(true);
        expect(req.headers.IsBot).to.equal(false);
        expect(req.headers.IsCollector).to.equal(false);
        expect(req.headers.IsGenerator).to.equal(false);
        return done();
      }).catch(done);
    });
  });

  describe('createToken >', () => {
    it('No additional payload - no extra headers set',
    (done) => {
      const token = jwtUtil.createToken('myTokenName', 'myUserName');
      jwtVerifyAsync(token, secret, {})
      .then((payload) => {
        expect(payload.username).to.be.equal('myUserName');
        expect(payload.tokenname).to.be.equal('myTokenName');
        expect(payload.timestamp).to.be.an('number');
        expect(payload.ProfileName).to.be.equal(undefined);
        expect(payload.IsAdmin).to.be.equal(undefined);
        expect(payload.isBot).to.be.equal(undefined);
        expect(payload.IsCollector).to.be.equal(undefined);
        expect(payload.IsGenerator).to.equal(undefined);
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
      .then((payload) => {
        expect(payload.username).to.be.equal('myUserName');
        expect(payload.tokenname).to.be.equal('myTokenName');
        expect(payload.timestamp).to.be.an('number');
        expect(payload.ProfileName).to.be.equal('myProfile');
        expect(payload.IsAdmin).to.be.equal(false);
        expect(payload.isBot).to.be.equal(undefined);
        expect(payload.IsCollector).to.be.equal(undefined);
        expect(payload.IsGenerator).to.equal(undefined);
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
      .then((payload) => {
        expect(payload.username).to.be.equal('myUserName');
        expect(payload.tokenname).to.be.equal('myTokenName');
        expect(payload.timestamp).to.be.an('number');
        expect(payload.IsCollector).to.be.equal(true);
        expect(payload.IsGenerator).to.be.equal(undefined);
        expect(payload.ProfileName).to.be.equal(undefined);
        expect(payload.IsAdmin).to.be.equal(undefined);
        expect(payload.isBot).to.be.equal(undefined);
        expect(payload.RandomHeader).to.be.equal(undefined);
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
        expect(decodedData.IsGenerator).to.be.equal(undefined);
        return done();
      }).catch(done);
    });
  });

  describe('assignHeaderValues >', () => {
    it('decodedTokenData empty', (done) => {
      const req = { headers: {} };
      jwtUtil.assignHeaderValues(req, {});
      expect(req.headers.UserName).to.be.equal(undefined);
      expect(req.headers.TokenName).to.be.equal(undefined);
      expect(req.headers.ProfileName).to.be.equal('');
      expect(req.headers.IsAdmin).to.be.equal(false);
      expect(req.headers.IsCollector).to.be.equal(false);
      expect(req.headers.IsGenerator).to.be.equal(false);
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
      expect(req.headers.IsGenerator).to.be.equal(false);
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
      expect(req.headers.IsGenerator).to.be.equal(false);
      expect(req.headers.IsBot).to.be.equal(false);
      expect(req.headers.Random).to.be.equal(undefined);
      return done();
    });
  });
});
