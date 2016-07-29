/**
 * tests/api/v1/aspects/put.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Tag = tu.db.Tag;
const path = '/v1/aspects';
const expect = require('chai').expect;

describe(`api: PUT ${path}`, () => {
  const token = tu.createToken();
  let aspectId = 0;

  beforeEach((done) => {
    Aspect.create(u.toCreate)
    .then((aspect) => {
      aspectId = aspect.id;
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  afterEach(u.forceDelete);

  it('update timeout and verify', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
    };
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, 0)) {
        throw new Error('expecting aspect');
      }

      if (res.body.timeout !== toPut.timeout) {
        throw new Error('Incorrect timeout Value');
      }

      if (res.body.name !== toPut.name) {
        throw new Error('Incorrect name Value');
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

describe('api: PUT aspects with related links', () => {
  const token = tu.createToken();
  let aspectId = 0;

  before((done) => {
    Aspect.create(u.toCreate)
    .then((aspect) => {
      aspectId = aspect.id;
      done();
    })
    .catch((err) => {
      done(err);
    });
  });
  after(u.forceDelete);

  it('update to add related links', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' }]
    };
    api.put(`${path}/${aspectId}`)
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
      timeout: '220s',
      relatedLinks: [{ name: 'link1', url: 'https://samples.com' }]
    };
    api.put(`${path}/${aspectId}`)
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
      timeout: '220s',
      relatedLinks: [
        { name: 'link0', url: 'https://samples.com' },
        { name: 'link1', url: 'https://samples.com' },
      ]
    };
    api.put(`${path}/${aspectId}`)
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

describe('api: PUT aspects with tags', () => {
  const token = tu.createToken();
  let aspectId = 0;

  before((done) => {
    Aspect.create(u.toCreate)
    .then((aspect) => {
      aspectId = aspect.id;
      done();
    })
    .catch((err) => {
      done(err);
    });
  });
  after(u.forceDelete);

  it('update to add tags', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
      tags: [{ name: 'tagX' }]
    };
    api.put(`${path}/${aspectId}`)
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
      timeout: '220s',
      tags: [{ name: 'tagX' }]
    };
    api.put(`${path}/${aspectId}`)
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

  it('update tags with some additions and deletions', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
      tags: [
        { name: 'tag0' },
        { name: 'tag1' },
      ]
    };
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(2);
      for (let k=0;k<res.body.tags.length;k++) {
        expect(res.body.tags[k]).to.have.property('id');
        expect(res.body.tags[k]).to.have.property('name', 'tag'+k);
      }
      Tag.findAll({ where: { associationId: aspectId } })
      .then((tags) => {
        expect(tags.length).to.have.length(2);
        for (let k=0;k<tags.length;k++) {
          expect(tags[k]).to.have.property('id');
          expect(tags[k]).to.have.property('name', 'tag'+k);
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
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(0);
      Tag.findAll({ where: { associationId: aspectId } })
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
