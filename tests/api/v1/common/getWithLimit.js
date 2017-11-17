/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/common/getWithLimit.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const config = require('../../../../config');

function getWithLimit(path, skipWildcards) {
  const originalDefaultLimit = config.api.defaults.limit;
  let expectedResponse;
  let filteredResponse;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after((done) => {
    config.api.defaults.limit = originalDefaultLimit;
    done();
  });

  it('no limit', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.be.at.least(10);
      expectedResponse = res.body;
      filteredResponse = res.body.filter((o) => o.name &&
        o.name.includes('limitTest'));
    })
    .end(done);
  });

  it('limit=1', (done) => {
    api.get(`${path}?limit=1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(1);
    })
    .end(done);
  });

  it('limit=5', (done) => {
    api.get(`${path}?limit=5`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(5);
    })
    .end(done);
  });

  it('limit=20', (done) => {
    api.get(`${path}?limit=20`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(expectedResponse.length);
    })
    .end(done);
  });

  it('limit=3&offset=5', (done) => {
    api.get(`${path}?limit=3&offset=5`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(3);
      expect(res.body[0].name).to.equal(expectedResponse[5].name);
      expect(res.body[1].name).to.equal(expectedResponse[6].name);
      expect(res.body[2].name).to.equal(expectedResponse[7].name);
    })
    .end(done);
  });

  if (!skipWildcards) {
    it('name=*even&limit=3', (done) => {
      api.get(`${path}?&name=*even&limit=3`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(3);
        expect(res.body[0].name).to.equal(filteredResponse[0].name);
        expect(res.body[1].name).to.equal(filteredResponse[2].name);
        expect(res.body[2].name).to.equal(filteredResponse[4].name);
      })
      .end(done);
    });

    it('name=*even&limit=2&offset=2', (done) => {
      api.get(`${path}?name=*even&limit=3&offset=2`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(3);
        expect(res.body[0].name).to.equal(filteredResponse[4].name);
        expect(res.body[1].name).to.equal(filteredResponse[6].name);
        expect(res.body[2].name).to.equal(filteredResponse[8].name);
      })
      .end(done);
    });
  }

  it('default limit 5', (done) => {
    config.api.defaults.limit = 5;
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(5);
    })
    .end(done);
  });

  it('default limit 3, limit=10', (done) => {
    config.api.defaults.limit = 3;
    api.get(`${path}?limit=10`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(3);
    })
    .end(done);
  });

  it('default limit 3, offset=5', (done) => {
    config.api.defaults.limit = 3;
    api.get(`${path}?offset=5`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(3);
      expect(res.body[0].name).to.equal(expectedResponse[5].name);
      expect(res.body[1].name).to.equal(expectedResponse[6].name);
      expect(res.body[2].name).to.equal(expectedResponse[7].name);
    })
    .end(done);
  });

  if (!skipWildcards) {
    it('default limit 3, name=*even', (done) => {
      config.api.defaults.limit = 3;
      api.get(`${path}?name=*even`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(3);
        expect(res.body[0].name).to.equal(filteredResponse[0].name);
        expect(res.body[1].name).to.equal(filteredResponse[2].name);
        expect(res.body[2].name).to.equal(filteredResponse[4].name);
      })
      .end(done);
    });

    it('default limit 3, name=*even&offset=2', (done) => {
      config.api.defaults.limit = 3;
      api.get(`${path}?name=*even&offset=2`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(3);
        expect(res.body[0].name).to.equal(filteredResponse[4].name);
        expect(res.body[1].name).to.equal(filteredResponse[6].name);
        expect(res.body[2].name).to.equal(filteredResponse[8].name);
      })
      .end(done);
    });
  }
}

module.exports = {
  getWithLimit,
};

