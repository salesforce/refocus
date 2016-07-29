/**
 * tests/api/v1/samples/upsertBulk.js
 */
'use strict';

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const u = require('./utils');
const constants = require('../../../../api/v1/constants');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.db.Sample;
const path = '/v1/samples/upsert/bulk';

describe('api: POST ' + path, () => {
  const token = tu.createToken();

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('all succeed', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(200)
    // .expect((res) => {
    //   if (!res.body) {
    //     throw new Error('expecting response');
    //   }
    //   if (res.body.successCount !== 2 ||
    //     res.body.failureCount > 0 ||
    //     res.body.errors.length > 0) {
    //     throw new Error('expecting 2 successes, no failures');
    //   }
    // })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('some succeed, some fail', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(200)
    // .expect((res) => {
    //   if (!res.body) {
    //     throw new Error('expecting response');
    //   }
    //   if (res.body.successCount !== 1 ||
    //     res.body.failureCount !== 1 ||
    //     res.body.errors.length !== 1) {
    //     throw new Error('expecting 1 success and 1 failure');
    //   }
    // })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('all fail', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}NOT_EXIST`,
        value: '4',
      },
    ])
    .expect(200)
    // .expect((res) => {
    //   if (!res.body) {
    //     throw new Error('expecting response');
    //   }
    //   if (res.body.successCount !== 0 ||
    //     res.body.failureCount !== 2 ||
    //     res.body.errors.length !== 2) {
    //     throw new Error('expecting 0 successes and 2 failures');
    //   }
    // })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('all succeed with relatedLinks', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
        relatedLinks: [{ name: 'link1', url: 'https://samples.com' },
                        { name: 'link2', url: 'https://samples.com' }]
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
        relatedLinks: [{ name: 'link1', url: 'https://samples.com' },
                        { name: 'link2', url: 'https://samples.com' }]
      },
    ])
    .expect(constants.httpStatus.OK)
    // .expect((res) => {
    //   expect(res.body.successCount).to.equal(2);
    //   expect(res.body.failureCount).to.equal(0);
    //   expect(res.body.errors).to.have.length(0);
    // })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('fail with relatedLinks', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}AspectX`,
        value: '2',
        relatedLinks: [{ name: 'link2', url: 'https://samples.com' },
                        { name: 'link2', url: 'https://samples.com' }]
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}AspectX`,
        value: '4',
        relatedLinks: [{ name: 'link2', url: 'https://samples.com' },
                        { name: 'link2', url: 'https://samples.com' }]
      },
    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      // expect(res.body.successCount).to.equal(0);
      // expect(res.body.failureCount).to.equal(2);
      // expect(res.body.errors).to.have.length(2);
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
describe('api: POST ' + path + ' aspect isPublished false', () => {
  const token = tu.createToken();

  before((done) => {
    Aspect.create({
      isPublished: false,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => Aspect.create({
      isPublished: false,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('no samples created if aspect isPublished is false', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .expect(() => {
      Sample.findAll()
      .then((samp) => {
        expect(samp).to.have.length(0);
      })
      .catch((_err) => done(_err));
    })
    .end((err /* , res*/) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
