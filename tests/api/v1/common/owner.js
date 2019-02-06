/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/common/owner.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const Promise = require('bluebird');
supertest.Test.prototype.end = Promise.promisify(supertest.Test.prototype.end);
supertest.Test.prototype.then = function (resolve, reject) {
  return this.end().then(resolve).catch(reject);
};

const modelsToTest = {
  aspects: ['post', 'put', 'patch'],
  botActions: ['post', 'patch'],
  botData: ['post', 'patch', 'upsert'],
  bots: ['post', 'put', 'patch'],
  collectorGroups: ['post', 'put', 'patch'],
  collectors: ['start', 'patch'],
  events: ['post', 'post bulk'],
  generators: ['post', 'put', 'patch'],
  generatorTemplates: ['post', 'patch'],
  lenses: ['post', 'put', 'patch'],
  perspectives: ['post', 'put', 'patch'],
  rooms: ['post', 'patch'],
  roomTypes: ['post', 'patch'],
  subjects: ['post', 'put', 'patch'],
};

const skipByName = ['events', 'generatorTemplates'];

let adminToken;
let mainUser;
let otherUser;
let nonexistentUser;
let token1;
let token2;

describe('tests/api/v1/common/owner >', () => {
  before(createTokens);
  after(tu.forceDeleteUser);

  Object.entries(modelsToTest).forEach(runOwnerTestsForModel);
});

function runOwnerTestsForModel([modelName, methods]) {
  let obj;
  let keys;
  let key;
  let dependencyProps;

  describe(`${modelName} owner attribute`, () => {
    const u = getUtilForModel(modelName);
    afterEach(u.forceDelete);

    describe('GET >', () => {
      beforeEach(() => createModel(modelName, mainUser));

      runByKeyAndId(modelName, () => {
        it('basic', () => {
          const token = token1;
          return getOwner({ modelName, key, token })
          .then((res) => {
            expect(res.body.owner.name).to.equal(mainUser.name);
          });
        });
      });
    });

    if (methods.includes('post')) {
      describe('POST >', () => {
        beforeEach(() => createDependencies(modelName, mainUser));

        runByKeyAndId(modelName, () => {
          it('owner defaults to createdBy', () => {
            const owner = undefined;
            const token = token1;
            return postOwner({ modelName, owner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('set owner explicitly', () => {
            const owner = otherUser;
            const token = token1;
            return postOwner({ modelName, owner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('set owner explicitly - nonexistent user (error)', () => {
            const owner = nonexistentUser;
            const token = token1;
            const expectedStatus = constants.httpStatus.BAD_REQUEST;
            return postOwner({ modelName, owner, token, expectedStatus })
            .then((res) => {
              const err = res.body.errors[0];
              expect(err).to.have.property('type', 'ValidationError');
              expect(err).to.have.property(
                'message', 'Attempted to set the owner to a nonexistent user.'
              );
            });
          });
        });
      });
    }

    if (methods.includes('put')) {
      describe('PUT >', () => {
        beforeEach(() => createModel(modelName, mainUser));

        runByKeyAndId(modelName, () => {
          it('owner not changed', () => {
            const newOwner = undefined;
            const token = token1;
            return putOwner({ modelName, key, newOwner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - owner token', () => {
            const newOwner = otherUser;
            const token = token1;
            return putOwner({ modelName, key, newOwner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('change owner - admin token, override', () => {
            const newOwner = otherUser;
            const token = adminToken;
            const override = true;
            return putOwner({ modelName, key, newOwner, token, override })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('change owner - admin token, no override (error)', () => {
            const newOwner = otherUser;
            const token = adminToken;
            const override = false;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            return putOwner({ modelName, key, newOwner, token, expectedStatus, override })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - other token (error)', () => {
            const newOwner = otherUser;
            const token = token2;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            return putOwner({ modelName, key, newOwner, token, expectedStatus })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - other token, override (error)', () => {
            const newOwner = otherUser;
            const token = token2;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            const override = true;
            return putOwner({ modelName, key, newOwner, token, expectedStatus, override })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - nonexistent user (error)', () => {
            const newOwner = nonexistentUser;
            const token = token1;
            const expectedStatus = constants.httpStatus.BAD_REQUEST;
            return putOwner({ modelName, key, newOwner, token, expectedStatus })
            .then((res) => {
              const err = res.body.errors[0];
              expect(err).to.have.property('type', 'ValidationError');
              expect(err).to.have.property(
                'message', 'Attempted to set the owner to a nonexistent user.'
              );
            });
          });
        });
      });
    }

    if (methods.includes('patch')) {
      describe('PATCH >', () => {
        beforeEach(() => createModel(modelName, mainUser));

        runByKeyAndId(modelName, () => {
          it('dont change owner', () => {
            const newOwner = undefined;
            const token = token1;
            return patchOwner({ modelName, key, newOwner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - owner token', () => {
            const newOwner = otherUser;
            const token = token1;
            return patchOwner({ modelName, key, newOwner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('change owner - admin token, override', () => {
            const newOwner = otherUser;
            const token = adminToken;
            const override = true;
            return patchOwner({ modelName, key, newOwner, token, override })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('change owner - admin token, no override (error)', () => {
            const newOwner = otherUser;
            const token = adminToken;
            const override = false;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            return patchOwner({ modelName, key, newOwner, token, expectedStatus, override })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - other token (error)', () => {
            const newOwner = otherUser;
            const token = token2;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            return patchOwner({ modelName, key, newOwner, token, expectedStatus })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - other token, override (error)', () => {
            const newOwner = otherUser;
            const token = token2;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            const override = true;
            return patchOwner({ modelName, key, newOwner, token, expectedStatus, override })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - nonexistent user (error)', () => {
            const newOwner = nonexistentUser;
            const token = token1;
            const expectedStatus = constants.httpStatus.BAD_REQUEST;
            return patchOwner({ modelName, key, newOwner, token, expectedStatus })
            .then((res) => {
              const err = res.body.errors[0];
              expect(err).to.have.property('type', 'ValidationError');
              expect(err).to.have.property(
                'message', 'Attempted to set the owner to a nonexistent user.'
              );
            });
          });
        });
      });
    }

    if (methods.includes('start')) {
      describe('START - new >', () => {
        beforeEach(() => createDependencies(modelName, mainUser));

        runByKeyAndId(modelName, () => {
          it('owner defaults to createdBy', () => {
            const owner = undefined;
            const token = token1;
            return startOwner({ modelName, owner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('set owner explicitly', () => {
            const owner = otherUser;
            const token = token1;
            return startOwner({ modelName, owner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('set owner explicitly - nonexistent user (error)', () => {
            const owner = nonexistentUser;
            const token = token1;
            const expectedStatus = constants.httpStatus.BAD_REQUEST;
            return startOwner({ modelName, owner, token, expectedStatus })
            .then((res) => {
              const err = res.body.errors[0];
              expect(err).to.have.property('type', 'ValidationError');
              expect(err).to.have.property(
                'message', 'Attempted to set the owner to a nonexistent user.'
              );
            });
          });
        });
      });

      describe('START - existing >', () => {
        beforeEach(() => createModel(modelName, mainUser));

        runByKeyAndId(modelName, () => {
          it('owner not changed', () => {
            const owner = undefined;
            const token = token1;
            return startOwner({ modelName, owner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - owner token', () => {
            const owner = otherUser;
            const token = token1;
            return startOwner({ modelName, owner, token })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('change owner - admin token, override', () => {
            const owner = otherUser;
            const token = adminToken;
            const override = true;
            return startOwner({ modelName, owner, token, override })
            .then((res) => {
              expect(res.body.owner.name).to.equal(otherUser.name);
            });
          });

          it('change owner - admin token, no override (error)', () => {
            const owner = otherUser;
            const token = adminToken;
            const override = false;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            return startOwner({ modelName, owner, token, expectedStatus, override })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - other token (error)', () => {
            const owner = otherUser;
            const token = token2;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            return startOwner({ modelName, owner, token, expectedStatus })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - other token, override (error)', () => {
            const owner = otherUser;
            const token = token2;
            const expectedStatus = constants.httpStatus.FORBIDDEN;
            const override = true;
            return startOwner({ modelName, owner, token, expectedStatus, override })
            .then(() => getOwner({ modelName, key, token }))
            .then((res) => {
              expect(res.body.owner.name).to.equal(mainUser.name);
            });
          });

          it('change owner - nonexistent user (error)', () => {
            const owner = nonexistentUser;
            const token = token1;
            const expectedStatus = constants.httpStatus.BAD_REQUEST;
            return startOwner({ modelName, owner, token, expectedStatus })
            .then((res) => {
              const err = res.body.errors[0];
              expect(err).to.have.property('type', 'ValidationError');
              expect(err).to.have.property(
                'message', 'Attempted to set the owner to a nonexistent user.'
              );
            });
          });
        });
      });
    }
  });

  function getOwner({ modelName, key, token }) {
    const path = `/v1/${modelName}`;
    return api.get(`${path}/${key}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK);
  }

  function postOwner({ modelName, key, owner, token, expectedStatus }) {
    owner = owner && owner.name;
    expectedStatus = expectedStatus || constants.httpStatus.CREATED;
    const u = getUtilForModel(modelName);
    const toCreate = u.getBasic({ owner });
    Object.assign(toCreate, dependencyProps);
    const path = `/v1/${modelName}`;
    const req = api.post(`${path}`)
    .set('Authorization', token)
    .expect(expectedStatus);

    if (modelName === 'lenses') {
      Object.entries(toCreate).forEach(([key, value]) => {
        if (key && value) {
          req.field(key, value);
        }
      });
      return req.attach('library', 'tests/api/v1/apiTestsUtils/lens.zip');
    } else {
      return req.send(toCreate);
    }
  }

  function patchOwner({ modelName, key, newOwner, token, expectedStatus, override }) {
    const owner = newOwner && newOwner.name;
    expectedStatus = expectedStatus || constants.httpStatus.OK;
    const path = `/v1/${modelName}`;
    const req = api.patch(`${path}/${key}`)
    .set('Authorization', token)
    .send({ owner })
    .expect(expectedStatus);

    if (override) {
      req.query({ override: 'admin' });
    }

    return req;
  }

  function putOwner({ modelName, key, newOwner, token, expectedStatus, override }) {
    const owner = newOwner && newOwner.name;
    expectedStatus = expectedStatus || constants.httpStatus.OK;
    const u = getUtilForModel(modelName);
    const toPut = u.getBasic({ owner });
    Object.assign(toPut, dependencyProps);
    const path = `/v1/${modelName}`;

    const req = api.put(`${path}/${key}`)
    .set('Authorization', token)
    .expect(expectedStatus);

    if (override) {
      req.query({ override: 'admin' });
    }

    if (modelName === 'lenses') {
      Object.entries(toPut).forEach(([key, value]) => {
        if (key && value) {
          req.field(key, value);
        }
      });
      return req.attach('library', 'tests/api/v1/apiTestsUtils/lens.zip');
    } else {
      return req.send(toPut);
    }
  }

  function startOwner({ modelName, owner, token, expectedStatus, override }) {
    owner = owner && owner.name;
    expectedStatus = expectedStatus || constants.httpStatus.OK;
    const u = getUtilForModel(modelName);
    const toCreate = u.getBasic({ owner });
    Object.assign(toCreate, dependencyProps);
    const path = `/v1/${modelName}/start`;
    const req = api.post(`${path}`)
    .set('Authorization', token)
    .expect(expectedStatus);
    if (override) {
      req.query({ override: 'admin' });
    }

    return req.send(toCreate);
  }

  function createModel(modelName, createdBy, owner) {
    createdBy = createdBy.id;
    const installedBy = createdBy;
    const userId = createdBy;
    const ownerId = owner && owner.id || createdBy;
    const u = getUtilForModel(modelName);
    return u.createBasic({
      createdBy,
      installedBy,
      userId,
      ownerId,
    })
    .then((o) => {
      obj = o.get && o.get() || o;
      dependencyProps = {};
      if (u.getDependencyProps) {
        u.getDependencyProps().forEach((key) => {
          dependencyProps[key] = obj[key];
        });
      }

      keys = {
        id: o.id,
        name: o.name,
      };
    });
  }

  function createDependencies(modelName, createdBy) {
    createdBy = createdBy.id;
    const installedBy = createdBy;
    const userId = createdBy;
    const u = getUtilForModel(modelName);
    if (u.doSetup) {
      return u.doSetup({
        createdBy,
        installedBy,
        userId,
      })
      .then((createdIds) => {
        dependencyProps = createdIds;
      });
    }
  }

  function getUtilForModel(modelName) {
    return require(`../${modelName}/utils`);
  }

  function runByKeyAndId(modelName, tests) {
    let keyTypes = ['id', 'name'];
    if (skipByName.includes(modelName)) {
      keyTypes = ['id'];
    }

    keyTypes.forEach((keyType) => {
      describe(`by ${keyType} >`, () => {
        beforeEach(() => key = keys && keys[keyType]);
        tests();
      });
    });
  }
}

function createTokens() {
  adminToken = tu.createAdminToken();
  nonexistentUser = { name: 'nonexistentUser' };
  return Promise.all([
    tu.createUserAndToken('mainUser')
    .then(({ user, token }) => {
      mainUser = user;
      token1 = token;
    }),
    tu.createUserAndToken('otherUser')
    .then(({ user, token }) => {
      otherUser = user;
      token2 = token;
    }),
  ]);
}
