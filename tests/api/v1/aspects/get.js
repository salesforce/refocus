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

describe(`api: GET ${path}`, () => {
  const token = tu.createToken();
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
    },
  ];

  before((done) => {
    Aspect.bulkCreate(toCreate)
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  describe('Single Values: ', () => {
    it('key used twice in url', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0&description=foo&name=xyz`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('no asterisk is treated as "equals"', (done) => {
      api.get(`${path}?name=${tu.namePrefix}a0`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 1) ||
          res.body[0].name !== `${tu.namePrefix}a0`) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('trailing asterisk is treated as "starts with"', (done) => {
      api.get(`${path}?name=${tu.namePrefix}*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 2)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('leading asterisk is treated as "ends with"', (done) => {
      api.get(`${path}?name=*a1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 1) ||
          res.body[0].name !== `${tu.namePrefix}a1`) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('leading and trailing asterisks are treated as "contains"', (done) => {
      api.get(`${path}?name=*_a*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 2)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('multiple asterisks treated as wildcards', (done) => {
      api.get(`${path}?name=***foo`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 0)) {
          throw new Error('expecting 0 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('inner asterisks are treated as wildcards', (done) => {
      api.get(`${path}?name=foo*bar`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 0)) {
          throw new Error('expecting 0 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('url encoding', (done) => {
      api.get(`${path}?description=this%20is%20a0%20description`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 1)) {
          throw new Error('expecting 1 aspect');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
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
        if (!tu.gotArrayWithExpectedLength(res.body, 2)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('with wildcards', (done) => {
      api.get(`${path}?name=*a*,${tu.namePrefix}*`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!tu.gotArrayWithExpectedLength(res.body, 2)) {
          throw new Error('expecting 2 aspects');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  }); // Lists
});
