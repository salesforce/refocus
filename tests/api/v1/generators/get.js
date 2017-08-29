/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generators';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const FOUR = 4;

describe('tests/api/v1/generators/get.js >', () => {
  let token;

  const generatorTemplate = gtUtil.getGeneratorTemplate();

  const generatorOk = u.getGenerator();
  u.createSGtoSGTMapping(generatorTemplate, generatorOk);

  const generatorInfo = u.getGenerator();
  generatorInfo.name = 'refocus-info-generator';
  u.createSGtoSGTMapping(generatorTemplate, generatorInfo);

  const generatorCritical = u.getGenerator();
  generatorCritical.name = 'refocus-critical-generator';
  u.createSGtoSGTMapping(generatorTemplate, generatorCritical);

  const generatorWarning = u.getGenerator();
  generatorWarning.name = 'refocus-warning-generator';
  u.createSGtoSGTMapping(generatorTemplate, generatorWarning);

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.create(generatorOk))
    .then((gen) => {
      generatorOk.id = gen.id;
      return Generator.create(generatorInfo);
    })
    .then((gen) => {
      generatorInfo.id = gen.id;
      return Generator.create(generatorCritical);
    })
    .then((gen) => {
      generatorCritical.id = gen.id;
      return Generator.create(generatorWarning);
    })
    .then((gen) => {
      generatorWarning.id = gen.id;
      return done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('simple GET OK', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.lengthOf(4);
      expect(res.body[ZERO].id).to.not.equal(undefined);
      expect(res.body[ONE].id).to.not.equal(undefined);
      expect(res.body[TWO].id).to.not.equal(undefined);
      expect(res.body[THREE].id).to.not.equal(undefined);
      done();
    });
  });

  it('using ?sort=name sort the results in alphabetical order of ' +
    'generator name', (done) => {
    api.get(`${path}?sort=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[ZERO].name).to.equal(generatorCritical.name);
      expect(res.body[ONE].name).to.equal(generatorInfo.name);
      expect(res.body[TWO].name).to.equal(generatorOk.name);
      expect(res.body[THREE].name).to.equal(generatorWarning.name);
      done();
    });
  });

  it('using ?sort=-name should sort the results in reverse alphabetical ' +
    'order of generator name', (done) => {
    api.get(`${path}?sort=-name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[THREE].name).to.equal(generatorCritical.name);
      expect(res.body[TWO].name).to.equal(generatorInfo.name);
      expect(res.body[ONE].name).to.equal(generatorOk.name);
      expect(res.body[ZERO].name).to.equal(generatorWarning.name);
      done();
    });
  });

  it('Simple GET with id', (done) => {
    api.get(`${path}/${generatorOk.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(generatorOk.name);
      done();
    });
  });

  it('Simple GET with name', (done) => {
    api.get(`${path}/${generatorCritical.name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(generatorCritical.name);
      done();
    });
  });

  it('Simple GET with name in lowercase', (done) => {
    api.get(`${path}/${generatorInfo.name.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(generatorInfo.name);
      done();
    });
  });

  it('find by name wildcard, found', (done) => {
    api.get(`${path}?name=*warning*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[ZERO]).to.have.property('name', generatorWarning.name);
      done();
    });
  });

  it('find by name wildcard, not found', (done) => {
    api.get(`${path}?name=*ok`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ZERO);
      done();
    });
  });

  it('find by tags, found', (done) => {
    api.get(`${path}?tags=status`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(FOUR);
      done();
    });
  });

  it('find by tags, not found', (done) => {
    api.get(`${path}?tags=blah`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ZERO);
      done();
    });
  });
});
