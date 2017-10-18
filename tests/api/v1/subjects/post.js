/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/post.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const expect = require('chai').expect;
const featureToggles = require('feature-toggles');
const ZERO = 0;

describe(`tests/api/v1/subjects/post.js, POST ${path} >`, () => {
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

  describe('Simple >', () => {
    const n0 = { name: `${tu.namePrefix}NorthAmerica` };
    const n2b = { name: `${tu.namePrefix}Quebec` };
    let i0 = 0;

    function parentBodyCheck(res) {
      const errors = [];
      if (res.body.name !== n0.name) {
        errors.push(new Error(`name should be ${n0.name}`));
      }

      if (res.body.parentId) {
        errors.push(new Error('parentId should be null'));
      }

      if (res.body.absolutePath !== n0.name) {
        errors.push(new Error(`absolutePath should be ${n0.name}`));
      }

      if (res.body.isDeleted !== '0') {
        errors.push(new Error('isDeleted should be "0"'));
      }

      if (errors.length) {
        throw new Error(errors);
      }
    }

    function parentFound() {
      const errors = [];
      Subject.findById(i0)
      .then((subj) => {
        if (subj && subj.name !== n0.name) {
          errors.push(new Error('uh oh'));
        }

        if (!subj) {
          errors.push(new Error('should have found a record with this id'));
        }
      });
      if (errors.length) {
        throw new Error(errors);
      }
    }

    after(u.forceDelete);

    describe('post duplicate fails >', () => {
      const DUMMY = { name: `${tu.namePrefix}DUMMY` };

      beforeEach((done) => {
        tu.db.Subject.create(DUMMY)
        .then(() => done())
        .catch(done);
      });

      afterEach(u.forceDelete);

      it('with identical name', (done) => {
        api.post(path)
        .set('Authorization', token)
        .send(DUMMY)
        .expect(constants.httpStatus.FORBIDDEN)
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
        api.post(path)
        .set('Authorization', token)
        .send(DUMMY)
        .expect(constants.httpStatus.FORBIDDEN)
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

    it('posted top-level subject has parentAbsolutePath field' +
    'with value null', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n2b.name })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const result = JSON.parse(res.text);
        expect(Object.keys(result)).to.contain('parentAbsolutePath');
        expect(result.parentAbsolutePath).to.equal.null;
        done();
      });
    });

    it('post child object with parentAbsolutePath, ' +
    'contains parentAbsolutePath', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}Child`, parentAbsolutePath: n2b.name })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const result = JSON.parse(res.text);
        expect(Object.keys(result))
        .to.contain('parentAbsolutePath');
        expect(result.parentAbsolutePath).to.equal(n2b.name);
        done();
      });
    });

    it('post with parent of empty string, invalid', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n2b.name, parentId: '' })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.text).to.contain('parentId');
        done();
      });
    });

    it('post with parent of null string, should set parentId field to null',
    (done) => {
      // TODO fix this test
      api.post(path)
      .set('Authorization', token)
      .send({ name: n2b.name, parentId: null })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.text).to.contain('parentId');
        done();
      });
    });

    it('post subject with no parent', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n0.name })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        i0 = res.body.id;
      })
      .expect(parentBodyCheck)
      .expect(parentFound)
      .end(done);
    });

    it('posting with readOnly field hierarchyLevel should fail', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n0.name, hierarchyLevel: 100 })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field');
        done();
      });
    });

    it('posting with readOnly field absolutePath should fail', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n0.name, absolutePath: 'test' })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field: absolutePath');
        return done();
      });
    });

    it('posting with readOnly field childCount should fail', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n0.name, childCount: 2 })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field: childCount');
        return done();
      });
    });

    it('posting with readOnly field id should fail', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n0.name, id: 'abcd1234' })
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

    it('posting with readOnly field isDeleted should fail', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n0.name, isDeleted: 0 })
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

    it('post subject with sortBy', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, sortBy: '_1' })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.sortBy).to.have.length(2);
        expect(res.body.sortBy).to.equal('_1');
        done();
      });
    });

    it('post subject without sortBy parameter', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s2` })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('sortBy');
        done();
      });
    });

    it('invalid sortBy value', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}s3`,
        description: 'sample description',
        sortBy: ' ',
      })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.text).to.contain('sortBy');
        done();
      });
    });
  }); // Simple

  describe('With a Parent >', () => {
    const n0 = { name: `${tu.namePrefix}NorthAmerica` };
    const n1 = { name: `${tu.namePrefix}Canada` };
    let i0 = 0;
    let i1 = 0;

    function childBodyCheck(res) {
      const errors = [];
      if (res.body.name !== n1.name) {
        errors.push(new Error(`name should be ${n1.name}`));
      }

      if (res.body.parentId !== i0) {
        errors.push(new Error(`parentId should be ${i0}`));
      }

      if (res.body.absolutePath !== `${n0.name}.${n1.name}`) {
        errors.push(new Error(`absolutePath should be ${n0.name}.${n1.name}`));
      }

      if (errors.length) {
        throw new Error(errors);
      }
    }

    function childFound() {
      const errors = [];
      Subject.findById(i1)
      .then((subj) => {
        if (subj && subj.name !== n1.name) {
          errors.push(new Error('uh oh'));
        }

        if (!subj) {
          errors.push(new Error('should have found a record with this id'));
        }
      });

      if (errors.length) {
        throw new Error(errors);
      }
    }

    before('create parent', (done) => {
      Subject.create(n0)
      .then((o) => {
        i0 = o.id;
        done();
      })
      .catch(done);
    });

    after(u.forceDelete);

    it('post subject with a valid parent', (done) => {
      // FIXME this test assigns a value into i1, which is then used by the
      //       childFound function
      api.post(path)
      .set('Authorization', token)
      .send({
        name: n1.name,
        parentId: i0,
      })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        i1 = res.body.id;
      })
      .expect(childBodyCheck)
      .expect(childFound)
      .end(done);
    });
  }); // With a Parent

  describe('Duplicates >', () => {
    const n0 = { name: `${tu.namePrefix}Canada` };
    const n1 = { name: `${tu.namePrefix}Ontario` };
    let i0 = 0;

    beforeEach((done) => {
      Subject.destroy({ where: n1, force: true })
      .then(() => {
        Subject.destroy({ where: n0, force: true });
      })
      .then(() => Subject.create(n0))
      .then((subj) => {
        i0 = subj.id;
        return Subject.create({ name: n1.name, parentId: i0 });
      })
      .then(() => done())
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('same name and parent', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: n1.name,
        parentId: i0,
      })
      .expect(constants.httpStatus.FORBIDDEN)
      .expect(/UniqueConstraintError/)
      .end(done);
    });

    it('same name and no parent', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(n0)
      .expect(constants.httpStatus.FORBIDDEN)
      .expect(/UniqueConstraintError/)
      .end(done);
    });

    it('same name but different parent', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: n1.name })
      .expect(constants.httpStatus.CREATED)
      .end(done);
    });
  }); // Duplicates

  describe('Misc >', () => {
    it('unexpected field in body OK', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}x`,
        notValidField1: true,
        notValidField2: 'x',
        isPublished: false,
      })
      .expect(constants.httpStatus.CREATED)
      .end(done);
    });

    it('no name in body', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ isPublished: false })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.text).to.contain('Missing required property: name');
        done();
      });
    });

    it('post subject with absolutePath', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        isPublished: false,
        absolutePath: 'dd',
        name: `${tu.namePrefix}test`,
      })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.text).to.contain('absolutePath');
        done();
      });
    });

    it('invalid parent in body', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: 'me',
        parentId: 'Hi, I\'m not a valid parent',
      })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.text).to.contain('parentId');
        done();
      });
    });

    it('no body', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send()
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/Invalid content type/)
      .end(done);
    });
  }); // Misc

  describe('api: subject: tags >', () => {
    afterEach(u.forceDelete);
    it('post subject with tags', (done) => {
      const subjectToPost = { name: `${tu.namePrefix}NorthAmerica` };
      const tags = ['___na', '___continent'];
      subjectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(subjectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.tags).to.have.length(tags.length);
        expect(res.body.tags).to.have.members(tags);
      })
      .end(done);
    });

    it('should not be able to post tag names starting with dash(-)', (done) => {
      const subjectToPost = { name: `${tu.namePrefix}NorthAmerica` };
      const tags = ['-na', '___continent'];
      subjectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(subjectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body).to.property('errors');
        expect(res.body.errors[ZERO].type)
        .to.equal(tu.schemaValidationErrorName);
      })
      .end(done);
    });

    it('posting subject with case sensitive (duplicate) tags should fail',
      (done) => {
      const subjectToPost = { name: `${tu.namePrefix}Asia` };
      const tags = ['___na', '___NA'];
      subjectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(subjectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end(done);
    });

    it('posting subject with duplicate tags should fail',
      (done) => {
      const subjectToPost = { name: `${tu.namePrefix}Asia` };
      const tags = ['___na', '___na'];
      subjectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(subjectToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end(done);
    });

    it('post subject with tags of size zero', (done) => {
      const subjectToPost = { name: `${tu.namePrefix}SouthAmerica` };
      const tags = [];
      subjectToPost.tags = tags;
      api.post(path)
      .set('Authorization', token)
      .send(subjectToPost)
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.tags).to.have.length(tags.length);
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

    afterEach(u.forceDelete);

    it('NOT OK, post subject with no helpEmail or helpUrl', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1` })
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

    it('NOT OK, post subject with empty helpEmail or helpUrl', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpEmail: '' })
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

    it('OK, post subject with only helpEmail', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpEmail: 'abc@xyz.com' })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });

    it('OK, post subject with only helpUrl', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpUrl: 'http://xyz.com' })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://xyz.com');
      })
      .end(done);
    });

    it('OK, post subject with both helpUrl and helpEmail', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}s1`,
        helpUrl: 'http://xyz.com',
        helpEmail: 'abc@xyz.com',
      })
      .expect(constants.httpStatus.CREATED)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://xyz.com');
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });
  });
});
