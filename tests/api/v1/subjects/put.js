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
const Subject = tu.db.Subject;
const Tag = tu.db.Tag;
const path = '/v1/subjects';

describe(`api: PUT ${path}`, () => {
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

  let i0 = 0;
  let i1 = 0;
  let i0a = 0;

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

    if (res.body.isDeleted > 0) {
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

    if (res.body.isDeleted > 0) {
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
      if (!s || !s.children || s.children.length !== 2) {
        errors.push(new Error('Expecting 2 children'));
      } else {
        for (var i = 0; i < s.children.length; i++) {
          const k = s.children[i];
          if (k.absolutePath.indexOf(p0.name) !== 0) {
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
      if (s.children.length !== 2) {
        errors.push(new Error('Expecting 2 children'));
      }

      for (var i = 0; i < s.children.length; i++) {
        const k = s.children[i];
        if (k.absolutePath.indexOf(`${n0a.name}.${n0.name}`) !== 0) {
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

  it('puts a child', (done) => {
    api.put(`${path}/${i1}`)
    .set('Authorization', token)
    .send({
      name: p1.name,
      isPublished: p1.isPublished,
      parentId: i0a,
    })
    .expect(constants.httpStatus.OK)
    .expect(childCheckIfPut)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('puts a parent and clears description', (done) => {
    api.put(`${path}/${i0}`)
    .set('Authorization', token)
    .send(p0)
    .expect(constants.httpStatus.OK)
    .expect(parentCheckIfPut)
    .expect(childrenAbsPathUpdated)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('puts and re-parents a subject', (done) => {
    api.put(`${path}/${i0}`)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}Canada`,
      parentId: i0a,
      isPublished: true
    })
    .expect(constants.httpStatus.OK)
    .expect(reparented)
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
    api.put(`${path}/${i0}`)
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
    api.put(`${path}/${i0}`)
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
    api.put(`${path}/${i0}`)
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

describe('api: PUT subjects with related links', () => {
  let token;
  let subjectId = 0;
  const n0 = { name: `${tu.namePrefix}Canada` };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
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
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' }]
    };
    api.put(`${path}/${subjectId}`)
    .set('Authorization', token)
    .send(toPut)
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

  it('update to add existing related link', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' }]
    };
    api.put(`${path}/${subjectId}`)
    .set('Authorization', token)
    .send(toPut)
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

  it('update related links with some additions and deletions', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      relatedLinks: [
        { name: 'link0', url: 'https://samples.com' },
        { name: 'link1', url: 'https://samples.com' },
      ]
    };
    api.put(`${path}/${subjectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(2);
      for (let k=0;k<res.body.relatedLinks.length;k++) {
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
});

describe('api: PUT subjects with tags', () => {
  let token;
  let subjectId = 0;
  const n0 = { name: `${tu.namePrefix}Canada` };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
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
      tags: [{ name: 'tagX' }]
    };
    api.put(`${path}/${subjectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.deep.property('[0].id');
      expect(res.body.tags).to.have.deep.property('[0].name', 'tagX');
    })
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
      tags: [{ name: 'tagX' }]
    };
    api.put(`${path}/${subjectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.deep.property('[0].id');
      expect(res.body.tags).to.have.deep.property('[0].name', 'tagX');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('put subject with absolutePath', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      absolutePath: 'test'
    };
    api.put(`${path}/${subjectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/SubjectValidationError/)
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
        { name: 'tag0' },
        { name: 'tag1' },
      ]
    };
    api.put(`${path}/${subjectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(2);
      for (let k=0;k<res.body.tags.length;k++) {
        expect(res.body.tags[k]).to.have.property('id');
        expect(res.body.tags[k]).to.have.property('name', 'tag'+k);
      }
      Tag.findAll({ where: { associationId: subjectId } })
      .then((tags) => {
        expect(tags.length).to.have.length(2);
        for (let k=0;k<tags.length;k++) {
          expect(tags[k]).to.have.property('id');
          expect(tags[k]).to.have.property('name',
           'tag'+k);
        }
      })
      .catch((err) => new Error(err));
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
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
      expect(res.body.tags).to.have.length(0);
      Tag.findAll({ where: { associationId: subjectId } })
      .then((tags) => {
        expect(tags.length).to.have.length(0);
      })
      .catch((err) => new Error(err));
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
