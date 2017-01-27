/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/get.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const path = '/v1/aspects';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;

describe(`api: GET ${path}`, () => {
  let token;
  const toCreate = [
    {
      description: 'this is a0 description',
      helpEmail: 'a0@bar.com',
      helpUrl: 'http://www.bar.com/a0',
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: true,
      name: `${tu.namePrefix}a0`,
      timeout: '30s',
      valueLabel: 'ms',
      valueType: 'NUMERIC',
      rank: 2,
    }, {
      description: 'this is a1 description',
      helpEmail: 'a1@bar.com',
      helpUrl: 'http://www.bar.com/a1',
      imageUrl: 'http://www.bar.com/a1.jpg',
      isPublished: false,
      name: `${tu.namePrefix}a1`,
      timeout: '1m',
      valueLabel: '%',
      valueType: 'PERCENT',
      rank: 1,
    },
    {
      description: 'this is a2 description',
      helpEmail: 'a1@bar.com',
      helpUrl: 'http://www.bar.com/a1',
      imageUrl: 'http://www.bar.com/a1.jpg',
      isPublished: false,
      name: `${tu.namePrefix}a2`,
      timeout: '1m',
      rank: 3,
    },
  ];

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.bulkCreate(toCreate)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('Single Values: ', () => {
    it('filter by BOOLEAN returns expected values', (done) => {
      api.get(path + '?valueType=PERCENT') // BOOLEAN is default
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.be.equal(ONE);
        expect(res.body[ZERO].valueType).to.be.equal('PERCENT');
      })
      .end((err /* , res */) => done(err));
    });

    it('key used twice in url', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0&description=foo&name=xyz`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('no asterisk is treated as "equals"', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ONE) ||
          res.body[ZERO].name !== `${tu.namePrefix}a0`) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('with same name and different case succeeds', (done) => {
      const name = toCreate[ZERO].name;
      api.get(path + '?name=' + name.toUpperCase())
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[ZERO].name).to.equal(name);
        done();
      });
    });

    it('trailing asterisk is treated as "starts with"', (done) => {
      api.get(`${path}?name=${tu.namePrefix}*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.be.equal(THREE);
        res.body.map((aspect) => {
          expect(aspect.name.slice(ZERO, THREE)).to.equal(tu.namePrefix);
        });
      })
      .end((err /* , res */) => done(err));
    });

    it('leading asterisk is treated as "ends with"', (done) => {
      api.get(`${path}?name=*a1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ONE) ||
          res.body[ZERO].name !== `${tu.namePrefix}a1`) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('leading and trailing asterisks are treated as "contains"', (done) => {
      api.get(`${path}?name=*_a*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, THREE)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('multiple asterisks treated as wildcards', (done) => {
      api.get(`${path}?name=***foo`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ZERO)) {
          throw new Error('expecting 0 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('inner asterisks are treated as wildcards', (done) => {
      api.get(`${path}?name=foo*bar`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ZERO)) {
          throw new Error('expecting 0 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('url encoding', (done) => {
      api.get(`${path}?description=this%20is%20a0%20description`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, ONE)) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });
  }); // Single Values

  describe('Lists: ', () => {
    it('no wildcards', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0,${tu.namePrefix}a1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, TWO)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('with wildcards', (done) => {
      api.get(`${path}?name=*a*,${tu.namePrefix}*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.be.equal(THREE);
        res.body.map((aspect) => {
          expect(aspect.name).to.contain('a');
        });
      })
      .end((err /* , res */) => done(err));
    });
  }); // Lists

  describe('Aspect Sorting by rank: ', () => {
    it('sort ascending', (done) => {
      api.get(`${path}?sort=rank`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(THREE);
        expect(res.body[ZERO].rank).to.equal(ONE);
        expect(res.body[ONE].rank).to.equal(TWO);
        expect(res.body[TWO].rank).to.equal(THREE);

        done();
      });
    });

    it('sort descending', (done) => {
      api.get(`${path}?sort=-rank`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(THREE);
        expect(res.body[ZERO].rank).to.equal(THREE);
        expect(res.body[ONE].rank).to.equal(TWO);
        expect(res.body[TWO].rank).to.equal(ONE);

        done();
      });
    });
  }); // aspect rank
});
