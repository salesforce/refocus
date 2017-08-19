/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/postRelatedLinks.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/subjects';
const expect = require('chai').expect;

describe(`tests/api/v1/subjects/postRelatedLinks.js, POST ${path} >`, () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('post subject with relatedLinks', (done) => {
    const subjectToPost = { name: `${tu.namePrefix}NorthAmerica` };
    const relatedLinks = [
      { name: 'link1', url: 'https://samples.com' },
      { name: 'link2', url: 'https://samples.com' },
    ];
    subjectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(subjectToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end(done);
  });

  it('posting subject with duplicate relatedLinks should fail', (done) => {
    const subjectToPost = { name: `${tu.namePrefix}Asia` };
    const relatedLinks = [
      { name: 'link1', url: 'https://samples.com' },
      { name: 'link1', url: 'https://samples.com' },
    ];
    subjectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(subjectToPost)
    .expect((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[0].message)
        .to.contain('Name of the relatedlinks should be unique');
      expect(res.body.errors[0].type).to.contain('ValidationError');
    })
    .end(done);
  });

  it('post subject with relatedLinks of size zero', (done) => {
    const subjectToPost = { name: `${tu.namePrefix}SouthAmerica` };
    const relatedLinks = [];
    subjectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(subjectToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end(done);
  });
});
