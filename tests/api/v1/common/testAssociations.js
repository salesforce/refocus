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
          // TODO - change contains to have once second part of sequelize bug applied

          expect(record).to.contains.all.keys('id', 'name', assoc, 'apiLinks');
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

        // TODO - change contains to have once second part of sequelize bug applied
        expect(res.body).to.contains.all.keys('id', 'name', assoc, 'apiLinks');
        expect(Joi.validate(res.body[assoc], joiSchema[assoc]).error).to.be.null;
      })
      .end(done);
    });
  });

  /*
    These tests fail because of a bug in sequelize.
    It doesn't properly handle multiple associations when a limit is applied:
    It selects the attributes before doing the join for the association, which
    causes an error when the foreign key is not included in the fields.

    One thing we tried:
      According to Sequelize team when limits are set, they enforce the
    usage of sub-queries, however, when Generator has multiple
    associations (ie.: Collectors and User) the sub-query does not
    expose foreign keys (Generator.createdBy).
      Sequelize by default will try to create subQuery even when there is
    no subQuery configured because the duplication flag is true by
    default.
      So, flagging duplicating=false makes Sequelize avoid cartesian
    product not generating sub-queries (further check in:
    /sequelize/model.js, line 441).

    However, setting "duplicating: false" has side effects that break other
    functionality; it causes associations to not return all elements.
    This causes the following tests to fail because only one possibleCollector
    is returned:
      "get by key includes associations"
      "get by key: an association can be specified as a field param"
      "multiple associations can be specified with key and field params"

    These cases are much more common than the problem we were trying to solve,
    so it's better to go back to how it was before and re-skip these tests
    for now.
  */
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
