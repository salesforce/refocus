/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/common/testAssociations.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const Joi = require('joi');
const expect = require('chai').expect;

function testAssociations(path, associations, joiSchema, conf) {
  let token;
  let recordName;
  let recordId;

  before((done) => {
    token = conf.token;

    done();
  });

  it('find includes associations', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      recordName = res.body[0].name;
      recordId = res.body[0].id;
      expect(res.body).to.be.an('array');
      res.body.forEach((record) => {
        expect(record).to.include.keys(associations);
        associations.forEach((assoc) => {
          expect(Joi.validate(record[assoc], joiSchema[assoc]).error).to.be.null;
        });
      });
    })
    .end(done);
  });

  it('find with field params does not include associations', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.be.an('array');
      res.body.forEach((record) => {
        expect(record).to.not.have.any.keys(associations);
      });
    })
    .end(done);
  });

  it('get by id includes associations', (done) => {
    api.get(`${path}/${recordId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.include.keys(associations);
      associations.forEach((assoc) => {
        expect(Joi.validate(res.body[assoc], joiSchema[assoc]).error).to.be.null;
      });
    })
    .end(done);
  });

  it('get by name includes associations', (done) => {
    // GET /v1/generatorTemplates/name is invalid
    if (path === '/v1/generatorTemplates') {
      return done();
    }

    api.get(`${path}/${recordName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.include.keys(associations);
      associations.forEach((assoc) => {
        expect(Joi.validate(res.body[assoc], joiSchema[assoc]).error).to.be.null;
      });
    })
    .end(done);
  });

  it('get by id with field param does not include associations', (done) => {
    api.get(`${path}/${recordId}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.not.have.any.keys(associations);
    })
    .end(done);
  });

  it('get by name with field param does not include associations', (done) => {
    // GET /v1/generatorTemplates/name is invalid
    if (path === '/v1/generatorTemplates') {
      return done();
    }

    api.get(`${path}/${recordName}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.not.have.any.keys(associations);
    })
    .end(done);
  });

  associations.forEach((assoc) => {
    it(`find: an association can be specified as a field param (${assoc})`, (done) => {
      api.get(`${path}?fields=name,${assoc}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.be.an('array');
        res.body.forEach((record) => {
          expect(record).to.have.keys(['id', 'name', assoc, 'apiLinks']);
          expect(Joi.validate(record[assoc], joiSchema[assoc]).error)
            .to.be.null;
        });
      })
      .end(done);
    });
  });

  associations.forEach((assoc) => {
    it(`get by id: an association can be specified as a field param (${assoc})`, (done) => {
      api.get(`${path}/${recordId}?fields=name,${assoc}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys('id', 'name', assoc, 'apiLinks');
        expect(Joi.validate(res.body[assoc], joiSchema[assoc]).error).to.be.null;
      })
      .end(done);
    });

    it(`get by name: an association can be specified as a field param (${assoc})`, (done) => {
      // GET /v1/generatorTemplates/name is invalid
      if (path === '/v1/generatorTemplates') {
        return done();
      }

      api.get(`${path}/${recordName}?fields=name,${assoc}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys('id', 'name', assoc, 'apiLinks');
        expect(Joi.validate(res.body[assoc], joiSchema[assoc]).error).to.be.null;
      })
      .end(done);
    });
  });

  describe('Checking multiple associations', () => {
    if (associations.length > 1) {
      it('multiple associations can be specified as field params', (done) => {
        const fields = ['name', ...associations].toString();
        api.get(`${path}?fields=${fields}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.be.an('array');
          res.body.forEach((record) => {
            expect(record).to.have.keys('id', 'name', ...associations, 'apiLinks');
            associations.forEach((assoc) => {
              expect(Joi.validate(record[assoc],
                joiSchema[assoc]).error).to.be.null;
            });
          });
        })
        .end(done);
      });

      it('multiple associations can be specified with id and field' +
        ' params', (done) => {
        const fields = ['name', ...associations].toString();
        api.get(`${path}/${recordId}?fields=${fields}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.keys('id', 'name', ...associations, 'apiLinks');
          associations.forEach((assoc) => {
            expect(Joi.validate(res.body[assoc],
              joiSchema[assoc]).error).to.be.null;
          });
        })
        .end(done);
      });

      it('multiple associations can be specified with name and field' +
        ' params', (done) => {
        // GET /v1/generatorTemplates/name is invalid
        if (path === '/v1/generatorTemplates') {
          return done();
        }

        const fields = ['name', ...associations].toString();
        api.get(`${path}/${recordName}?fields=${fields}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.keys('id', 'name', ...associations, 'apiLinks');
          associations.forEach((assoc) => {
            expect(Joi.validate(res.body[assoc],
              joiSchema[assoc]).error).to.be.null;
          });
        })
        .end(done);
      });
    }
  });
}

module.exports = {
  testAssociations,
};
