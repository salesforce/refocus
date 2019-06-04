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
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gu = require('../generators/utils');
const gtu = require('../generatorTemplates/utils');
const featureToggles = require('feature-toggles');
const Promise = require('bluebird');
supertest.Test.prototype.endAsync =
  Promise.promisify(supertest.Test.prototype.end);
const Aspect = tu.db.Aspect;
const Sample = tu.Sample;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
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

    it('tags and related links set to empty array if not provided', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
      };
      api.put(`${path}/${aspectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
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
      return Aspect.findByPk(aspectId)
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

  describe('referenced by a Generator >', () => {
    let token;
    const asp1 = {
      name: `${tu.namePrefix}ASPECT1`,
      isPublished: true,
      timeout: '60s',
    };
    const asp2 = {
      name: `${tu.namePrefix}ASPECT2`,
      isPublished: true,
      timeout: '60s',
    };
    const asp3 = {
      name: `${tu.namePrefix}ASPECT3`,
      isPublished: true,
      timeout: '60s',
    };
    const sgt1 = gtu.getGeneratorTemplate();
    const gen1 = gu.getGenerator();
    gen1.name = 'sample-generator-1';
    gen1.generatorTemplate.name = sgt1.name;
    gen1.generatorTemplate.version = sgt1.version;
    gen1.aspects = [asp1.name, asp2.name];
    const gen2 = gu.getGenerator();
    gen2.name = 'sample-generator-2';
    gen2.generatorTemplate.name = sgt1.name;
    gen2.generatorTemplate.version = sgt1.version;
    gen2.aspects = [asp2.name, asp3.name.toLowerCase()];

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      Aspect.create(asp1)
      .then(() => Aspect.create(asp2))
      .then(() => Aspect.create(asp3))
      .then(() => GeneratorTemplate.create(sgt1))
      .then(() => Generator.create(gen1))
      .then(() => Generator.create(gen2))
      .then(() => done())
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('unpublish fails', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(asp1));
      aspectObj.isPublished = false;

      api.put(`${path}/${asp1.name}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors).to.be.an('array').with.lengthOf(1);
        expect(res.body.errors[0].type).to.equal('ReferencedByGenerator');
        expect(res.body.errors[0].message).to.equal(
          'Cannot unpublish Aspect ___ASPECT1. It is currently in use by a ' +
          'Sample Generator: sample-generator-1'
        );
      })
      .end(done);
    });

    it('rename fails', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(asp1));
      aspectObj.name = 'UPDATED_NAME';

      api.put(`${path}/${asp1.name}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors).to.be.an('array').with.lengthOf(1);
        expect(res.body.errors[0].type).to.equal('ReferencedByGenerator');
        expect(res.body.errors[0].message).to.equal(
          'Cannot rename Aspect ___ASPECT1. It is currently in use by a ' +
          'Sample Generator: sample-generator-1'
        );
      })
      .end(done);
    });

    it('unpublish fails (multiple generators)', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(asp2));
      aspectObj.isPublished = false;

      api.put(`${path}/${asp2.name}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors).to.be.an('array').with.lengthOf(1);
        expect(res.body.errors[0].type).to.equal('ReferencedByGenerator');
        expect(res.body.errors[0].message).to.equal(
          'Cannot unpublish Aspect ___ASPECT2. It is currently in use by 2 ' +
          'Sample Generators: sample-generator-1,sample-generator-2'
        );
      })
      .end(done);
    });

    it('rename fails (multiple generators)', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(asp2));
      aspectObj.name = 'UPDATED_NAME';

      api.put(`${path}/${asp2.name}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors).to.be.an('array').with.lengthOf(1);
        expect(res.body.errors[0].type).to.equal('ReferencedByGenerator');
        expect(res.body.errors[0].message).to.equal(
          'Cannot rename Aspect ___ASPECT2. It is currently in use by 2 ' +
          'Sample Generators: sample-generator-1,sample-generator-2'
        );
      })
      .end(done);
    });

    it('unpublish fails (case insensitive)', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(asp3));
      aspectObj.isPublished = false;

      api.put(`${path}/${asp3.name}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors).to.be.an('array').with.lengthOf(1);
        expect(res.body.errors[0].type).to.equal('ReferencedByGenerator');
        expect(res.body.errors[0].message).to.equal(
          'Cannot unpublish Aspect ___ASPECT3. It is currently in use by a ' +
          'Sample Generator: sample-generator-2'
        );
      })
      .end(done);
    });

    it('rename fails (case insensitive)', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(asp3));
      aspectObj.name = 'UPDATED_NAME';

      api.put(`${path}/${asp3.name}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body.errors).to.be.an('array').with.lengthOf(1);
        expect(res.body.errors[0].type).to.equal('ReferencedByGenerator');
        expect(res.body.errors[0].message).to.equal(
          'Cannot rename Aspect ___ASPECT3. It is currently in use by a ' +
          'Sample Generator: sample-generator-2'
        );
      })
      .end(done);
    });

    it('other updates ok', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(asp1));
      aspectObj.timeout = '4s';

      api.put(`${path}/${asp1.name}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.have.property('timeout', '4s');
      })
      .end(done);
    });
  });

  describe('status ranges >', () => {
    let createdAspId;

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    const aspObj = {
      name: `${tu.namePrefix}Weight`,
      timeout: '110s',
      helpUrl: 'http://abc.com',
      helpEmail: 'abc@xyz.com',
    };

    beforeEach((done) => {
      Aspect.create(aspObj)
      .then((asp) => {
        createdAspId = asp.id;
        done();
      })
      .catch(done);
    });

    it('OK, valueType=boolean, ranges valid', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(aspObj));
      aspectObj.okRange = [1, 1];
      aspectObj.criticalRange = [0, 0];
      aspectObj.valueType = 'BOOLEAN';

      api.put(`${path}/${createdAspId}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.okRange).to.be.eql([1, 1]);
        expect(res.body.criticalRange).to.be.eql([0, 0]);
      })
      .end(done);
    });

    it('not OK, valueType=boolean, ranges invalid', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(aspObj));
      aspectObj.okRange = [1, 1];
      aspectObj.criticalRange = [0, 1];
      aspectObj.valueType = 'BOOLEAN';

      api.put(`${path}/${createdAspId}`)
      .set('Authorization', token)
      .send(aspectObj)
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
      const aspectObj = JSON.parse(JSON.stringify(aspObj));
      aspectObj.okRange = [-11, 100];
      aspectObj.criticalRange = [105, 50000];
      aspectObj.valueType = 'NUMERIC';

      api.put(`${path}/${createdAspId}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.okRange).to.be.eql([-11, 100]);
        expect(res.body.criticalRange).to.be.eql([105, 50000]);
      })
      .end(done);
    });

    it('not OK, valueType=numeric, ranges invalid', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(aspObj));
      aspectObj.okRange = [Number.MIN_SAFE_INTEGER - 50, 100];
      aspectObj.criticalRange = [105, 50000];
      aspectObj.valueType = 'NUMERIC';

      api.put(`${path}/${createdAspId}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('InvalidAspectStatusRange');
        expect(res.body.errors[0].message).to.equal(
          'Value type: NUMERIC can only have ranges with min value: ' +
          '-9007199254740991, max value: 9007199254740991'
        );
        done();
      });
    });

    it('OK, valueType=percent, ranges valid', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(aspObj));
      aspectObj.okRange = [0, 70];
      aspectObj.criticalRange = [75, 100];
      aspectObj.valueType = 'PERCENT';

      api.put(`${path}/${createdAspId}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.okRange).to.be.eql([0, 70]);
        expect(res.body.criticalRange).to.be.eql([75, 100]);
      })
      .end(done);
    });

    it('not OK, valueType=percent, ranges invalid', (done) => {
      const aspectObj = JSON.parse(JSON.stringify(aspObj));
      aspectObj.okRange = [-70, 70];
      aspectObj.criticalRange = [75, 100];
      aspectObj.valueType = 'PERCENT';

      api.put(`${path}/${createdAspId}`)
      .set('Authorization', token)
      .send(aspectObj)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('InvalidAspectStatusRange');
        expect(res.body.errors[0].message).to.equal(
          'Value type: PERCENT can only have ranges with min value: ' +
          '0, max value: 100'
        );
        done();
      });
    });
  });
});
