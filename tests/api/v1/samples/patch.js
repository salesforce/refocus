/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/patch.js
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
const ZERO = 0;

describe('tests/api/v1/samples/patch.js >', () => {
  let token;
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteUser);

  describe(`PATCH ${path} >`, () => {
    let sampleName;
    let sampUpdatedAt;
    let sampleValue;

    beforeEach((done) => {
      u.doSetup()
      .then((samp) => Sample.create(samp))
      .then((samp) => {
        sampleName = samp.name;
        sampUpdatedAt = samp.updatedAt;
        sampleValue = samp.value;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('reject if name field in request', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({ name: '2' })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.contain('ValidationError');
        done();
      });
    });

    it('apiLinks"s href ends with sample name updatedAt', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const { apiLinks } = res.body;
        expect(apiLinks.length).to.be.above(ZERO);
        let href = '';
        for (let j = apiLinks.length - 1; j >= ZERO; j--) {
          href = apiLinks[j].href;
          if (apiLinks[j].method != 'POST') {
            expect(href.split('/').pop()).to.equal(u.sampleName);
          } else {
            expect(href).to.equal(path);
          }
        }

        done();
      });
    });

    describe('UpdatedAt tests >', () => {
      it('without value does not increment updatedAt', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({})
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const result = res.body;
          const dateToInt = new Date(result.updatedAt).getTime();
          expect(dateToInt).to.be.equal(sampUpdatedAt.getTime());
          done();
        });
      });

      it('with only identical value increments updatedAt', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({ value: sampleValue })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const result = res.body;
          const dateToInt = new Date(result.updatedAt).getTime();
          expect(dateToInt).to.be.above(sampUpdatedAt.getTime());
          done();
        });
      });
    });

    describe('Lists >', () => {
      it('basic patch does not return id', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({ value: '3' })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.id).to.be.undefined;
          done();
        });
      });

      it('basic patch /samples', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({ value: '3' })
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          if (!(res && res.body &&
            res.body.status === constants.statuses.Warning)) {
            throw new Error('Incorrect Status Value');
          }
        })
        .end(done);
      });
    });

    //
    // The relatedlinks are named differently in each of the tests to avoid
    // turning the before and after hooks to beforeEach and afterEach
    //
    describe('Patch Related Links >', () => {
      it('single related link', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({
          value: '2',
          relatedLinks: [
            { name: 'link', url: 'https://samples.com' },
          ],
        })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.relatedLinks).to.have.length(1);
          expect(res.body.relatedLinks)
          .to.have.deep.property('[0].name', 'link');
          done();
        });
      });

      it('multiple relatedlinks', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({ value: '2', relatedLinks: [] })
        .expect(constants.httpStatus.OK)
        .end((err/* , res */) => {
          if (err) {
            return done(err);
          }

          api.patch(`${path}/${sampleName}`)
          .set('Authorization', token)
          .send({
            value: '2',
            relatedLinks: [
              { name: 'link0', url: 'https://samples.com' },
              { name: 'link1', url: 'https://samples.com' },
            ],
          })
          .expect(constants.httpStatus.OK)
          .end((_err, res) => {
            if (err) {
              done(err);
            }

            expect(res.body.relatedLinks).to.have.length(2);
            for (let i = ZERO; i < res.body.relatedLinks.length; i++) {
              /*
               * Link names are starting from link0 to link1 so adding the index
               * at the end to get the name dynamically.
               */
              expect(res.body.relatedLinks[i])
              .to.have.property('name', 'link' + i);
            }

            done();
          });
        });
      });

      it('with duplicate name', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({
          value: '2',
          relatedLinks: [
            { name: 'link4', url: 'https://samples.com' },
            { name: 'link4', url: 'https://samples.com' },
          ],
        })
        .expect((res) => {
          expect(res.body).to.have.property('errors');
          expect(res.body.errors[ZERO].message)
          .to.contain('Name of the relatedlinks should be unique');
          expect(res.body.errors[ZERO].source)
          .to.contain('relatedLinks');
        })
        .end(done);
      });

      it('patching with readOnly field id should fail', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({
          value: '2',
          id: 'abc123',
        })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].description)
          .to.contain('You cannot modify the read-only field: id');
          return done();
        });
      });

      it('patching with readOnly field status should fail', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({
          value: '2',
          status: 'Invalid',
        })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].description)
          .to.contain('You cannot modify the read-only field: status');
          return done();
        });
      });

      it('patching with readOnly field previousStatus should fail', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({
          value: '2',
          previousStatus: 'Invalid',
        })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].description)
          .to.contain('You cannot modify the read-only field: previousStatus');
          return done();
        });
      });

      it('patching with readOnly field statusChangedAt should fail', (done) => {
        api.patch(`${path}/${sampleName}`)
        .set('Authorization', token)
        .send({
          value: '2',
          statusChangedAt: new Date().toString(),
        })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].description)
          .to.contain('You cannot modify the read-only field: statusChangedAt');
          return done();
        });
      });
    });
  });

  describe(`PATCH ${path} subject isPublished false >`, () => {
    let sampleName;
    let token2;

    before((done) => {
      tu.createSecondUser()
      .then((u) => tu.createTokenFromUserName(u.name))
      .then((returnedToken) => {
        token2 = returnedToken;
        done();
      })
      .catch(done);
    });

    before((done) => {
      u.doSetup()
      .then((samp) => Sample.create(samp))
      .then((samp) => {
        sampleName = samp.name;
        samp.getSubject()
        .then((sub) => {
          sub.update({ isPublished: false });
          return done();
        })
        .catch((err) => {
          throw err;
        });
      })
      .catch(done);
    });

    after(u.forceDelete);

    it('cannot patch sample if subject not published', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token2)
      .send({ value: '3' })
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });

  describe(`PATCH ${path} aspect isPublished false >`, () => {
    let sampleName;
    let token3;

    before((done) => {
      tu.createThirdUser()
      .then((u) => tu.createTokenFromUserName(u.name))
      .then((returnedToken) => {
        token3 = returnedToken;
        done();
      })
      .catch(done);
    });

    before((done) => {
      u.doSetup()
      .then((samp) => Sample.create(samp))
      .then((samp) => {
        sampleName = samp.name;
        samp.getAspect()
        .then((asp) => {
          asp.update({ isPublished: false });
          return done();
        })
        .catch((err) => {
          throw err;
        });
      })
      .catch(done);
    });

    after(u.forceDelete);

    it('cannot patch sample if aspect not published', (done) => {
      api.patch(`${path}/${sampleName}`)
      .set('Authorization', token3)
      .send({ value: '3' })
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });
});
