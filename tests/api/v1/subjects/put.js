/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/put.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const featureToggles = require('feature-toggles');
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/api/v1/subjects/put.js >', () => {
  describe(`api: PUT ${path} >`, () => {
    let token;
    const n0 = { name: `${tu.namePrefix}Canada`, isPublished: true };
    const n1 = { name: `${tu.namePrefix}Ontario`, isPublished: true };
    const n2 = { name: `${tu.namePrefix}Manitoba`, isPublished: true };
    const p0 = { name: `${tu.namePrefix}NA`, isPublished: true };
    const p1 = { name:
      `${tu.namePrefix}Quebec`,
      isPublished: true,
    };
    const n0a = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };

    let i0 = ZERO;
    let i1 = ZERO;
    let i0a = ZERO;

    function childCheckIfPut(res) {
      const errors = [];
      if (res.body.name !== p1.name) {
        errors.push(new Error(`name should be ${p1.name}`));
      }

      if (res.body.absolutePath !== `${n0a.name}.${p1.name}`) {
        errors.push(new Error(`absolutePath should be ${n0a.name}.${p1.name}`));
      }

      if (!res.body.isPublished) {
        errors.push(new Error('isPublished should be true'));
      }

      if (res.body.isDeleted > ZERO) {
        errors.push(new Error('isDeleted should be zero'));
      }

      if (errors.length) {
        throw new Error(errors);
      }
    }

    function parentCheckIfPut(res) {
      const errors = [];
      if (res.body.name !== p0.name) {
        errors.push(new Error(`name should be ${p0.name}`));
      }

      if (res.body.description) {
        errors.push(new Error('description should be empty'));
      }

      if (res.body.absolutePath !== p0.name) {
        errors.push(new Error(`absolutePath should be ${p0.name}`));
      }

      if (res.body.isDeleted > ZERO) {
        errors.push(new Error('isDeleted should be zero'));
      }

      if (errors.length) {
        throw new Error(errors);
      }
    }

    function childrenAbsPathUpdated() {
      const errors = [];
      Subject.findById(i0, {
        include: [
          {
            model: Subject,
            as: 'children',
            attributes: ['name', 'id', 'absolutePath'],
          },
        ],
      })
      .then((s) => {
        if (!s || !s.children || s.children.length !== TWO) {
          errors.push(new Error('Expecting 2 children'));
        } else {
          for (let i = 0; i < s.children.length; i++) {
            const k = s.children[i];
            if (k.absolutePath.indexOf(p0.name) !== ZERO) {
              errors.push(new Error('Child absolutePath should have been updated'));
            }
          }
        }
      });
      if (errors.length) {
        throw new Error(errors);
      }
    }

    function reparented(res) {
      const errors = [];
      if (res.body.absolutePath !== `${n0a.name}.${n0.name}`) {
        errors.push(new Error(`absolutePath should be ${n0a.name}.${n0.name}`));
      }

      Subject.findById(i0, {
        include: [
          {
            model: Subject,
            as: 'children',
            attributes: ['name', 'id', 'absolutePath'],
          },
        ],
      })
      .then((s) => {
        if (s.children.length !== TWO) {
          errors.push(new Error('Expecting 2 children'));
        }

        for (let i = 0; i < s.children.length; i++) {
          const k = s.children[i];
          if (k.absolutePath.indexOf(`${n0a.name}.${n0.name}`) !== ZERO) {
            errors.push(new Error('Child absolutePath should have been updated'));
          }
        }
      });
      if (errors.length) {
        throw new Error(errors);
      }
    }

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      Subject.create(n0)
      .then((subj) => {
        i0 = subj.id;
        const ch = n1;
        ch.parentId = i0;
        return Subject.create(ch);
      })
      .then((subj) => {
        i1 = subj.id;
        const ch2 = n2;
        ch2.parentId = i0;
        Subject.create(ch2);
      })
      .then(() => Subject.create(n0a))
      .then((subj) => {
        i0a = subj.id;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);

    it('puts with different absolutePath case succeeeds', (done) => {
      const updatedName = n0.name.toLowerCase();
      api.put(`${path}/${n0.name}`)
      .set('Authorization', token)
      .send({
        name: updatedName,

        // need isPublished here since descendants are published
        isPublished: n0.isPublished,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.absolutePath).to.equal(updatedName);
        done();
      });
    });

    it('put subject with sortBy', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        isPublished: true,
        sortBy: '_1',
      };
      api.put(`${path}/${i1}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.sortBy).to.have.length(2);
        expect(res.body.sortBy).to.equal('_1');
        done();
      });
    });

    it('put subject with a read-only field hierarchyLevel', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        isPublished: true,
        hierarchyLevel: '_1',
      };
      api.put(`${path}/${i1}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field: hierarchyLevel');
        done();
      });
    });

    it('put subject with a read-only field absolutePath', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        isPublished: true,
        absolutePath: 'test',
      };
      api.put(`${path}/${i1}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field: absolutePath');
        done();
      });
    });

    it('put subject with a read-only field childCount', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        isPublished: true,
        childCount: 2,
      };
      api.put(`${path}/${i1}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field: childCount');
        done();
      });
    });

    it('put subject with a read-only field id', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        isPublished: true,
        id: 'abc123',
      };
      api.put(`${path}/${i1}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field: id');
        done();
      });
    });

    it('put subject with a read-only field isDeleted', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        isPublished: true,
        isDeleted: 0,
      };
      api.put(`${path}/${i1}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description)
        .to.contain('You cannot modify the read-only field: isDeleted');
        done();
      });
    });

    it('put subject with no sortBy parameter', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        isPublished: true,
      };
      api.put(`${path}/${i1}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.not.have.property('sortBy');
        done();
      });
    });
  });

  describe('api: PUT subjects with related links >', () => {
    let token;
    let subjectId = 0;
    const n0 = { name: `${tu.namePrefix}Canada` };

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    before((done) => {
      Subject.create(n0)
      .then((subject) => {
        subjectId = subject.id;
        done();
      })
      .catch((err) => {
        done(err);
      });
    });

    after(u.forceDelete);
    after(tu.forceDeleteUser);

    it('update to add related links', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        relatedLinks: [{ name: 'link1', url: 'https://samples.com' }],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'link1');
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('update to add existing related link', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        relatedLinks: [{ name: 'link1', url: 'https://samples.com' }],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(ONE);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'link1');
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('update related links with some additions and deletions', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        relatedLinks: [
          { name: 'link0', url: 'https://samples.com' },
          { name: 'link1', url: 'https://samples.com' },
        ],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(TWO);
        for (let k = 0; k < res.body.relatedLinks.length; k++) {
          expect(res.body.relatedLinks[k]).to.have.property('name', 'link' + k);
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });

  describe('api: PUT subjects with tags >', () => {
    let token;
    let subjectId = ZERO;
    const n0 = { name: `${tu.namePrefix}Canada` };

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    before((done) => {
      Subject.create(n0)
      .then((subject) => {
        subjectId = subject.id;
        done();
      })
      .catch((err) => {
        done(err);
      });
    });
    after(u.forceDelete);
    after(tu.forceDeleteUser);

    it('update to add tags', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        tags: ['tagX'],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(ONE);
        expect(res.body.tags).to.deep.equal(toPut.tags);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('no putting tags with names starting with a dash(-)', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        tags: ['-tagX'],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body).to.property('errors');
        expect(res.body.errors[ZERO].type)
          .to.equal(tu.schemaValidationErrorName);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('update to duplicate tags fails', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        tags: ['tagX', 'tagX'],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('update to case-sensitive duplicate tags fails', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        tags: ['TAGX', 'tagx'],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/DuplicateFieldError/)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('update to add existing tag', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        tags: ['tagX'],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(ONE);
        expect(res.body.tags).to.deep.equal(toPut.tags);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('update tags with some additions and deletions', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        tags: [
          'tag0',
          'tag1',
        ],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(toPut.tags.length);
        expect(res.body.tags).to.have.members(toPut.tags);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        Subject.findOne({ where: { id: subjectId } })
        .then((subj) => {
          expect(subj.tags).to.have.length(TWO);
          expect(subj.tags).to.have.members(toPut.tags);
        });
        done();
      });
    });

    it('update to remove all tags', (done) => {
      const toPut = {
        name: `${tu.namePrefix}newName`,
        timeout: '220s',
        tags: [],
      };
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send(toPut)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.tags).to.have.length(ZERO);
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        Subject.findOne({ where: { id: subjectId } })
        .then((subj) => {
          expect(subj.tags).to.have.length(ZERO);
        });
        done();
      });
    });
  });

  describe('api: PUT subjects, validate helpEmail/helpUrl required >', () => {
    const toggleOrigValue = featureToggles.isFeatureEnabled(
      'requireHelpEmailOrHelpUrl'
    );

    let token;
    let subjectId = ZERO;

    before((done) => {
      tu.toggleOverride('requireHelpEmailOrHelpUrl', true);
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    before((done) => {
      Subject.create({ name: `${tu.namePrefix}s1` })
      .then((subject) => {
        subjectId = subject.id;
        done();
      })
      .catch((err) => {
        done(err);
      });
    });

    after(u.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride(
      'requireHelpEmailOrHelpUrl', toggleOrigValue)
    );

    it('NOT OK, put subject with no helpEmail or helpUrl', (done) => {
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}newName` })
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

    it('NOT OK, put subject with empty helpEmail or helpUrl', (done) => {
      api.put(`${path}/${subjectId}`)
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

    it('OK, put subject with only helpEmail', (done) => {
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpEmail: 'abc@xyz.com' })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });

    it('OK, put subject with only helpUrl', (done) => {
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send({ name: `${tu.namePrefix}s1`, helpUrl: 'http://xyz.com' })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://xyz.com');
      })
      .end(done);
    });

    it('OK, put subject with both helpUrl and helpEmail', (done) => {
      api.put(`${path}/${subjectId}`)
      .set('Authorization', token)
      .send({
        name: `${tu.namePrefix}s1`,
        helpUrl: 'http://xyz.com',
        helpEmail: 'abc@xyz.com',
      })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.helpUrl).to.be.equal('http://xyz.com');
        expect(res.body.helpEmail).to.be.equal('abc@xyz.com');
      })
      .end(done);
    });
  });
});
