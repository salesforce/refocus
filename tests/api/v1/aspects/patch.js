/**
 * tests/api/v1/aspects/patch.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;
const path = '/v1/aspects';
const expect = require('chai').expect;

describe(`api: PATCH ${path}`, () => {
  let i = 0;
  const asp = u.toCreate;
  const token = tu.createToken();

  beforeEach((done) => {
    Aspect.create(u.toCreate)
    .then((aspect) => {
      i = aspect.id;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

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
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
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
    { name: 'link2', url: 'https://samples.com' }];
    asp.relatedLinks = relatedLinks;
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(asp)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('patch tags', (done) => {
    const tags = [{ name: 'tag1' }];
    asp.tags = tags;
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(asp)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.deep.property('[0].id');
      expect(res.body.tags).to.have.deep.property('[0].name', 'tag1');
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
      { name: 'tag0' },
      { name: 'tag1' },
      { name: 'tag2' },
    ];
    asp.tags = tags;
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(asp)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(tags.length);
      for (let k=0;k<res.body.tags.length;k++) {
        expect(res.body.tags[k]).to.have.property('id');
        expect(res.body.tags[k]).to.have.property('name', 'tag'+k);
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
describe(`api: PATCH ${path} isPublished`, () => {
  let i = 0;
  const token = tu.createToken();

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
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

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
      .catch((_err) => done(_err));
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
