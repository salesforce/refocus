/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generatorTemplates';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const RADIX = 10;

describe('tests/api/v1/generatorTemplates/get.js > ', () => {
  let token;
  let o1;
  let o2;
  let o3;
  let o4;
  const template1 = u.getGeneratorTemplate();
  template1.name = 'template1';
  const template2 = u.getGeneratorTemplate();
  template2.name = 'template2';
  template2.tags.push('tag2');
  const template3 = u.getGeneratorTemplate();
  template3.name = 'template3';
  template3.tags = ['tag2'];
  const template4 = u.getGeneratorTemplate();
  template4.name = 'template4';

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(template1)
    .then((o) => {
      o1 = o;
      template1.id = o.id;
      return GeneratorTemplate.create(template2);
    })
    .then((o) => {
      o2 = o;
      template2.id = o.id;
      return GeneratorTemplate.create(template3);
    })
    .then((o) => {
      o3 = o;
      template3.id = o.id;
      return GeneratorTemplate.create(template4);
    })
    .then((o) => {
      o4 = o;
      template4.id = o.id;
      return done();
    })
    .catch(done);
  });

  after(u.forceDelete);
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

      expect(res.body[ZERO].name).to.equal(template1.name);
      expect(res.body[ONE].name).to.equal(template2.name);
      expect(res.body[TWO].name).to.equal(template3.name);
      expect(res.body[THREE].name).to.equal(template4.name);
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

      expect(res.body[THREE].name).to.equal(template1.name);
      expect(res.body[TWO].name).to.equal(template2.name);
      expect(res.body[ONE].name).to.equal(template3.name);
      expect(res.body[ZERO].name).to.equal(template4.name);
      done();
    });
  });

  it('Simple GET with id', (done) => {
    api.get(`${path}/${template1.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(template1.name);
      done();
    });
  });

  it('Simple GET with name', (done) => {
    api.get(`${path}/${template1.name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(template1.name);
      done();
    });
  });

  it('Simple GET with name in lowercase', (done) => {
    api.get(`${path}/${template1.name.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(template1.name);
      done();
    });
  });

  it('find by tags, found', (done) => {
    api.get(`${path}?tags=tag1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(THREE);
      done();
    });
  });

  it('find by tags multiple, found', (done) => {
    api.get(`${path}?tags=tag1,tag2`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[ZERO]).to.have.property('name', template2.name);
      done();
    });
  });

  it('find by tags, not found', (done) => {
    api.get(`${path}?tags=tag5`)
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

  describe('get with fields > ', () => {
    function getAllWithFields(done, ...fields) {
      const extraFields = ['apiLinks'];
      if (!fields.includes('id')) extraFields.push('id');
      const expectedFields = [...extraFields, ...fields];
      api.get(`${path}?fields=${fields.join(',')}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        if (res.body.errors) {
          return done(res.body.errors[0]);
        }

        expect(res.body).to.have.length(4);
        const templates = [template1, template2, template3, template4];
        for (let i = 0; i < 4; i++) {
          const template = templates[i];
          const responseObj = res.body[i];
          fields.forEach((field) => {
            expect(responseObj[field]).to.deep.equal(template[field]);
          });
        }

        expect(res.body[0]).to.have.all.keys(expectedFields);
        done();
      });
    }

    function getByKeyWithFields(done, ...fields) {
      const extraFields = ['apiLinks'];
      if (!fields.includes('id')) extraFields.push('id');
      const expectedFields = [...extraFields, ...fields];
      api.get(`${path}/${template1.id}?fields=${fields.join(',')}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        fields.forEach((field) => {
          expect(res.body[field]).to.deep.equal(template1[field]);
        });
        expect(res.body).to.have.all.keys(expectedFields);
        done();
      });
    }

    const fields = ['description', 'helpEmail', 'helpUrl', 'id', 'name',
      'version', 'tags', 'author', 'repository', 'connection',
      'contextDefinition', 'transform',
      'isPublished']; // jscs:ignore requireTrailingComma

    fields.forEach((field) => {
      it(`fields param all - ${field}`, (done) => {
        getAllWithFields(done, field);
      });
    });

    fields.forEach((field) => {
      it(`fields param by key - ${field}`, (done) => {
        getByKeyWithFields(done, field);
      });
    });

    it(`fields param all - multiple fields`, (done) => {
      getAllWithFields(done, 'description', 'name', 'tags');
    });

    it(`fields param all - all fields`, (done) => {
      getAllWithFields(done, ...fields);
    });

    it(`fields param by key - multiple fields`, (done) => {
      getByKeyWithFields(done, 'description', 'name', 'tags');
    });

    it(`fields param by key - all fields`, (done) => {
      getByKeyWithFields(done, ...fields);
    });
  });

  describe('find by fields > ', () => {

    function findByField(done, field, filter, expected) {
      let expectedStatus = constants.httpStatus.OK;
      if (expected === 'err') {
        expectedStatus = constants.httpStatus.BAD_REQUEST;
      }

      api.get(`${path}?${field}=${filter}`)
      .set('Authorization', token)
      .expect(expectedStatus)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        if (parseInt(expected, RADIX)) {
          expect(res.body).to.have.length(expected);
        }

        done();
      });
    }

    before((done) => {
      o1.description = 'description1';
      o2.description = 'description2';
      o3.description = 'description3';
      o4.description = 'description4';

      o1.version = '1.0.0';
      o2.version = '1.0.2';
      o3.version = '1.4.1';
      o4.version = '2.0.0';

      o1.isPublished = 'true';
      o2.isPublished = 'true';
      o3.isPublished = 'false';
      o4.isPublished = 'false';

      o1.save()
      .then(() => o2.save())
      .then(() => o3.save())
      .then(() => o4.save())
      .then(() => done())
      .catch(done);
    });

    it('find by name', (done) => {
      findByField(done, 'name', 'template2', 1);
    });

    it('find by name wildcard', (done) => {
      findByField(done, 'name', 'template*', 4);
    });

    it('find by version', (done) => {
      findByField(done, 'version', '2.0.0', 1);
    });

    it('find by version wildcard', (done) => {
      findByField(done, 'version', '1.*.*', 3);
    });

    it('find by isPublished', (done) => {
      findByField(done, 'isPublished', 'false', 2);
    });

    it('find by isPublished non-boolean (error)', (done) => {
      findByField(done, 'isPublished', 'aaa', 'err');
    });

    it('find by isPublished wildcard (error)', (done) => {
      findByField(done, 'isPublished', 'f*lse', 'err');
    });
  });
});

