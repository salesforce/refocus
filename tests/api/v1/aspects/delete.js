/**
 * tests/api/v1/aspects/delete.js
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
const allDeletePath = '/v1/aspects/{key}/relatedLinks';
const oneDeletePath = '/v1/aspects/{key}/relatedLinks/{akey}';
const expect = require('chai').expect;

describe(`api: DELETE ${path}`, () => {
  let i = 0;
  let token;

  function bodyCheckIfDeleted(res) {
    const errors = [];
    if (res.body.isDeleted === 0) {
      errors.push(new Error('isDeleted should be > 0'));
    }

    if (errors.length) {
      throw new Error(errors);
    }
  }

  function notFound() {
    const errors = [];
    Aspect.findById(i)
    .then((aspect) => {
      if (aspect) {
        errors.push(new Error('should not have found a record with this id'));
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
    Aspect.create(u.toCreate)
    .then((aspect) => {
      i = aspect.id;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('delete by id', (done) => {
    api.delete(`${path}/${i}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect(bodyCheckIfDeleted)
    .expect(notFound)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });


  it('delete by name', (done) => {
    api.delete(`${path}/${u.toCreate.name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect(bodyCheckIfDeleted)
    .expect(notFound)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('try doing a delete where you send a body');

  it('try doing a delete without passing the id or absolutePath as extra ' +
  'path on the url');

  it('try deleting a non-existent id');

  it('try deleting a non-existent absolutePath');

  it('try doing a delete with some query params on the url');
});

describe('api: aspects: DELETE RelatedLinks', () => {
  let token;
  let i;

  const n = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    relatedLinks: [
      {
        name: 'rlink0',
        url: 'https://samples.com'
      },
      {
        name: 'rlink1',
        url: 'https://samples.com'
      },
    ]
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    Aspect.create(n)
    .then((asp) => {
      i = asp.id;
      done();
    })
    .catch((err) => done(err));
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('delete all related links', (done) => {
    api.delete(allDeletePath.replace('{key}', i))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(0);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('delete one relatedLink', (done) => {
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'rlink0'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(1);
      expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('delete related link by name', (done) => {
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'rlink0'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(1);
      expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});

describe(`api: DELETE ${path} with samples`, () => {
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
    .catch((err) => done(err));
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
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('deleting aspect deletes its samples', (done) => {
    api.delete(`${path}/${i}`)
    .set('Authorization', token)
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

      return done();
    });
  });
});
