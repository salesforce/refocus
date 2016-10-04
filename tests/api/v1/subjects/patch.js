/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/patch.js
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

describe(`api: PATCH ${path}`, () => {
  let token;

  const n0 = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const n1 = { name: `${tu.namePrefix}Ontario`, isPublished: true };
  const n2 = { name: `${tu.namePrefix}Manitoba`, isPublished: true };
  const p0 = { name: `${tu.namePrefix}NA`, isPublished: true };
  const p1 = {
    name: `${tu.namePrefix}Quebec`,
    isPublished: true,
  };
  const n0a = { name: `${tu.namePrefix}NorthAmerica` };
  let i0 = 0;
  let i1 = 0;
  let i0a = 0;

  function childCheckIfPatched(res) {
    const errors = [];
    if (res.body.name !== p1.name) {
      errors.push(new Error(`name should be ${p1.name}`));
    }

    if (res.body.absolutePath !== `${n0.name}.${p1.name}`) {
      errors.push(new Error(`absolutePath should be ${n0.name}.${p1.name}`));
    }

    if (!res.body.isPublished) {
      errors.push(new Error('isPublished should be true'));
    }

    if (res.body.isDeleted > 0) {
      errors.push(new Error('isDeleted should be zero'));
    }

    if (errors.length) {
      throw new Error(errors);
    }
  }

  function parentCheckIfPatched(res) {
    const errors = [];
    if (res.body.name !== p0.name) {
      errors.push(new Error(`name should be ${p0.name}`));
    }

    if (res.body.absolutePath !== p0.name) {
      errors.push(new Error(`absolutePath should be ${p0.name}`));
    }

    if (res.body.isDeleted > 0) {
      errors.push(new Error('isDeleted should be zero'));
    }

    if (errors.length) {
      throw new Error(errors);
    }
  }

  function childrenAbsPathUpdated() {
    const errors = [];
    const msg = 'Child absolutePath should have been updated';
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
      if (!s || !s.children || s.children.length !== 2) {
        errors.push(new Error('Expecting 2 children'));
      } else {
        for (var i = 0; i < s.children.length; i++) {
          const k = s.children[i];
          if (k.absolutePath.indexOf(p0.name) !== 0) {
            errors.push(new Error(msg));
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
    const msg = 'Child absolutePath should have been updated';
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
      if (!s || !tu.gotArrayWithExpectedLength(s.children, 2)) {
        errors.push(new Error('Expecting 2 children'));
      } else {
        for (var i = 0; i < s.children.length; i++) {
          const k = s.children[i];
          if (k.absolutePath.indexOf(`${n0a.name}.${n0.name}`) !== 0) {
            errors.push(new Error(msg));
          }
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
    .catch((err) => done(err));
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
    .then(() => {
      return Subject.create(n0a);
    })
    .then((subj) => {
      i0a = subj.id;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('patch relatedLinks', (done) => {
    const relatedLinks = [{ name: 'link1', url: 'https://samples.com' }];
    p1.relatedLinks = relatedLinks;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(1);
      expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'link1');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch relatedLinks multiple', (done) => {
    const relatedLinks = [{ name: 'link0', url: 'https://samples.com' },
    { name: 'link1', url: 'https://samples.com' },
    { name: 'link2', url: 'https://samples.com'}];
    p1.relatedLinks = relatedLinks;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      for (let k=0;k<res.body.relatedLinks.length;k++) {
      /**
       * link names are starting from link0 to link2, so adding  the index k
       * at the end to get the name dynamically
       */
        expect(res.body.relatedLinks[k]).to.have.property('name',
         'link'+k);
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch relatedLinks with duplicate name', (done) => {
    const relatedLinks = [{ name: 'link1', url: 'https://samples.com' },
    { name: 'link2', url: 'https://samples.com' },
    { name: 'link1', url: 'https://samples.com' }];
    p1.relatedLinks = relatedLinks;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[0].source).to.contain('relatedLinks');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch empty relatedLinks', (done) => {
    const relatedLinks = [];
    p1.relatedLinks = relatedLinks;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(0);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch tags', (done) => {
    const tags = ['tag1'];
    p1.tags = tags;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tag1']);

    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch tags multiple', (done) => {
    const tags = [
      'tag0',
      'tag1',
      'tag2'
    ];
    p1.tags = tags;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(tags.length);
      expect(res.body.tags).to.have.members(tags);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch tags with duplicate names should remove the duplicate',
  (done) => {
    const tags = [
      'link1',
      'link2',
      'link1'
    ];
    p1.tags = tags;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect((res) => {
      expect(res.body.tags).to.have.length(2);
      expect(res.body.tags).to.include.members(tags);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch empty tags', (done) => {
    const tags = [];
    p1.tags = tags;
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect((res) => {
      expect(res.body.tags).to.have.length(0);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('patch child name and isPublished', (done) => {
    p1.relatedLinks = [];
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(p1)
    .expect(constants.httpStatus.OK)
    .expect(childCheckIfPatched)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('patch child parentAbsolutePath updates ' +
    'absolutePath, parentAbsolutePath, and parentId', (done) => {
    const toPatch = {
      parentAbsolutePath: n0a.name
    };
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }
      expect(res.body.parentAbsolutePath).to.equal(n0a.name);
      expect(res.body.parentId).to.equal(i0a);
      expect(res.body.absolutePath).to.equal(`${n0a.name}.${n1.name}`);
      done();
    });
  });

  it('patch parent name, make sure children absolutePath gets updated',
  (done) => {
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send(p0)
    .expect(constants.httpStatus.OK)
    .expect(parentCheckIfPatched)
    .expect(childrenAbsPathUpdated)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('re-parent a subject, make sure its children get updated', (done) => {
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send({ parentId: i0a })
    .expect(constants.httpStatus.OK)
    .expect(reparented)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('patch empty helpUrl', (done) => {
    const toPatch = {
      helpUrl: '',
      isPublished: p1.isPublished,
      name: p1.name,
    };
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.OK)
    .expect(childCheckIfPatched)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('patch parent with isPublished false while ' +
    'its child is isPublished true', (done) => {
    const toPatch = {
      helpUrl: '',
      isPublished: false,
      name: p0.name,
    };
    api.patch(`${path}/${i0}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }
      expect(res.body.errors[0].message).to
      .equal('You cannot unpublish this subject until ' +
        'all its descendants are unpublished.');
      done();
    });
  });

  it('patch subject with absolutePath', (done) => {
    const toPatch = {
      absolutePath: 'test',
      isPublished: p1.isPublished,
      name: p1.name,
    };
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/SubjectValidationError/)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('geolocation array must not contain null elements while patching',
  (done) => {
    const toPatch = {
      isPublished: p1.isPublished,
      name: p1.name,
      geolocation: [null, null],
    };
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].message).to
      .equal('Expected type number but found type null');
      expect(res.body.errors[0].source).to
      .equal('geolocation');
      done();
    });
  });

  it('geolocation array cant contain less than two elements in patching',
  (done) => {
    const toPatch = {
      isPublished: p1.isPublished,
      name: p1.name,
      geolocation: [1],
    };
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].message).to
      .equal('A non-null range must include two elements');
      expect(res.body.errors[0].source).to
      .equal('geolocation');
      done();
    });
  });

  it('geolocation array cant contain more than three elements in patching',
  (done) => {
    const toPatch = {
      isPublished: p1.isPublished,
      name: p1.name,
      geolocation: [1,2,3],
    };
    api.patch(`${path}/${i1}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].message).to
      .equal('A non-null range must include two elements');
      expect(res.body.errors[0].source).to
      .equal('geolocation');
      done();
    });
  });
});
