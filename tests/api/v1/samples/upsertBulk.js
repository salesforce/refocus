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
const api = supertest(require('../../../../express').app);
const tu = require('../../../testUtils');
const u = require('./utils');
const constants = require('../../../../api/v1/constants');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.Sample;
const path = '/v1/samples/upsert/bulk';
const URL1 = 'https://samples.com';
const relatedLinks = [
  { name: 'link1', url: URL1 },
  { name: 'link2', url: URL1 },
];

describe(`tests/api/v1/samples/upsertBulk.js, POST ${path} >`, () => {
  let token;
  let aspectIdOne = '';
  let aspectIdTwo = '';

  before((done) => {
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
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then((aspectOne) => {
      aspectIdOne = aspectOne.id;
      return Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect2`,
        timeout: '10m',
        valueType: 'NUMERIC',
        okRange: [10, 100],
      });
    })
    .then((aspectTwo) => {
      aspectIdTwo = aspectTwo.id;
      return Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      });
    })
    .then(() => done())
    .catch(done);
  });

  before(u.populateRedis);
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
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  it('fail without token', (done) => {
    api.post(path)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/ForbiddenError/)
    .end(done);
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
    .end(done);
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
    .end(done);
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
    .end(done);
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
    .end(done);
  });

  it('bulk upsert should return OK even if every sample in the request ' +
    'has readonly fields in them', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}AspectX`,
        value: '2',
        status: 'Invalid',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}AspectX`,
        value: '4',
        statusChangedAt: new Date().toString(),
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.status).to.equal('OK');
      return done();
    });
  });

  it('samples with read only fields in them should not be upserted', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '10',
        status: 'Info',
      },
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '10',
      },
    ])
    .expect(constants.httpStatus.OK)
    .then(() => {
      /*
       * the bulk api is asynchronous. The delay is used to give sometime for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get('/v1/samples?name=' +
        `${tu.namePrefix}Subject|${tu.namePrefix}Aspect*`)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(2);
          expect(res.body[0].value).to.not.equal('10');
          expect(res.body[1].value).to.equal('10');
          return done();
        });
      }, 100);
    });
  });

  describe('when sample already exists >', () => {
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
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
          .to.equal(`${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`);
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
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
          .to.equal(`${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`);
          done();
        });
      });
    });
  });

  describe('aspect isPublished false >', () => {
    // unpublish the aspects
    before((done) => {
      Aspect.findByPk(aspectIdOne)
      .then((aspectOne) => aspectOne.update({
        isPublished: false,
      }))
      .then(() => Aspect.findByPk(aspectIdTwo))
      .then((aspectOne) => aspectOne.update({
        isPublished: false,
      }))
      .then(() => done())
      .catch(done);
    });

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
      .end((err /* , res*/) => {
        if (err) {
          done(err);
        }

        Sample.findAll()
        .then((samp) => {
          expect(samp).to.have.length(0);
        })
        .catch(done);
        done();
      });
    });
  });
});
