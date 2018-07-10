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
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const Joi = require('joi');
const expect = require('chai').expect;

function testAssociations(path, associations, joiSchema, conf) {
  let token;
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
      recordId = res.body[0].name;
      expect(res.body).to.be.an('array');
      res.body.forEach((record) => {
        associations.forEach((assoc) => {
          expect(record).to.have.property(assoc);
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
        associations.forEach((assoc) => {
          expect(record).to.not.have.property(assoc);
        });
      });
    })
    .end(done);
  });

  it('get by key includes associations', (done) => {
    api.get(`${path}/${recordId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      associations.forEach((assoc) => {
        expect(res.body).to.have.property(assoc);
        expect(Joi.validate(res.body[assoc], joiSchema[assoc]).error).to.be.null;
      });
    })
    .end(done);
  });

  it('get by key with field param does not include associations', (done) => {
    api.get(`${path}/${recordId}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      associations.forEach((assoc) => {
        expect(res.body).to.not.have.property(assoc);
      });
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
          expect(record).to.have.keys('id', 'name', assoc, 'apiLinks');
          expect(Joi.validate(record[assoc], joiSchema[assoc]).error).to.be.null;
        });
      })
      .end(done);
    });
  });

  associations.forEach((assoc) => {
    it(`get by key: an association can be specified as a field param (${assoc})`, (done) => {
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
            associations.forEach((assoc) => {
              expect(record).to.have.property(assoc);
              expect(Joi.validate(record[assoc],
                joiSchema[assoc]).error).to.be.null;
            });
          });
        })
        .end(done);
      });

      it('multiple associations can be specified with key and field' +
        ' params', (done) => {
        const fields = ['name', ...associations].toString();
        api.get(`${path}/${recordId}?fields=${fields}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          associations.forEach((assoc) => {
            expect(res.body).to.have.property(assoc);
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
