/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/get.js
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
const redisCache = require('../../../../cache/redisCache').client.cache;
const featureToggles = require('feature-toggles');

describe(`tests/api/v1/samples/get.js, GET ${path} >`, () => {
  let sampleName;
  let token;
  let userId;

  before((done) => {
    tu.createUserAndToken()
    .then((obj) => {
      userId = obj.user.id;
      token = obj.token;
      done();
    })
    .catch(done);
  });
  after(tu.forceDeleteUser);

  describe('with returnUser toggle on, should return user object with ' +
    'profile field: ', () => {
    before((done) => {
      tu.toggleOverride('returnUser', true);
      u.doSetup()
      .then((samp) => {
        samp.provider = userId;
        return Sample.create(samp);
      })
      .then((samp) => {
        sampleName = samp.name;
        done();
      })
      .catch(done);
    });
    after(u.forceDelete);
    after(() => tu.toggleOverride('returnUser', false));

    it('get all', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(1);
        expect(res.body[0].provider).to.equal(userId);
        const user = res.body[0].user;
        expect(user).to.be.an('object');
        expect(user.name).to.be.an('string');
        expect(user.email).to.be.an('string');
        expect(user.profile.name).to.be.an('string');
        expect(res.header).to.have.property('x-total-count', '1');
        done();
      });
    });

    it('get by id', (done) => {
      api.get(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.status).to.equal(constants.statuses.Critical);
        expect(res.body.provider).to.equal(userId);
        const user = res.body.user;
        expect(user).to.be.an('object');
        expect(user.name).to.be.an('string');
        expect(user.email).to.be.an('string');
        expect(user.profile.name).to.be.an('string');
        done();
      });
    });
  });

  describe('with returnUser off: ', () => {
    before((done) => {
      u.doSetup()
      .then((samp) => Sample.create(samp))
      .then((samp) => {
        sampleName = samp.name;
        done();
      })
      .catch(done);
    });

    after(u.forceDelete);

    it('apiLinks in basic get end  with sample name', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        let href = '';
        for (let i = res.body.length - 1; i >= 0; i--) {
          const apiLinks = res.body[i].apiLinks;
          for (let j = apiLinks.length - 1; j >= 0; j--) {
            href = apiLinks[j].href;
            if (apiLinks[j].method != 'POST') {
              expect(href.split('/').pop()).to.equal(u.sampleName);
            } else {
              expect(href).to.equal(path);
            }
          }
        }
      })
      .end(done);
    });

    it('get all does not return user or profile field', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        for (let i = res.body.length - 1; i >= 0; i--) {
          expect(res.body[i].user).to.not.be.defined;
          expect(res.body[i].installedBy).to.not.be.defined;
        }
      })
      .end(done);
    });

    it('basic get', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (tu.gotExpectedLength(res.body, ZERO)) {
          throw new Error('expecting sample');
        }

        if (res.body[ZERO].status !== constants.statuses.Critical) {
          throw new Error('Incorrect Status Value');
        }
      })
      .end(done);
    });

    it('basic get does not return id', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.be.above(ZERO);
        expect(res.body[0].id).to.be.undefined;
        done();
      });
    });

    it('basic get: samples have statusChangedAt field', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        res.body.forEach((sample) => {
          expect(sample.statusChangedAt).to.be.an('string');
        });
        done();
      });
    });

    it('basic get: aspect does not have statusChangedAt', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        res.body.forEach((sample) => {
          expect(sample.aspect.statusChangedAt).to.be.undefined;
        });
        done();
      });
    });

    it('basic get by id', (done) => {
      api.get(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (tu.gotExpectedLength(res.body, ZERO)) {
          throw new Error('expecting sample');
        }

        if (res.body.status !== constants.statuses.Critical) {
          throw new Error('Incorrect Status Value');
        }
      })
      .end(done);
    });

    it('get by id does not return the user or provider field', (done) => {
      api.get(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.user).to.not.be.defined;
        expect(res.body.installedBy).to.not.be.defined;
      })
      .end(done);
    });

    it('by name is case in-sensitive', (done) => {
      const name = u.sampleName;
      api.get(`${path}/${name.toLowerCase()}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(name);
        done();
      });
    });

    it('does not return id', (done) => {
      const name = u.sampleName;
      api.get(`${path}/${name}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.id).to.be.undefined;
        done();
      });
    });
  });
});

describe(`tests/api/v1/samples/get.js, GET ${path} > ` +
  'cache the response >', () => {
  let sampleName;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      sampleName = samp.name;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('get with wildcard should cache response', (done) => {
    api.get(`${path}?name=${sampleName}*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get(`${sampleName}*`, (cacheErr, reply) => {
        if (cacheErr || !reply) {
          return done(cacheErr);
        }

        expect(JSON.parse(reply).length).to.be.above(ZERO);
        expect(JSON.parse(reply)[0].name).to.equal(`${sampleName}`);
        redisCache.del(`${sampleName}*`);
        done();
      });
    });
  });

  it('get without wildcard shold not cache response', (done) => {
    api.get(`${path}?name=${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get(`${sampleName}`, (cacheErr, reply) => {
        if (cacheErr || !reply) {
          expect(res.body.length).to.be.above(ZERO);
          done();
        }
      });
    });
  });
});
