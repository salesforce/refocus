/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/put.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const featureToggles = require('feature-toggles');
const Promise = require('bluebird');
supertest.Test.prototype.endAsync =
  Promise.promisify(supertest.Test.prototype.end);
const Aspect = tu.db.Aspect;
const Sample = tu.Sample;
const path = '/v1/aspects';
const samplePath = '/v1/samples';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/api/v1/aspects/put.js >', () => {
  let token;
  let aspectId = 0;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create(u.toCreate)
    .then((aspect) => {
      aspectId = aspect.id;
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('update timeout and verify', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
    };
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, ZERO)) {
        throw new Error('expecting aspect');
      }

      if (res.body.timeout !== toPut.timeout) {
        throw new Error('Incorrect timeout Value');
      }

      if (res.body.name !== toPut.name) {
        throw new Error('Incorrect name Value');
      }
    })
    .end(done);
  });

  it('with same name and different case ' +
    'successfully updates name', (done) => {
    const toPut = {
      name: u.toCreate.name.toLowerCase(),
      timeout: '220s',
    };
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(toPut.name);
      done();
    });
  });

  describe('with related links >', () => {
    it('update to add related links', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        relatedLinks: [
          { name: 'link1', url: 'https://samples.com' },
        ],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks).to.have.deep
          .property('[0].name', 'link1');
      })
      .end(done);
    });

    it('update to add existing related link', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        relatedLinks: [
          { name: 'link1', url: 'https://samples.com' },
        ],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks).to.have.deep
          .property('[0].name', 'link1');
      })
      .end(done);
    });

    it('update related links with some additions and deletions', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        relatedLinks: [
          { name: 'link0', url: 'https://samples.com' },
          { name: 'link1', url: 'https://samples.com' },
        ],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(TWO);
        for (let k = 0; k < res.body.relatedLinks.length; k++) {
          expect(res.body.relatedLinks[k])
            .to.have.property('name', 'link' + k);
        }
      })
      .end(done);
    });
  });

  it('put with readOnly field id should fail', (done) => {
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
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

  it('put with readOnly field isDeleted should fail', (done) => {
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
      isDeleted: 0,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description)
      .to.contain('You cannot modify the read-only field: isDeleted');
      return done();
    });
  });

  describe('with tags >', () => {
    it('update to add tags', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        tags: ['tagX'],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(ONE);
        expect(res.body.tags).to.have.members(['tagX']);
      })
      .end(done);
    });

    it('cannot update aspect tags with names starting with ' +
      'a dash(-)', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        tags: ['-tagX'],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body).to.property('errors');
          expect(res.body.errors[ZERO].type)
            .to.equal(tu.schemaValidationErrorName);
        })
      .end(done);
    });

    it('update to add existing tag', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        tags: ['tagX'],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(ONE);
        expect(res.body.tags).to.have.members(['tagX']);
      })
      .end(done);
    });

    it('update tags with some additions and deletions', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        tags: ['tag0', 'tag1'],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(toPut.tags.length);
        expect(res.body.tags).to.have.members(toPut.tags);
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        Aspect.findOne({ where: { id: aspectId } })
        .then((asp) => {
          expect(asp.tags).to.have.length(TWO);
          expect(asp.tags).to.have.members(toPut.tags);
        });
        done();
      });
    });

    it('duplicate tags fails', (done) => {
      const aspectToPost = {
        name: `${tu.namePrefix}Pressure`,
        timeout: '110s',
      };
      const tags = ['___na', '___na'];
      aspectToPost.tags = tags;

      api.put(`${path}/${aspectId}`)
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

    it('update to remove all tags', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        tags: [],
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(ZERO);
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        Aspect.findOne({ where: { id: aspectId } })
        .then((asp) => {
          expect(asp.tags).to.have.length(ZERO);
        });
        done();
      });
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

    it('NOT OK, put aspect with no helpEmail or helpUrl', (done) => {
      const aspectToPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '110s',
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(aspectToPut)
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

    it('NOT OK, put aspect with empty helpEmail or helpUrl', (done) => {
      const aspectToPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '110s',
        helpEmail: '',
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(aspectToPut)
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

    it('OK, put aspect with only helpEmail', (done) => {
      const aspectToPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '110s',
        helpEmail: 'abc@xyz.com',
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(aspectToPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });

    it('OK, put aspect with only helpUrl', (done) => {
      const aspectToPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '110s',
        helpUrl: 'http://abc.com',
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(aspectToPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://abc.com');
      })
      .end(done);
    });

    it('OK, put aspect with both helpUrl and helpEmail', (done) => {
      const aspectToPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '110s',
        helpUrl: 'http://abc.com',
        helpEmail: 'abc@xyz.com',
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(aspectToPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://abc.com');
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });
  });

  describe(`PUT ${path} isPublished >`, () => {
    const sampleName = `${u.subjectToCreate.name}|${u.toCreate.name}`;
    const subjectToCreateSecond = {
      description: 'this is sample description',
      help: {
        email: 'sample@bar.com',
        url: 'http://www.bar.com/a0',
      },
      imageUrl: 'http://www.bar.com/a0.jpg',
      isPublished: true,
      name: `${tu.namePrefix}TEST_SUBJECT1`,
    };

    beforeEach((done) => {
      const samp1 = { aspectId, value: '1' };
      const samp2 = { aspectId, value: '2' };
      tu.db.Subject.create(u.subjectToCreate)
      .then((s1) => {
        samp1.subjectId = s1.id;
        return tu.db.Subject.create(subjectToCreateSecond);
      })
      .then((s2) => {
        samp2.subjectId = s2.id;
      })
      .then(() => Sample.create(samp1))
      .then(() => Sample.create(samp2))
      .then(() => done())
      .catch(done);
    });

    beforeEach(u.populateRedis);
    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    function expectInResponse(res, props) {
      expect(res.body).to.include(props);
      return Promise.resolve();
    }

    function expectInDB(props) {
      return Aspect.findById(aspectId)
      .then((asp) => {
        expect(asp).to.include(props);
      });
    }

    function expectInSampleEmbed(sampleCount, props) {
      return api.get(samplePath)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .endAsync()
      .then((res) => {
        expect(res.body).to.have.length(sampleCount);
        res.body.forEach((sample) => expect(sample.aspect).to.include(props));
      });
    }

    it('updating aspect isPublished to true does not delete its samples',
      (done) => {
        const aspectObj = JSON.parse(JSON.stringify(u.toCreate));
        aspectObj.isPublished = true;
        aspectObj.timeout = '5s';
        const expected = {
          isPublished: true,
          timeout: '5s',
        };

        api.put(`${path}/${aspectId}`)
        .set('Authorization', token)
        .send(aspectObj)
        .expect(constants.httpStatus.OK)
        .endAsync()
        .then((res) => expectInResponse(res, expected))
        .then(() => expectInDB(expected))
        .then(() => expectInSampleEmbed(2, expected))
        .then(() => done())
        .catch(done);
      });

    it('updating aspect isPublished to false deletes its samples', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(u.toCreate));
      aspectObj.isPublished = false;
      aspectObj.timeout = '5s';
      const expected = {
        isPublished: false,
        timeout: '5s',
      };

      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.OK)
      .endAsync()
      .then((res) => expectInResponse(res, expected))
      .then(() => expectInDB(expected))
      .then(() => expectInSampleEmbed(0))
      .then(() => done())
      .catch(done);
    });

    it('updating aspect with isPublished missing deletes its samples,',
      (done) => {
        const aspectObj = JSON.parse(JSON.stringify(u.toCreate));
        delete aspectObj.isPublished;
        aspectObj.timeout = '5s';
        const expected = {
          isPublished: false,
          timeout: '5s',
        };

        api.put(`${path}/${aspectId}`)
        .set('Authorization', token)
        .send(aspectObj)
        .expect(constants.httpStatus.OK)
        .endAsync()
        .then((res) => expectInResponse(res, expected))
        .then(() => expectInDB(expected))
        .then(() => expectInSampleEmbed(0, expected))
        .then(() => done())
        .catch(done);
      });

    it('setting aspect name without changing it does not delete its samples',
      (done) => {
        const aspectObj = JSON.parse(JSON.stringify(u.toCreate));
        aspectObj.name = u.toCreate.name;

        api.put(`${path}/${aspectId}`)
        .set('Authorization', token)
        .send(aspectObj)
        .expect(constants.httpStatus.OK)
        .endAsync()
        .then((res) => expectInResponse(res, { name: u.toCreate.name }))
        .then(() => expectInDB({ name: u.toCreate.name }))
        .then(() => expectInSampleEmbed(2, { name: u.toCreate.name }))
        .then(() => done())
        .catch(done);
      });

    it('updating aspect name deletes its samples', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(u.toCreate));
      aspectObj.name = 'name_change';

      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.OK)
      .endAsync()
      .then((res) => expectInResponse(res, { name: 'name_change' }))
      .then(() => expectInDB({ name: 'name_change' }))
      .then(() => expectInSampleEmbed(0, { name: 'name_change' }))
      .then(() => done())
      .catch(done);
    });
  });
});
