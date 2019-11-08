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
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const bulkUpsert = require('../../../../cache/models/samples.js')
  .bulkUpsertByName;
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const path = '/v1/samples/upsert/bulk';
const URL1 = 'https://samples.com';
const relatedLinks = [
  { name: 'link1', url: URL1 },
  { name: 'link2', url: URL1 },
];

describe('tests/cache/models/samples/upsertBulk.js, ' +
`api::redisEnabled::POST::bulkUpsert ${path} >`, () => {
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
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then((aspectOne) => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'NUMERIC',
      okRange: [10, 100],
    }))
    .then((aspectTwo) => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject1`,
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject2`,
    }))
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('name field is required', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        value: '0',
      }, {
        value: '20',
      },
    ])
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const error = res.body.errors[0];
      expect(error.message).to.contain('name');
      expect(error.type).to.equal(tu.schemaValidationErrorName);
      return done();
    });
  });

  it('all succeed', (done) => {
    const samp1Name = `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`;
    const samp2Name = `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect2`;
    const samp3Name = `${tu.namePrefix}Subject2|${tu.namePrefix}Aspect2`;
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: samp1Name,
        value: '0',
      }, {
        name: samp2Name,
        value: '20',
      }, {
        name: samp3Name,
        value: '40',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  it('bulkUpsert method: all succeed', (done) => {
    const samp1Name = `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`;
    const samp2Name = `${tu.namePrefix}Subject2|${tu.namePrefix}Aspect1`;
    const samp3Name = `${tu.namePrefix}Subject2|${tu.namePrefix}Aspect2`;
    bulkUpsert([
      {
        name: samp1Name,
        value: '0',
      }, {
        name: samp2Name,
        value: '10',
      }, {
        name: samp3Name,
        value: '50',
      },
    ])
    .then((response) => {
      expect(response[0].name).to.be.equal(
        `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`
      );
      expect(response[0].status).to.be.equal('Critical');
      expect(response[1].name).to.be.equal(
        `${tu.namePrefix}Subject2|${tu.namePrefix}Aspect1`
      );
      expect(response[1].status).to.be.equal('Invalid');
      expect(response[2].name).to.be.equal(
        `${tu.namePrefix}Subject2|${tu.namePrefix}Aspect2`
      );
      expect(response[2].status).to.be.equal('OK');
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
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect2`,
        value: '4',
      }, {
        name: `${tu.namePrefix}Subject2|${tu.namePrefix}NOT_EXIST`,
        value: '6',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  it('bulkUpsert method: some succeed, some fail returns ok', (done) => {
    bulkUpsert([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect2`,
        value: '4',
      }, {
        name: `${tu.namePrefix}Subject2|${tu.namePrefix}Aspect2`,
        value: '4',
      },
      {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}NOT_EXIST`,
        value: '4',
      },
    ])
    .then((response) => {
      expect(response[0].isFailed).to.be.true;
      expect(response[1].name).to.be.equal(
        `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect2`
      );
      expect(response[2].name).to.be.equal(
        `${tu.namePrefix}Subject2|${tu.namePrefix}Aspect2`
      );
      expect(response[1].status).to.be.equal('Invalid');
      expect(response[3].isFailed).to.be.true;
      done();
    })
    .catch(done);
  });

  it('all fail returns ok', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}NOT_EXIST`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  it('bulkUpsert method: all fail', (done) => {
    bulkUpsert([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}NOT_EXIST`,
        value: '4',
      },
      {
        name: `${tu.namePrefix}Invalid_Name`,
        value: '4',
      },
    ])
    .then((response) => {
      expect(response[0].isFailed).to.be.true;
      expect(response[0].explanation).to.have.property('sample',
        `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`);
      expect(response[0].explanation).to.have.property('explanation',
        'subject for this sample was not found or has isPublished=false');
      expect(response[1].isFailed).to.be.true;
      expect(response[1].explanation).to.have.property('sample',
        `${tu.namePrefix}Subject1|${tu.namePrefix}NOT_EXIST`);
      expect(response[1].explanation).to.have.property('explanation',
        'aspect for this sample was not found or has isPublished=false');
      expect(response[2].isFailed).to.be.true;
      expect(response[2].explanation).to.have.property('name',
        'ResourceNotFoundError');
      expect(response[2].explanation).to.have.property('explanation',
        'Invalid sample name "___Invalid_Name"');
      done();
    })
      .catch(done);
  });

  it('all succeed with relatedLinks', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`,
        value: '2',
        relatedLinks,
      }, {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect2`,
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
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}AspectX`,
        value: '2',
        relatedLinks: [
          { name: 'link2', url: 'https://samples.com' },
          { name: 'link2', url: 'https://samples.com' },
        ],
      }, {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}AspectX`,
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

  it('bulk upsert should return OK even if every sample in the request has ' +
  'readonly fields in them', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}AspectX`,
        value: '2',
        status: 'Invalid',
      }, {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}AspectX`,
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

  it('samples with read only fields in them should not be upserted',
  (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`,
        value: '10',
        status: 'Info',
      },
      {
        name: `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect2`,
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
        `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect*`)
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

  it('bulkUpsert undefined sample query body', (done) => {
    bulkUpsert(undefined)
    .then((response) => {
      expect(response).to.be.empty;
      done();
    });
  });

  it('bulkUpsert empty sample query body array', (done) => {
    bulkUpsert([])
    .then((response) => {
      expect(response).to.be.empty;
      done();
    });
  });

  it('bulkUpsert null sample query body', (done) => {
    bulkUpsert(null)
    .then((response) => {
      expect(response).to.be.empty;
      done();
    });
  });

  describe('when sample already exists >', () => {
    it('check that duplication of sample is not happening', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send([
        {
          name: `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`,
          value: '6',
        },
      ])
      .then(() => {
        /*
         * the bulk api is asynchronous. The delay is used to give sometime for
         * the upsert operation to complete
         */
        setTimeout(() => {
          api.get('/v1/samples?name=' +
            `${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`)
          .set('Authorization', token)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body).to.have.length(1);
            expect(res.body[0].name)
            .to.equal(`${tu.namePrefix}Subject1|${tu.namePrefix}Aspect1`);
            expect(res.body[0].value).to.be.equal('6');
            return done();
          });
        }, 100);
      });
    });
  });
});
