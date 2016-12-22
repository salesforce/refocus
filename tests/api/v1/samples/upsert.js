/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/upsert.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

const path = '/v1/samples/upsert';

describe(`api: POST ${path}`, () => {
  let aspect;
  let subject;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    Aspect.create(u.aspectToCreate)
    .then((a) => {
      aspect = a;
      return Subject.create(u.subjectToCreate);
    })
    .then((s) => {
      subject = s;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('upserts when the sample does not already exist', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
    })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (!res.body) {
        throw new Error('expecting sample');
      }

      if (res.body.status !== constants.statuses.Warning) {
        throw new Error('Incorrect Status Value');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('update sample and relatedLinks after create', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' },
      { name: 'link2', url: 'https://samples.com' }
      ]
    })
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(2);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
        relatedLinks: [{ name: 'link1', url: 'https://updatedsamples.com' },
        { name: 'link2', url: 'https://updatedsamples.com' }
        ]
      })
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(2);
        for(let i=0;i<res.body.relatedLinks.length;i++) {
          expect(res.body.relatedLinks[0]).to.have
            .property('url', 'https://updatedsamples.com');
        }
      })
      .end((getErr /* , res */) => {
        if (getErr) {
          return done(getErr);
        }
        done();
      });
    });
  });

  it('create sample with relatedLinks', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' },
      { name: 'link2', url: 'https://samples.com' }
      ]
    })
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(2);
      for(let i=0;i<res.body.relatedLinks.length;i++) {
        expect(res.body.relatedLinks[0]).to.have
          .property('url', 'https://samples.com');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('incremental creation of relatedLinks', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' }
      ]
    })
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(1);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
        relatedLinks: [{ name: 'link2', url: 'https://updatedsamples.com' }
        ]
      })
      .expect((res) => {
        expect(res.body.relatedLinks).to.have.length(1);
        for(let i=0;i<res.body.relatedLinks.length;i++) {
          expect(res.body.relatedLinks[0]).to.have
            .property('url', 'https://updatedsamples.com');
        }
      })
      .end((getErr /* , res */) => {
        if (getErr) {
          return done(getErr);
        }
        done();
      });
    });
  });

  it('fail creation on relatedLinks with same name and sampleId', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' },
      { name: 'link1', url: 'https://samples.com' }
      ]
    })
    .expect((res) => {
      expect(res.body.errors[0].message)
        .to.contain('Name of the relatedlinks should be unique');
      expect(res.body.errors[0].source)
        .to.contain('relatedLinks');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('subject not found', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `x|${aspect.name}`,
      value: '2',
    })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('aspect not found', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.name}|xxxxx`,
      value: '2',
    })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  describe('upsert when the sample already exists', () => {
    beforeEach((done) => {
      Sample.create({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '1',
        aspectId: aspect.id,
        subjectId: subject.id,
      })
      .then(() => done())
      .catch((err) => done(err));
    });

    it('upserts when sample already exists', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!res.body) {
          throw new Error('expecting sample');
        }

        if (res.body.status !== constants.statuses.Warning) {
          throw new Error('Incorrect Status Value');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('upserts when sample already exists and check' +
    'that duplication of sample is not happening', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!res.body) {
          throw new Error('expecting sample');
        }

        expect(res.body.name)
        .to.contain(`${subject.absolutePath}|${aspect.name}`);

        // If response has only one item then res.body containes
        // only one object not the list of one object so length
        // will be undefined. If response containes 2 samples then
        // length will be 2 so that will fail the test case
        if (res.body.length !== undefined) {
          throw new Error('Duplicate Sample created');
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
});

describe(`api: POST ${path} aspect isPublished false`, () => {
  let aspect;
  let subject;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    Aspect.create(u.aspectToCreateNotPublished)
    .then((a) => {
      aspect = a;
      return Subject.create(u.subjectToCreate);
    })
    .then((s) => {
      subject = s;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('sample upsert restricted if aspect not published', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
    })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
