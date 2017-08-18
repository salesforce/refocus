/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/put.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generatorTemplates';
const expect = require('chai').expect;
const ZERO = 0;

describe('tests/api/v1/generatorTemplates/put.js > ', () => {
  let token;
  let generatorTemplateId = 0;
  const generatorTemplateToCreate = u.getGeneratorTemplate();
  const toPut = {
    name: 'template1',
    description: 'this is template1...',
    tags: [
      'tag1',
      'tag2',
    ],
    author: {
      name: 'author1',
      url: 'http://www.aaa.com',
      email: 'a@a.com'
    },
    connection: {
      method: 'GET',
      url: 'http://www.bbb.com'
    },
    transform: 'function...',
    isPublished: true,
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(generatorTemplateToCreate)
    .then((gen) => {
      generatorTemplateId = gen.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('simple put: ok', (done) => {
    api.put(`${path}/${generatorTemplateId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.subjectQuery).to.equal(undefined);
      expect(res.body.subjects).to.deep.equal(toPut.subjects);
    })
    .end(done);
  });

  it('simple put with name in the url should work', (done) => {
    api.put(`${path}/${toPut.name}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.description).to.equal(toPut.description);
    })
    .end(done)
  });

  it('put without required fields', (done) => {
    delete toPut.name;
    delete toPut.author;
    delete toPut.connection;
    delete toPut.transform;
    delete toPut.isPublished;

    api.put(`${path}/${generatorTemplateId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (!err) {
        return done('Expecting "Schema Validation Failed" error');
      }
      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(5);
      expect(errorArray[ZERO].type).to.equal('SCHEMA_VALIDATION_FAILED');
      return done();
    });
  });
});
