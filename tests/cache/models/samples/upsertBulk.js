/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/upsertBulk.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const path = '/v1/samples/upsert/bulk';
const URL1 = 'https://samples.com';
const relatedLinks = [
  { name: 'link1', url: URL1 },
  { name: 'link2', url: URL1 },
];

describe('api::redisEnabled::POST::bulkUpsert ' + path, () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      criticalRange: [0, 1],
    })
    .then((aspectOne) => {
      return Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect2`,
        timeout: '10m',
        okRange: [10, 100],
      });
    })
    .then((aspectTwo) => {
      return Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      });
    })
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

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
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('some succeed, some fail returns ok', (done) => {
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
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('all fail returns ok', (done) => {
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
    .end((err /* , res */) => {
      if (err) {
        done(err);
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
        relatedLinks,
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
        relatedLinks,
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('duplicate relatedLinks and sample name sends back ok', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}AspectX`,
        value: '2',
        relatedLinks: [
          { name: 'link2', url: 'https://samples.com' },
          { name: 'link2', url: 'https://samples.com' },
        ],
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}AspectX`,
        value: '4',
        relatedLinks: [
          { name: 'link2', url: 'https://samples.com' },
          { name: 'link2', url: 'https://samples.com' },
        ],
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  describe('upsert bulk when sample already exists', () => {
    it('check that duplication of sample is not happening', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send([
        {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
          value: '6',
        },
      ])
      .then(() => {
        api.get('/v1/samples?name=' +
          `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
          .to.equal(`${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`);
          expect(res.body[0].value).to.be.equal('6');
          done();
        });
      });
    });

    it('check that duplication of sample is not happening even for ' +
    'sample name in different case', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send([
        {
          name:
            `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`.toLowerCase(),
          value: '6',
        },
      ])
      .then(() => {
        api.get('/v1/samples?name=' +
          `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name).to.equal(
            `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`.toLowerCase()
          );
          done();
        });
      });
    });
  });
});
