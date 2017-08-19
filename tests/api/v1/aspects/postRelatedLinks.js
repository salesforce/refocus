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
const path = '/v1/aspects';
const expect = require('chai').expect;

describe('tests/api/v1/aspects/postRelatedLinks.js >', () => {
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

  it('post aspect with relatedLinks', (done) => {
    const aspectToPost = {
      name: `${tu.namePrefix}HeartRate`,
      timeout: '110s',
    };
    const relatedLinks = [
      { name: 'link1', url: 'https://samples.com' },
      { name: 'link2', url: 'https://samples.com' },
    ];
    aspectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(aspectToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end(done);
  });

  it('posting aspect with duplicate relatedLinks should fail', (done) => {
    const aspectToPost = {
      name: `${tu.namePrefix}Pressure`,
      timeout: '110s',
    };
    const relatedLinks = [
      { name: 'link1', url: 'https://samples.com' },
      { name: 'link1', url: 'https://samples.com' },
    ];
    aspectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(aspectToPost)
    .expect((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[0].message)
        .to.contain('Name of the relatedlinks should be unique');
      expect(res.body.errors[0].source).to.contain('relatedLinks');
    })
    .end(done);
  });

  it('post aspect with relatedLinks of size zero', (done) => {
    const aspectToPost = {
      name: `${tu.namePrefix}Weight`,
      timeout: '110s',
    };
    const relatedLinks = [];
    aspectToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(aspectToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end(done);
  });
});
