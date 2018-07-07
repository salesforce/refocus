/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const path = '/v1/generators';
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;
const ZERO = 0;
const validateGeneratorAspectsPermissions = require(
  '../../../../api/v1/controllers/generators'
).validateGeneratorAspectsPermissions;
const Aspect = tu.db.Aspect;

describe('tests/api/v1/generators/post.js >', () => {
  let token;
  const generator = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  u.createSGtoSGTMapping(generatorTemplate, generator);

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(u.createGeneratorAspects())
    .then(() => done())
    .catch(done);
  });
  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('simple post OK', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(generator)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.apiLinks).to.be.an('Array');
      expect(res.body.name).to.include(generator.name);
      expect(res.body).to.have.property('intervalSecs', 60);
      expect(res.body.id).to.not.equal(undefined);
      expect(res.body).to.have.any.keys(Object.keys(generator));

      // aspect names are saved lowercase
      expect(res.body.aspects).to.be.an('array').with.lengthOf(2);
      expect(res.body.aspects[0]).to.equal('temperature');
      expect(res.body.aspects[1]).to.equal('weather');
      done();
    });
  });

  it('OK, post with intervalSecs', (done) => {
    const g = u.getGenerator();
    g.name = g.name + 'intsec';
    g.intervalSecs = 100;
    u.createSGtoSGTMapping(generatorTemplate, g);
    api.post(path)
    .set('Authorization', token)
    .send(g)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) return done(err);

      expect(res.body.apiLinks).to.be.an('Array');
      expect(res.body.name).to.include(g.name);
      expect(res.body).to.have.property('intervalSecs', 100);
      expect(res.body.id).to.not.equal(undefined);
      expect(res.body).to.have.any.keys(Object.keys(g));

      // aspect names are saved lowercase
      expect(res.body.aspects).to.be.an('array').with.lengthOf(2);
      expect(res.body.aspects[0]).to.equal('temperature');
      expect(res.body.aspects[1]).to.equal('weather');
      done();
    });
  });

  it('simple post without required fields', (done) => {
    const g = JSON.parse(JSON.stringify(generator));
    delete g.name;
    delete g.aspects;
    api.post(path)
    .set('Authorization', token)
    .send(g)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (!err) {
        return done(new Error('Expecting "Schema Validation Failed" error'));
      }

      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(2);
      expect(errorArray[ZERO].type).to.equal('SCHEMA_VALIDATION_FAILED');
      done();
    });
  });

  it('error, post with currentCollector, read only', (done) => {
    generator.currentCollector = 'some-collector';
    api.post(path)
    .set('Authorization', token)
    .send(generator)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('ValidationError');
      expect(res.body.errors[0].description).to.equal(
        'You cannot modify the read-only field: currentCollector'
      );
      return done();
    });
  });

  it('post without Generator Template error', (done) => {
    delete generator.generatorTemplate;
    api.post(path)
    .set('Authorization', token)
    .send(generator)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      expect(res.body.errors[0].type).to.equal('SCHEMA_VALIDATION_FAILED');
      expect(res.body.errors[0].message).to.equal(
        'Missing required property: generatorTemplate'
      );
      done();
    });
  });

  describe('post duplicate fails >', () => {
    const gen = JSON.parse(JSON.stringify(generator));
    gen.name += 'pdf';

    before((done) => {
      Generator.create(gen)
      .then(() => done())
      .catch(done);
    });

    it('with identical name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(gen)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type).to.equal(tu.uniErrorName);
        done();
      });
    });

    it('with case different name', (done) => {
      const g = JSON.parse(JSON.stringify(gen));
      g.name = g.name.toLowerCase();
      api.post(path)
      .set('Authorization', token)
      .send(g)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type).to.equal(tu.uniErrorName);
        done();
      });
    });
  });

  describe('validateGeneratorAspectsPermissions >', () => {
    afterEach(u.forceDelete);
    afterEach(tu.forceDeleteUser);
    it('ok, all aspects have user permission', (done) => {
      const userName = 'user1';
      const req = {};
      let user;
      const aspects = [];
      tu.createUser(userName)
      .then((createdUser) => { // create user
        user = createdUser;
        req.user = createdUser;
        return Aspect.create(
          { name: `${tu.namePrefix}ASPECT1`, isPublished: true, timeout: '110s',
        });
      })
      .then((asp1) => { // created aspect1
        aspects.push(asp1.name);
        return asp1.addWriter(user); // asign user as writer to aspect1
      })
      .then(() => Aspect.create({
        name: `${tu.namePrefix}ASPECT2`,
        isPublished: true,
        timeout: '110s',
      }))
      .then((asp2) => { // created aspect2
        aspects.push(asp2.name);
        return asp2.addWriter(user); // asign user as writer to aspect2
      })
      .then(() => validateGeneratorAspectsPermissions(aspects, req))
      .then(() => done()) // Validation successful
      .catch((err) => done(err));
    });

    it('error, some aspects do not have user permission', (done) => {
      const userName1 = 'user1';
      const userName2 = 'user2';
      const req = {};
      let user1;
      let user2;
      const aspects = [];
      tu.createUser(userName1)
      .then((createdUser1) => {
        user1 = createdUser1;
        req.user = createdUser1; // request by user1
        return tu.createUser(userName2);
      })
      .then((createdUser2) => { // create user2
        user2 = createdUser2;
        return Aspect.create(
          { name: `${tu.namePrefix}ASPECT1`, isPublished: true, timeout: '110s',
        });
      })
      .then((asp1) => { // created aspect1
        aspects.push(asp1.name);
        return asp1.addWriter(user1); // assign user1 as writer to aspect1
      })
      .then(() => Aspect.create({
        name: `${tu.namePrefix}ASPECT2`,
        isPublished: true,
        timeout: '110s',
      }))
      .then((asp2) => { // created aspect2
        aspects.push(asp2.name);
        return asp2.addWriter(user2); // assign user2 as writer to aspect2
      })
      .then(() => validateGeneratorAspectsPermissions(aspects, req))
      .then(() => done(new Error('Expecting a Forbidden error')))
      .catch((err) => {
        expect(err.name).to.be.equal('ForbiddenError');
        expect(err.explanation).to.be.equal('Insufficient Privileges');
        done();
      })
      .catch((e) => done(e));
    });

    it('error, all aspects do not have user permission', (done) => {
      const userName1 = 'user1';
      const userName2 = 'user2';
      const req = {};
      let user2;
      const aspects = [];
      tu.createUser(userName1)
      .then((createdUser1) => {
        req.user = createdUser1; // request by user1
        return tu.createUser(userName2);
      })
      .then((createdUser2) => { // create user2
        user2 = createdUser2;
        return Aspect.create(
          { name: `${tu.namePrefix}ASPECT1`, isPublished: true, timeout: '110s',
        });
      })
      .then((asp1) => { // created aspect1
        aspects.push(asp1.name);
        return asp1.addWriter(user2); // assign user2 as writer to aspect1
      })
      .then(() => Aspect.create({
        name: `${tu.namePrefix}ASPECT2`,
        isPublished: true,
        timeout: '110s',
      }))
      .then((asp2) => { // created aspect2
        aspects.push(asp2.name);
        return asp2.addWriter(user2); // assign user2 as writer to aspect2
      })
      .then(() => validateGeneratorAspectsPermissions(aspects, req))
      .then(() => done(new Error('Expecting a Forbidden error')))
      .catch((err) => {
        expect(err.name).to.be.equal('ForbiddenError');
        expect(err.explanation).to.be.equal('Insufficient Privileges');
        done();
      })
      .catch((e) => done(e));
    });

    it('error, aspect not found', (done) => {
      const userName = 'user1';
      const req = {};
      let user;
      const aspects = [];
      tu.createUser(userName)
      .then((createdUser) => { // create user
        user = createdUser;
        req.user = createdUser;
        return Aspect.create(
          { name: `${tu.namePrefix}ASPECT1`, isPublished: true, timeout: '110s',
        });
      })
      .then((asp1) => { // created aspect1
        aspects.push(asp1.name);
        aspects.push(`${tu.namePrefix}ASPECT2`);
        return asp1.addWriter(user); // asign user as writer to aspect1
      })
      .then(() => validateGeneratorAspectsPermissions(aspects, req))
      .then(() => done(new Error('Expecting a ResourceNotFoundError error')))
      .catch((err) => {
        expect(err.name).to.be.equal('ResourceNotFoundError');
        expect(err.message).to.be.equal('Aspect not found');
        expect(err.info).to.be.equal('___ASPECT2');
        done();
      })
      .catch((e) => done(e));
    });

    it('ok, aspects empty', (done) => {
      const userName = 'user1';
      const req = {};
      const aspects = [];
      tu.createUser(userName)
      .then((createdUser) => { // create user
        req.user = createdUser;
        return validateGeneratorAspectsPermissions(aspects, req);
      })
      .then(() => done()) // Validation successful
      .catch((err) => done(err));
    });

    it('ok, req with no user, aspect not write protected', (done) => {
      const req = {};
      const aspects = [];
      Aspect.create(
        { name: `${tu.namePrefix}ASPECT1`, isPublished: true, timeout: '110s',
      })
      .then((asp1) => { // created aspect1
        aspects.push(asp1.name);
        return validateGeneratorAspectsPermissions(aspects, req);
      })
      .then(() => done()) // Validation successful
      .catch((err) => done(err));
    });

    it('error, req with no user, aspect write protected', (done) => {
      const userName = 'user1';
      const req = {};
      const aspects = [];
      let user;
      tu.createUser(userName)
      .then((createdUser) => { // create user
        user = createdUser;
        return Aspect.create({
          name: `${tu.namePrefix}ASPECT1`, isPublished: true, timeout: '110s',
        });
      })
      .then((asp1) => { // created aspect1
        aspects.push(asp1.name);
        return asp1.addWriter(user); // asign user as writer to aspect1
      })
      .then(() => validateGeneratorAspectsPermissions(aspects, req))
      .then(() => done(new Error('expecting ForbiddenError')))
      .catch((err) => {
        expect(err.name).to.be.equal('ForbiddenError');
        expect(err.explanation).to.be.equal('Insufficient Privileges');
        done();
      });
    });

    it('aspects argument null', (done) => {
      validateGeneratorAspectsPermissions(null, {})
      .then(() => done()) // Promise is expected to resolve
      .catch((e) => done(e));
    });

    it('req argument null', (done) => {
      validateGeneratorAspectsPermissions([], null)
      .then(() => done(new Error('Expecting a ValidationError error')))
      .catch((err) => {
        expect(err.name).to.be.equal('ValidationError');
        expect(err.message).to.be.equal(
          'req is required argument'
        );
        done();
      })
      .catch((e) => done(e));
    });
  });
});
