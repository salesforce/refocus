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
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;
const path = '/v1/aspects';
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
      .then(() => {
        Sample.create(samp1);
        Sample.create(samp2);
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('updating aspect isPublished to false deletes its samples', (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ isPublished: false })
      .expect(constants.httpStatus.OK)
      .expect(() => {
        Sample.findAll()
        .then((samp) => {
          expect(samp).to.have.length(0);
        })
        .catch(done);
      })
      .end(done);
    });

    it('updating aspect name deletes its samples', (done) => {
      api.patch(`${path}/${i}`)
      .set('Authorization', token)
      .send({ name: 'name_change' })
      .expect(constants.httpStatus.OK)
      .expect(() => {
        Sample.findAll()
        .then((samp) => {
          expect(samp).to.have.length(0);
        })
        .catch(done);
      })
      .end(done);
    });
  });
});
