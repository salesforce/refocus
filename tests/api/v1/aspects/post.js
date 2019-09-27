/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/aspects';
const Aspect = tu.db.Aspect;
const expect = require('chai').expect;
const featureToggles = require('feature-toggles');
const ZERO = 0;
const ONE = 1;

describe('tests/api/v1/aspects/post.js >', () => {
  let token;
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('OK', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .end(done);
  });

  it('posting with readOnly field id should fail', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}ASPECTNAME`,
      isPublished: true,
      timeout: '110s',
      id: 'abcd1234',
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

  describe('post duplicate fails >', () => {
    beforeEach((done) => {
      Aspect.create(u.toCreate)
      .then(() => done())
      .catch(done);
    });

    it('with identical name', (done) => {
      const aspectToPost = {
        name: u.toCreate.name,
        timeout: '110s',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });

    it('with case different name', (done) => {
      const aspectToPost = {
        name: u.toCreate.name.toLowerCase(),
        timeout: '110s',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });
  });

  describe('post aspect with Tags >', () => {
    it('post aspect with tags', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}HeartRate`,
        timeout: '110s',
      };
      const tags = ['___na', '___continent'];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.tags).to.have.length(tags.length);
      })
      .end(done);
    });

    it('cannot post aspect with tags names starting with -', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}HeartRate`,
        timeout: '110s',
      };
      const tags = ['-___na', '___continent'];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body).to.property('errors');
        expect(res.body.errors[ZERO].type)
          .to.equal(tu.schemaValidationErrorName);
      })
      .end(done);
    });

    it('posting aspect with duplicate tags', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Pressure`,
        timeout: '110s',
      };
      const tags = ['___na', '___na'];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('DuplicateFieldError');
        done();
      });
    });

    it('post aspect with tags of size zero', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
      };
      const tags = [];
      aspectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.tags).to.have.length(tags.length);
      })
      .end(done);
    });

    it('tags and related links set to empty array if not provided', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.tags).to.eql([]);
        expect(res.body.relatedLinks).to.eql([]);
      })
      .end(done);
    });
  });

  describe('validate helpEmail/helpUrl required >', () => {
    const toggleOrigValue = featureToggles.isFeatureEnabled(
      'requireHelpEmailOrHelpUrl'
    );
    before(() => tu.toggleOverride('requireHelpEmailOrHelpUrl', true));
    after(() => tu.toggleOverride(
      'requireHelpEmailOrHelpUrl', toggleOrigValue)
    );

    it('NOT OK, post aspect with no helpEmail or helpUrl', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('ValidationError');
        expect(res.body.errors[0].description).to.equal(
          'At least one these attributes are required: helpEmail,helpUrl'
        );
        done();
      });
    });

    it('NOT OK, post aspect with empty helpEmail or helpUrl', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
        helpEmail: '',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('ValidationError');
        expect(res.body.errors[0].description).to.equal(
          'At least one these attributes are required: helpEmail,helpUrl'
        );
        done();
      });
    });

    it('OK, post aspect with only helpEmail', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
        helpEmail: 'abc@xyz.com',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });

    it('OK, post aspect with only helpUrl', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
        helpUrl: 'http://abc.com',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://abc.com');
      })
      .end(done);
    });

    it('OK, post aspect with both helpUrl and helpEmail', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
        helpUrl: 'http://abc.com',
        helpEmail: 'abc@xyz.com',
      };
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://abc.com');
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });
  });

  describe('post aspect with status ranges >', () => {
    const aspectToPost = {
      name: `${tu.namePrefix}Weight`,
      timeout: '110s',
      helpUrl: 'http://abc.com',
      helpEmail: 'abc@xyz.com',
    };

    it('OK, valueType=boolean, ranges valid', (done) => {
      aspectToPost.okRange = [0, 0];
      aspectToPost.criticalRange = [1, 1];
      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.okRange).to.be.eql([0, 0]);
        expect(res.body.criticalRange).to.be.eql([1, 1]);
      })
      .end(done);
    });

    it('not OK, valueType=boolean, ranges invalid', (done) => {
      aspectToPost.okRange = [0, 1];
      aspectToPost.criticalRange = [1, 1];

      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('InvalidAspectStatusRange');
        expect(res.body.errors[0].message).to.equal(
          'Value type: BOOLEAN can only have ranges: [0,0] or [1,1]'
        );
        done();
      });
    });

    it('OK, valueType=numeric, ranges valid', (done) => {
      aspectToPost.okRange = [-45, 70];
      aspectToPost.criticalRange = [70, 900];
      aspectToPost.valueType = 'NUMERIC';

      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.okRange).to.be.eql([-45, 70]);
        expect(res.body.criticalRange).to.be.eql([70, 900]);
      })
      .end(done);
    });

    it('not OK, valueType=numeric, ranges invalid', (done) => {
      aspectToPost.okRange =  [Number.MIN_SAFE_INTEGER - 10, 0];
      aspectToPost.criticalRange = [1, 1];
      aspectToPost.valueType = 'NUMERIC';

      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('InvalidAspectStatusRange');
        expect(res.body.errors[0].message).to.equal(
          'Value type: NUMERIC can only have ranges with min value: -9007199254740991, ' +
          'max value: 9007199254740991'
        );
        done();
      });
    });

    it('OK, valueType=percent, ranges valid', (done) => {
      aspectToPost.okRange = [0, 50];
      aspectToPost.criticalRange = [60, 100];
      aspectToPost.valueType = 'PERCENT';

      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.okRange).to.be.eql([0, 50]);
        expect(res.body.criticalRange).to.be.eql([60, 100]);
      })
      .end(done);
    });

    it('not OK, valueType=percent, ranges invalid', (done) => {
      aspectToPost.okRange = [-5, 50];
      aspectToPost.criticalRange = [1, 100];
      aspectToPost.valueType = 'PERCENT';

      api.post(path)
      .set('Authorization', token)
      .send(aspectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('InvalidAspectStatusRange');
        expect(res.body.errors[0].message).to.equal(
          'Value type: PERCENT can only have ranges with min value: 0, ' +
          'max value: 100'
        );
        done();
      });
    });
  });
});
