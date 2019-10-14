/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/helperFunctions.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const sampleModel = require('../../../../cache/models/samples');
const checkWritePerm = sampleModel.checkWritePermission;
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const tu = require('../../../testUtils');
const u = require('./utils');
const redisOps = require('../../../../cache/redisOps');
const User = tu.db.User;

describe('tests/cache/models/samples/helperFunctions.js >', () => {
  describe('checkWritePermission >', () => {
    const aspName = u.aspectToCreate.name;
    let mainUser;
    let otherUser;
    let aspect;

    before((done) => {
      tu.toggleOverride('enableRedisSampleStore', true);
      tu.createToken()
        .then(() => tu.createUser('myUniqueUser'))
        .then((usr) => {
          otherUser = usr;
          done();
        })
        .catch(done);
    });

    before((done) => {
      User.findOne({ where: { name: tu.userName } })
        .then((usr) => {
          mainUser = usr;
          return tu.db.Aspect.create(u.aspectToCreate);
        })
        .then((asp) => {
          aspect = asp;
          return samstoinit.populate();
        })
        .then(() => done())
        .catch(done);
    });

    after(rtu.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride('enableRedisSampleStore', false));
    it('writers does not exist, anyone can write', (done) => {
      redisOps.executeCommand(
          ['exists', redisOps.getAspectWritersKey(aspName)])
        .then((res) => {
          expect(res).to.equal(0);
          return checkWritePerm(aspName, mainUser.name);
        })
        .then((res) => {
          expect(res).to.equal(true);
          done();
        })
        .catch(done);
    });

    it('writers exist, writer found, only writers can write', (done) => {
      redisOps.setWriters({
        name: aspName,
        writers: [mainUser],
      })
      .then(() => redisOps.executeCommand(
        ['exists', redisOps.getAspectWritersKey(aspect.name)]
      ))
      .then((res) => {
        expect(res).to.equal(1);
        return checkWritePerm(aspName, mainUser.name);
      })
      .then((res) => {
        expect(res).to.equal(true);
        checkWritePerm(aspName, otherUser.name)
          .catch((err) => {
            expect(err.name).to.equal('UpdateDeleteForbidden');
            expect(err.explanation).to.equal('User "___myUniqueUser" does ' +
              'not have write permission for aspect "___TEST_ASPECT"');
            done();
          });
      })
      .catch(done);
    });

    it('isBulk, writers exist, writer found, only writers can write',
      (done) => {
        redisOps.setWriters({
          name: aspName,
          writers: [mainUser],
        })
        .then(() => redisOps.executeCommand(
          ['exists', redisOps.getAspectWritersKey(aspect.name)]
        ))
        .then((res) => {
          expect(res).to.equal(1);
          return checkWritePerm(aspName, mainUser.name, true);
        })
        .then((res) => {
          expect(res).to.equal(true);
          return checkWritePerm(aspName, otherUser.name, true);
        })
        .catch((obj) => {
          const err = obj.explanation;
          expect(err.name).to.equal('UpdateDeleteForbidden');
          expect(obj.isFailed).to.equal(true);
          expect(err.explanation).to.equal('User "___myUniqueUser" does ' +
            'not have write permission for aspect "___TEST_ASPECT"');
          done();
        })
        .catch(done);
      });
  });
});
