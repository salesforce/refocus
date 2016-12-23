/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

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
  after(tu.forceDeleteUser);

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

  it('upsert bulk when sample already exists and check' +
  'that duplication of sample is not happening', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([{
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
      value: '5',
    }])
    .then(() => {
      api.get('/v1/samples?name=' +
        `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`)
      .expect((res) => {
        setTimeout(() => {
          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
          .to.contain(`${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`);
        }, 500);
      })
      .end((err) => {
        if (err) {
          return done(err);
        }

        return done();
      });
    });
  });

  it('check case insensitivity upsert bulk when sample already exists ' +
  'and check that duplication of sample is not happening', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([{
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`.toLowerCase(),
      value: '2',
    }])
    .then(() => {
      api.get('/v1/samples?name=' +
        `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`)
      .expect((res) => {
        setTimeout(() => {
          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
          .to.contain(`${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`
            .toLowerCase());
        }, 500);
      })
      .end((err) => {
        if (err) {
          return done(err);
        }

        return done();
      });
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
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
    })
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
    .expect(constants.httpStatus.OK)
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
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

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
  after(tu.forceDeleteUser);

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
