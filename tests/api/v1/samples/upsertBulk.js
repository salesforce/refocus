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
const URL1 = 'https://samples.com';
const URL2 = 'https://updatedsamples.com';
const relatedLinks = [{
  name: 'link1', url: URL1,
}, {
  name: 'link2', url: URL1,
}];

describe('api: POST ' + path, () => {
  let token;
  let aspectIdOne = '';
  let aspectIdTwo = '';

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
    .then((aspectOne) => {
      aspectIdOne = aspectOne.id;
      return Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect2`,
        timeout: '10m',
        valueType: 'BOOLEAN',
        okRange: [10, 100],
      })
    })
    .then((aspectTwo) => {
      aspectIdTwo = aspectTwo.id;
      return Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
      })
    })
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
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
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
        return done(err);
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
        return done(err);
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
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  describe('upsert bulk when sample already exists', () => {
    it('check that duplication of sample is not happening', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send([{
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '6',
      }])
      .then(() => {
        api.get('/v1/samples?name=' +
          `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
          .to.equal(`${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`);
          return done();
        });
      });
    });

    it('check that duplication of sample is not happening even for ' +
    'sample name in different case', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send([{
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`.toLowerCase(),
        value: '6',
      }])
      .then(() => {
        api.get('/v1/samples?name=' +
          `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`)
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

  describe('aspect isPublished false', () => {
    // unpublish the aspects
    before((done) => {
      Aspect.findById(aspectIdOne)
      .then((aspectOne) => aspectOne.update({
        isPublished: false,
      }))
      .then(() => Aspect.findById(aspectIdTwo))
      .then((aspectOne) => aspectOne.update({
        isPublished: false,
      }))
      .then(() => done())
      .catch((err) => done(err));
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
          return done(err);
        }

        Sample.findAll()
        .then((samp) => {
          expect(samp).to.have.length(0);
        })
        .catch((_err) => done(_err));
        done();
      });
    });
  });
});

