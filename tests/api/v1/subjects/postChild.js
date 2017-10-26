/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/postChild.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/child';
const expect = require('chai').expect;
const featureToggles = require('feature-toggles');

describe(`tests/api/v1/subjects/postChild.js, POST ${path} >`, () => {
  let token;
  const n0 = { name: `${tu.namePrefix}NorthAmerica` };
  const n1 = { name: `${tu.namePrefix}Canada` };
  let i0 = 0;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach('create parent', (done) => {
    Subject.create(n0)
    .then((o) => {
      i0 = o.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('posting child to parent_absolute_path/child url returns ' +
    'expected parentAbsolutePath value', (done) => {
    api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
    .set('Authorization', token)
    .send({ name: 'USA' })
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      if (res.body.parentId !== i0) {
        throw new Error('wrong parent?');
      }
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const subject = JSON.parse(res.text);
      expect(Object.keys(subject)).to.contain('parentAbsolutePath');
      expect(subject.parentAbsolutePath).to.equal(n0.name);

      done();
    });
  });

  it('posting child to parent_id/child url returns' +
    'expected parentAbsolutePath value', (done) => {
    api.post(path.replace('{key}', i0))
    .set('Authorization', token)
    .send(n1)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      if (res.body.parentId !== i0) {
        throw new Error('wrong parent?');
      }
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const subject = JSON.parse(res.text);
      expect(Object.keys(subject)).to.contain('parentAbsolutePath');
      expect(subject.parentAbsolutePath).to.equal(n0.name);

      done();
    });
  });

  it('post child with parent id in url', (done) => {
    api.post(path.replace('{key}', i0))
    .set('Authorization', token)
    .send(n1)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      if (res.body.parentId !== i0) {
        throw new Error('wrong parent?');
      }
    })
    .end(done);
  });

  it('post child with parent name in url', (done) => {
    api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
    .set('Authorization', token)
    .send(n1)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      if (res.body.parentId !== i0) {
        throw new Error('wrong parent?');
      }
    })
    .end(done);
  });

  it('post child with published true while parent is unpublished',
  (done) => {
    api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
    .set('Authorization', token)
    .send({ name: 'test', isPublished: true })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].message).to
      .equal('You cannot insert a subject with isPublished = true ' +
        'unless all its ancestors are also published.');
      done();
    });
  });

  it('posting child with hierarchy level field should fail',
  (done) => {
    api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
    .set('Authorization', token)
    .send({ name: 'test', hierarchyLevel: -1 })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description)
      .to.contain('You cannot modify the read-only field');
      return done();
    });
  });

  describe('validate helpEmail/helpUrl required >', () => {
    const toggleOrigValue = featureToggles.isFeatureEnabled(
      'requireHelpEmailOrHelpUrl'
    );
    before(() => tu.toggleOverride('requireHelpEmailOrHelpUrl', true));
    after(() => tu.toggleOverride(
      'requireHelpEmailOrHelpUrl', toggleOrigValue)
    );

    afterEach(u.forceDelete);

    it('NOT OK, post subject with no helpEmail or helpUrl', (done) => {
      api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1` })
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors[0].type).to.equal('ValidationError');
        expect(res.body.errors[0].description).to.equal(
          'At least one these attributes are required: helpEmail,helpUrl'
        );
      })
      .end(done);
    });

    it('NOT OK, post subject with empty helpEmail or helpUrl', (done) => {
      api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpEmail: '' })
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors[0].type).to.equal('ValidationError');
        expect(res.body.errors[0].description).to.equal(
          'At least one these attributes are required: helpEmail,helpUrl'
        );
      })
      .end(done);
    });

    it('OK, post subject with only helpEmail', (done) => {
      api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpEmail: 'abc@xyz.com' })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });

    it('OK, post subject with only helpUrl', (done) => {
      api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpUrl: 'http://xyz.com' })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://xyz.com');
      })
      .end(done);
    });

    it('OK, post subject with both helpUrl and helpEmail', (done) => {
      api.post(path.replace('{key}', `${tu.namePrefix}NorthAmerica`))
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}s1`,
        helpUrl: 'http://xyz.com',
        helpEmail: 'abc@xyz.com',
      })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://xyz.com');
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });
  });
});
