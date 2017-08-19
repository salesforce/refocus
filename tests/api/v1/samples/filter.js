/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/filter.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const path = '/v1/samples';
const expect = require('chai').expect;

describe(`tests/api/v1/samples/filter.js, ${path} >`, () => {
  let token;
  const THREE = 3;
  const TWO = 2;
  const ZERO = 0;
  const ONE = 1;
  const MESSAGE_CODE_1 = '12345';

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doCustomSetup('POTATO', 'COFFEE')
    .then((obj) => {
      obj.value = 111;
      return Sample.create(obj);
    })
    .then(() => u.doCustomSetup('GELATO', 'COLUMBIA'))
    .then((obj) => {
      obj.value = String(THREE);
      return Sample.create(obj);
    })
    .then(() => u.doCustomSetup('SPECIAL', 'UNIQUE'))
    .then((obj) => {
      obj.value = String(THREE);
      obj.messageCode = MESSAGE_CODE_1;
      return Sample.create(obj);
    })
    .then((samp) => samp.update({ value: String(ONE) }))
    .then(() => { // sample updated
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('no asterisk is treated as "equals" for value', (done) => {
    api.get(path + '?value=' + ONE)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].value).to.equal(String(ONE));
    })
    .end(done);
  });

  it('no asterisk is treated as "equals" for name', (done) => {
    const NAME = tu.namePrefix + 'COFFEE|' + tu.namePrefix + 'POTATO';
    api.get(path + '?name=' + NAME)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].name).to.equal(NAME);
    })
    .end(done);
  });

  it('trailing asterisk is treated as "starts with"', (done) => {
    api.get(path + '?name=' + tu.namePrefix + '*')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(THREE);
      res.body.map((sample) => {
        expect(sample.name.slice(ZERO, THREE)).to.equal(tu.namePrefix);
      });
    })
    .end(done);
  });

  it('leading asterisk is treated as "ends with"', (done) => {
    api.get(path + '?name=*O')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(TWO);
      res.body.map((sample) => {
        expect(sample.name.slice(-TWO)).to.equal('TO');
      });
    })
    .end(done);
  });

  it('leading and trailing asterisks are treated as "contains"', (done) => {
    api.get(path + '?name=*ATO*')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      res.body.map((sample) => {
        expect(sample.name).to.contain('ATO');
      });
    })
    .end(done);
  });

  it('filter by value', (done) => {
    api.get(path + '?value=' + ONE)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].value).to.equal(String(ONE));
    })
    .end(done);
  });

  it('filter by messageCode.', (done) => {
    api.get(path + '?messageCode=' + MESSAGE_CODE_1)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].messageCode).to.equal(MESSAGE_CODE_1);
    })
    .end(done);
  });

  it('filter by status', (done) => {
    api.get(path + '?status=Critical')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].status).to.equal('Critical');
    })
    .end(done);
  });

  it('filter by status: should be case-insensitive', (done) => {
    api.get(path + '?status=critical')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].status).to.equal('Critical');
      done();
    });
  });

  it('filter by previousStatus: should be case-insensitive', (done) => {
    api.get(path + '?previousStatus=critical')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].previousStatus).to.equal('Critical');
      done();
    });
  });

  it('filter by previousStatus', (done) => {
    api.get(path + '?previousStatus=Critical')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].previousStatus).to.equal('Critical');
      expect(res.body[ZERO].status).to.equal('Invalid');
    })
    .end(done);
  });
});
