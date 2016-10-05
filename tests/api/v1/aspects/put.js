/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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
  let token;
  let aspectId = 0;

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
      aspectId = aspect.id;
      done();
    })
    .catch((err) => {
      done(err);
    });
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

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
  let token;
  let aspectId = 0;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

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
  after(tu.forceDeleteUser);

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
  let token;
  let aspectId = 0;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

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
  after(tu.forceDeleteUser);

  it('update to add tags', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
      tags: ['tagX']
    };
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tagX']);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });
  it('cannot update aspect tags with names starting with a dash(-)', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
      tags: ['-tagX']
    };
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
      .expect((res) => {
        expect(res.body).to.property('errors');
        expect(res.body.errors[0].type)
          .to.equal(tu.schemaValidationErrorName);
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
      tags: ['tagX']
    };
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tagX']);
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
        'tag0',
        'tag1'
      ]
    };
    api.put(`${path}/${aspectId}`)
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
      Aspect.findOne({ where: { id: aspectId } })
      .then((asp) => {
        expect(asp.tags).to.have.length(2);
        expect(asp.tags).to.have.members(toPut.tags);
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
    api.put(`${path}/${aspectId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(0);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      Aspect.findOne({ where: { id: aspectId } })
      .then((asp) => {
        expect(asp.tags).to.have.length(0);
      });
      return done();
    });
  });
});
