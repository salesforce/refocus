/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/patchWithParent.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe(`api: PATCH ${path} with parents`, () => {
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
  const _root = { name: `${tu.namePrefix}_root`, isPublished: true };

  let i0 = ZERO;
  let i1 = ZERO;
  let i0a = ZERO;
  let iRoot = ZERO;
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Subject.create(_root)
    .then((subj) => {
      iRoot = subj.id;
      return Subject.create(n0);
    })
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

  /**
  (a) PATCH /v1/subjects/{key} with parentId and parentAbsolutePath fails if parentAbsolutePath does not refer to the same subject record as specified by parentId
  (b) PATCH /v1/subjects/{key} with parentId BUT NO parentAbsolutePath sets the parent based on the parentId
  (c) PATCH /v1/subjects/{key} with parentAbsolutePath BUT NO parentId sets the parent based on the parentAbsolutePath
  (d) PATCH /v1/subjects/{key} with NEITHER parentId NOR parentAbsolutePath does not reparent the subject
  (e) PATCH /v1/subjects/{key} with parentId === id fails
  (e) PATCH /v1/subjects/{key} with parentAbsolutePath === absolutePath fails
  (f) PATCH /v1/subjects/{key} with parentId unchanged, parentAbsolutePath pointing to a different parent fails
  (g) PATCH /v1/subjects/{key} with parentAbsolutePath unchanged, parentId pointing to a different parent fails
  */

  describe('on un-publish', () => {
    it('with NEITHER parentId NOR parentAbsolutePath,' +
      ' set the subject as a root subject', (done) => {
      const NAME = 'iAmRoot';
      api.put(`${path}/${i0}`)
      .set('Authorization', token)
      .send({ name: NAME, isPublished: true })
      .expect(constants.httpStatus.OK)
      .end((err, res ) => {
        if (err) {
          done(err);
        }

        expect(res.body.parentAbsolutePath).to.equal('');
        expect(res.body.parentId).to.equal(null);
        expect(res.body.absolutePath).to.equal(NAME);
        done();
      });
    });

    it('on name change, the name is changed',
      (done) => {
      const NEW_NAME = 'newName';

      // use leaf subject
      api.put(`${path}/${i0a}`)
      .set('Authorization', token)
      .send({
        name: NEW_NAME,
        isPublished: false,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res ) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(NEW_NAME);
        done();
      });
    });

    it('on change parent, the parent is set by ' +
      'parentAbsolutePath', (done) => {
      const NEW_NAME = 'newName';

      // use leaf subject
      api.put(`${path}/${i0a}`)
      .set('Authorization', token)
      .send({
        name: NEW_NAME,
        isPublished: false,
        parentAbsolutePath: _root.name,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res ) => {
        if (err) {
          done(err);
        }

        expect(res.body.isPublished).to.be.false;
        expect(res.body.parentId).to.equal(iRoot);
        expect(res.body.parentAbsolutePath).to.equal(_root.name);
        expect(res.body.absolutePath).to.equal(_root.name + '.' + NEW_NAME);
        done();
      });
    });

    it('on change parent, the parent is set by ' +
      'parentId', (done) => {
      const NEW_NAME = 'newName';

      // use leaf subject
      api.put(`${path}/${i0a}`)
      .set('Authorization', token)
      .send({
        name: NEW_NAME,
        isPublished: false,
        parentId: iRoot,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res ) => {
        if (err) {
          done(err);
        }

        expect(res.body.isPublished).to.be.false;
        expect(res.body.parentId).to.equal(iRoot);
        expect(res.body.parentAbsolutePath).to.equal(_root.name);
        expect(res.body.absolutePath).to.equal(_root.name + '.' + NEW_NAME);
        done();
      });
    });
  });

  it('fail when trying to update with parentId pointing to different subject than parentAbsolutePath', (done) => {
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentId: i0a,
      parentAbsolutePath: n0.name, // unchanged parent
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.equal('ParentSubjectNotMatch');
      done();
    });
  });

  it('fail when trying to update with parentAbsolutePath pointing to different subject than parentId', (done) => {
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentId: i0, // unchanged parent
      parentAbsolutePath: n0a.name,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.equal('ParentSubjectNotMatch');
      done();
    });
  });

  it('fail on update parentId to itself', (done) => {
    api.patch(`${path}/${i0a}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada_unique`,
      parentId: i0a,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.equal('IllegalSelfParenting');
      done();
    });
  });

  it('fail on update parentAbsolutePath to itself', (done) => {
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentAbsolutePath: n0.name,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.equal('IllegalSelfParenting');
      done();
    });
  });

  it('pass if parentAbsolutePath refers to the same subject as specified by parentId', (done) => {
    api.patch(`${path}/${i0a}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentId: i0,
      parentAbsolutePath: n0.name,
    })
    .expect(constants.httpStatus.OK)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.parentAbsolutePath).to.equal(n0.name);
      expect(res.body.parentId).to.equal(i0);
      done();
    });
  });

  it('fail if parentAbsolutePath refers to a different subject than specified by parentId', (done) => {
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentId: i0a,
      parentAbsolutePath: _root.name,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.equal('ParentSubjectNotMatch');
      done();
    });
  });

  it('fail if parentAbsolutePath refers to non-existent subject, ' +
    'when parentId refers to existing subject', (done) => {
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentId: i0a,
      parentAbsolutePath: 'iDontExist',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.equal('ParentSubjectNotFound');
      done();
    });
  });

  it('fail if parentAbsolutePath refers to non-existent subject, ' +
    'and parentId is not supplied', (done) => {
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentAbsolutePath: 'iDontExist',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].type).to.equal('ParentSubjectNotFound');
      done();
    });
  });

  it('sets the parent based on the parentId', (done) => {
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send({
      name: p1.name,
      parentId: i0a,
    })
    .expect(constants.httpStatus.OK)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.parentAbsolutePath).to.equal(n0a.name);
      expect(res.body.parentId).to.equal(i0a);
      done();
    });
  });

  it('sets the parent based on the parentAbsolutePath', (done) => {
    const NEW_NAME = 'newName';
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send({
      name: NEW_NAME,
      parentAbsolutePath: _root.name,
    })
    .expect(constants.httpStatus.OK)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.parentId).to.equal(iRoot);
      expect(res.body.parentAbsolutePath).to.equal(_root.name);
      done();
    });
  });

  it('with NEITHER parentId NOR parentAbsolutePath, does not reparent the subject', (done) => {
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send({ name: n2.name + '_random' })
    .expect(constants.httpStatus.OK)
    .end((err  , res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.parentId).to.equal(i0);
      expect(res.body.parentAbsolutePath).to.equal(n0.name);
      done();
    });
  });
});
