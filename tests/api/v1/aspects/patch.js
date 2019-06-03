/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/patch.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const Promise = require('bluebird');
supertest.Test.prototype.endAsync =
  Promise.promisify(supertest.Test.prototype.end);
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gu = require('../generators/utils');
const gtu = require('../generatorTemplates/utils');
const Aspect = tu.db.Aspect;
const Sample = tu.Sample;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/aspects';
const samplePath = '/v1/samples';
const expect = require('chai').expect;
const featureToggles = require('feature-toggles');

describe('tests/api/v1/aspects/patch.js >', () => {
  describe(`PATCH ${path} >`, () => {
    let i = 0;
    const asp = u.toCreate;
    let token;

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
        i = aspect.id;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('update timeout and verfiy', (done) => {
      const newTimeout = '1000s';
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ timeout: newTimeout })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (tu.gotExpectedLength(res.body, 0)) {
          throw new Error('expecting aspect');
        }

        // tags and relatedLinks should be empty
        expect(res.body.tags).to.eql([]);
        expect(res.body.relatedLinks).to.eql([]);

        if (res.body.timeout !== newTimeout) {
          throw new Error('Incorrect timeout Value');
        }
      })
      .end(done);
    });

    it('patch relatedLinks', (done) => {
      const relatedLinks = [{ name: 'link1', url: 'https://samples.com' }];
      asp.relatedLinks = relatedLinks;
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send(asp)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(1);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'link1');
      })
      .end(done);
    });

    it('patch relatedLinks multiple', (done) => {
      const relatedLinks = [
        { name: 'link0', url: 'https://samples.com' },
        { name: 'link1', url: 'https://samples.com' },
        { name: 'link2', url: 'https://samples.com' },
      ];
      asp.relatedLinks = relatedLinks;
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send(asp)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
      })
      .end(done);
    });

    it('patch tags', (done) => {
      const tags = ['tag1'];
      asp.tags = tags;
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send(asp)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(1);
        expect(res.body.tags).to.have.members(['tag1']);
      })
      .end(done);
    });

    it('with same tags fails', (done) => {
      asp.tags = ['tag1', 'tag1'];
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send(asp)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].type).to.equal('DuplicateFieldError');
        done();
      });
    });

    it('patch tags multiple', (done) => {
      const tags = ['tag0', 'tag1', 'tag2'];
      asp.tags = tags;
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send(asp)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.tags).to.have.length(tags.length);
        expect(res.body.tags).to.have.members(tags);
        done();
      });
    });

    it('patching with readOnly field isDeleted should fail', (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ isDeleted: 0 })
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

    it('patching with readOnly field id should fail', (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ id: 'abcdefgh' })
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

    describe(`PATCH ${path} helpEmail, helpUrl not set in db >`, () => {
      const toggleOrigValue = featureToggles.isFeatureEnabled(
        'requireHelpEmailOrHelpUrl'
      );
      before(() => tu.toggleOverride('requireHelpEmailOrHelpUrl', true));
      after(() => tu.toggleOverride(
        'requireHelpEmailOrHelpUrl', toggleOrigValue)
      );

      it('NOT OK, no helpEmail or helpUrl in db or request body', (done) => {
        api.patch(`${path}/${i}`)
        .set('Authorization', token)
        .send({ name: 'name_change' })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].type).to.equal('ValidationError');
          expect(res.body.errors[0].description).to.equal(
            'At least one these attributes are required: helpEmail,helpUrl'
          );
          return done();
        });
      });

      it('NOT OK, no helpEmail/helpUrl in db, empty helpEmail in request body',
      (done) => {
        api.patch(`${path}/${i}`)
        .set('Authorization', token)
        .send({ helpEmail: '' })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].type).to.equal('ValidationError');
          expect(res.body.errors[0].description).to.equal(
            'At least one these attributes are required: helpEmail,helpUrl'
          );
          return done();
        });
      });

      it('OK, no helpEmail/helpUrl in db, valid helpEmail in request body',
      (done) => {
        api.patch(`${path}/${i}`)
        .set('Authorization', token)
        .send({ helpEmail: 'abc@xyz.com' })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
          expect(res.body.helpUrl).to.be.equal(undefined);
          done();
        });
      });

      it('OK, no helpEmail/helpUrl in db, valid helpUrl in request body',
      (done) => {
        api.patch(`${path}/${i}`)
        .set('Authorization', token)
        .send({ helpUrl: 'https://xyz.com' })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpEmail).to.be.equal(undefined);
          expect(res.body.helpUrl).to.be.equal('https://xyz.com');
          done();
        });
      });

      it('OK, no helpEmail/helpUrl in db, valid helpUrl and helpEmail in ' +
        'request body', (done) => {
        api.patch(`${path}/${i}`)
        .set('Authorization', token)
        .send({
          helpUrl: 'https://xyz.com',
          helpEmail: 'abc@xyz.com',
        })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
          expect(res.body.helpUrl).to.be.equal('https://xyz.com');
          return done();
        });
      });
    });
  });

  describe(`PATCH ${path} helpEmail or helpUrl set in db >`, () => {
    let token;
    const toggleOrigValue = featureToggles.isFeatureEnabled(
      'requireHelpEmailOrHelpUrl'
    );

    before((done) => {
      tu.toggleOverride('requireHelpEmailOrHelpUrl', true);
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride(
      'requireHelpEmailOrHelpUrl', toggleOrigValue)
    );

    it('OK, valid helpUrl in db, no helpEmail/helpUrl in request body',
    (done) => {
      const aspToCreate = JSON.parse(JSON.stringify(u.toCreate));
      aspToCreate.helpUrl = 'https://xyz.com';
      Aspect.create(aspToCreate)
      .then((asp) => {
        api.patch(`${path}/${asp.id}`)
        .set('Authorization', token)
        .send({ name: 'name_change' })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpUrl).to.be.equal('https://xyz.com');
          expect(res.body.helpEmail).to.be.equal(undefined);
          return done();
        });
      })
      .catch(done);
    });

    it('OK, valid helpEmail in db, no helpEmail/helpUrl in request body',
    (done) => {
      const aspToCreate = JSON.parse(JSON.stringify(u.toCreate));
      aspToCreate.helpEmail = 'abc@xyz.com';
      Aspect.create(aspToCreate)
      .then((asp) => {
        api.patch(`${path}/${asp.id}`)
        .set('Authorization', token)
        .send({ name: 'name_change' })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
          expect(res.body.helpUrl).to.be.equal(undefined);
          return done();
        });
      })
      .catch(done);
    });

    it('OK, valid helpEmail in db, valid helpUrl in request body',
    (done) => {
      const aspToCreate = JSON.parse(JSON.stringify(u.toCreate));
      aspToCreate.helpEmail = 'abc@xyz.com';
      Aspect.create(aspToCreate)
      .then((asp) => {
        api.patch(`${path}/${asp.id}`)
        .set('Authorization', token)
        .send({ helpUrl: 'https://xyz.com' })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
          expect(res.body.helpUrl).to.be.equal('https://xyz.com');
          return done();
        });
      })
      .catch(done);
    });

    it('OK, valid helpEmail in db, change helpEmail in request body',
    (done) => {
      const aspToCreate = JSON.parse(JSON.stringify(u.toCreate));
      aspToCreate.helpEmail = 'abc@xyz.com';
      Aspect.create(aspToCreate)
      .then((asp) => {
        api.patch(`${path}/${asp.id}`)
        .set('Authorization', token)
        .send({ helpEmail: 'changedAbc@xyz.com' })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpEmail).to.be.equal('changedAbc@xyz.com');
          expect(res.body.helpUrl).to.be.equal(undefined);
          return done();
        });
      })
      .catch(done);
    });

    it('OK, valid helpEmail and helpUrl in db, change helpEmail and ' +
      'helpUrl in request body',
    (done) => {
      const aspToCreate = JSON.parse(JSON.stringify(u.toCreate));
      aspToCreate.helpEmail = 'abc@xyz.com';
      aspToCreate.helpUrl = 'https://xyz.com';
      Aspect.create(aspToCreate)
      .then((asp) => {
        api.patch(`${path}/${asp.id}`)
        .set('Authorization', token)
        .send({
          helpEmail: 'changedAbc@xyz.com',
          helpUrl: 'https://changedXyz.com',
        })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.helpEmail).to.be.equal('changedAbc@xyz.com');
          expect(res.body.helpUrl).to.be.equal('https://changedXyz.com');
          return done();
        });
      })
      .catch(done);
    });
  });

  describe(`PATCH ${path} isPublished >`, () => {
    let i = 0;
    let token;

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

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      const samp1 = { value: '1' };
      const samp2 = { value: '2' };
      Aspect.create(u.toCreate)
      .then((a) => {
        i = a.id;
        samp1.aspectId = a.id;
        samp2.aspectId = a.id;
        return tu.db.Subject.create(u.subjectToCreate);
      })
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
      return Aspect.findByPk(i)
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

    it('updating aspect isPublished to true does not delete its samples', (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ isPublished: true })
      .expect(constants.httpStatus.OK)
      .endAsync()
      .then((res) => expectInResponse(res, { isPublished: true }))
      .then(() => expectInDB({ isPublished: true }))
      .then(() => expectInSampleEmbed(2, { isPublished: true }))
      .then(() => done())
      .catch(done);
    });

    it('updating aspect isPublished to false deletes its samples', (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ isPublished: false })
      .expect(constants.httpStatus.OK)
      .endAsync()
      .then((res) => expectInResponse(res, { isPublished: false }))
      .then(() => expectInDB({ isPublished: false }))
      .then(() => expectInSampleEmbed(0, { isPublished: false }))
      .then(() => done())
      .catch(done);
    });

    it('updating aspect without changing isPublished does not delete its ' +
      'samples', (done) => {
        api.patch(`${path}/${i}`)
        .set('Authorization', token)
        .send({ timeout: '5s' })
        .expect(constants.httpStatus.OK)
        .endAsync()
        .then((res) => expectInResponse(res, { isPublished: true, timeout: '5s' }))
        .then(() => expectInDB({ isPublished: true, timeout: '5s' }))
        .then(() => expectInSampleEmbed(2, { isPublished: true, timeout: '5s' }))
        .then(() => done())
        .catch(done);
      });

    it('setting aspect name without changing it does not delete its samples',
    (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ name: u.toCreate.name })
      .expect(constants.httpStatus.OK)
      .endAsync()
      .then((res) => expectInResponse(res, { name: u.toCreate.name }))
      .then(() => expectInDB({ name: u.toCreate.name }))
      .then(() => expectInSampleEmbed(2, { name: u.toCreate.name }))
      .then(() => done())
      .catch(done);
    });

    it('updating aspect name deletes its samples', (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ name: 'name_change' })
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
      api.patch(`${path}/${asp1.name}`)
      .set('Authorization', token)
      .send({ isPublished: false })
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
      api.patch(`${path}/${asp1.name}`)
      .set('Authorization', token)
      .send({ name: 'UPDATED_NAME' })
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
      api.patch(`${path}/${asp2.name}`)
      .set('Authorization', token)
      .send({ isPublished: false })
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
      api.patch(`${path}/${asp2.name}`)
      .set('Authorization', token)
      .send({ name: 'UPDATED_NAME' })
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
      api.patch(`${path}/${asp3.name}`)
      .set('Authorization', token)
      .send({ isPublished: false })
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
      api.patch(`${path}/${asp3.name}`)
      .set('Authorization', token)
      .send({ name: 'UPDATED_NAME' })
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
      api.patch(`${path}/${asp1.name}`)
      .set('Authorization', token)
      .send({ timeout: '4s' })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.have.property('timeout', '4s');
      })
      .end(done);
    });
  });

  describe(`PATCH ${path} status ranges >`, () => {
    let token;
    let createdAspectId;

    before((done) => {
      Aspect.create({
        name: `${tu.namePrefix}Weight`,
        timeout: '110s',
        helpUrl: 'http://abc.com',
        helpEmail: 'abc@xyz.com',
      })
      .then((asp) => {
        createdAspectId = asp.id;
        return tu.createToken();
      })
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    after(u.forceDelete);
    after(tu.forceDeleteUser);

    it('OK, valueType=boolean, ranges valid', (done) => {
      api.patch(`${path}/${createdAspectId}`)
      .set('Authorization', token)
      .send({ okRange: [1, 1], criticalRange: [0, 0] })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.okRange).to.be.eql([1, 1]);
        expect(res.body.criticalRange).to.be.eql([0, 0]);
        return done();
      });
    });

    it('not OK, valueType=boolean, ranges invalid', (done) => {
      api.patch(`${path}/${createdAspectId}`)
      .set('Authorization', token)
      .send({ okRange: [0, 1], criticalRange: [0, 0] })
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
      api.patch(`${path}/${createdAspectId}`)
      .set('Authorization', token)
      .send({
        okRange: [-50, 1],
        criticalRange: [30, 90],
        valueType: 'NUMERIC',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.okRange).to.be.eql([-50, 1]);
        expect(res.body.criticalRange).to.be.eql([30, 90]);
        return done();
      });
    });

    it('not OK, valueType=numeric, ranges invalid', (done) => {
      api.patch(`${path}/${createdAspectId}`)
      .set('Authorization', token)
      .send({
        okRange: [Number.MIN_SAFE_INTEGER - 50, 1],
        valueType: 'NUMERIC',
      })
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
      api.patch(`${path}/${createdAspectId}`)
      .set('Authorization', token)
      .send({
        okRange: [1, 50],
        criticalRange: [50, 90],
        valueType: 'PERCENT',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.okRange).to.be.eql([1, 50]);
        expect(res.body.criticalRange).to.be.eql([50, 90]);
        return done();
      });
    });

    it('not OK, valueType=percent, ranges invalid', (done) => {
      api.patch(`${path}/${createdAspectId}`)
      .set('Authorization', token)
      .send({
        okRange: [-20, 1],
        valueType: 'PERCENT',
      })
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
