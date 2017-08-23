/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/sampleNameUpdate.js
 */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('tests/db/model/sample/sampleNameUpdate.js >', () => {
  describe('sample name gets updated >', () => {
    afterEach(u.forceDelete);

    let a1;
    let a2;
    let b1;
    let b2;
    let b3;

    const xa1 = {
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
    };

    const xa2 = {
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '30s',
      valueType: 'NUMERIC',
    };

    const xb1 = {
      isPublished: true,
      name: `${tu.namePrefix}Subject1`,
    };

    const xb2 = {
      isPublished: true,
      name: `${tu.namePrefix}Subject2`,
    };

    const xb3 = {
      isPublished: true,
      name: `${tu.namePrefix}Subject3`,
    };

    beforeEach((done) => {
      Aspect.create(xa1)
      .then((a) => {
        a1 = a;
        return Aspect.create(xa2);
      })
      .then((a) => {
        a2 = a;
        return Subject.create(xb1);
      })
      .then((b) => {
        b1 = b;
        xb2.parentId = b1.id;
        return Subject.create(xb2);
      })
      .then((b) => {
        b2 = b;
        xb3.parentId = b2.id;
        return Subject.create(xb3);
      })
      .then((b) => {
        b3 = b;
        return [
          { aspectId: a1.id, subjectId: b1.id },
          { aspectId: a1.id, subjectId: b2.id },
          { aspectId: a1.id, subjectId: b3.id },
          { aspectId: a2.id, subjectId: b1.id },
          { aspectId: a2.id, subjectId: b2.id },
          { aspectId: a2.id, subjectId: b3.id },
        ];
      })
      .each((s) => Sample.create(s))
      .then(() => done())
      .catch(done);
    });

    describe('subject name/parentId gets updated >', () => {
      it('sample name updated when subject name is updated, ' +
      'when subject parent name is updated, ' +
      'when subject grandparent name is updated', (done) => {
        Subject.findById(b1.id)
        .then((b) => b.update({ name: `${tu.namePrefix}UPDATED` }))
        .then(() => Subject.scope('withSamples').findById(b1.id))
        .then((b) => b.getSamples())
        .each((samp) => {
          samp.get('name').should.match(/$__UDPATED|__Aspect[12]/);
        })
        .then(() => Subject.scope('withSamples').findById(b2.id))
        .then((b) => b.getSamples())
        .each((samp) => {
          samp.get('name').should.match(/$__UDPATED|__Aspect[12]/);
        })
        .then(() => Subject.scope('withSamples').findById(b3.id))
        .then((b) => b.getSamples())
        .each((samp) => {
          samp.get('name').should.match(/$__UDPATED|__Aspect[12]/);
        })
        .then(() => done())
        .catch(done);
      });
    });

    describe('aspect name gets updated >', () => {
      it('sample name updated when aspect name is updated', (done) => {
        Aspect.findById(a1.id)
        .then((a) => a.update({ name: `${tu.namePrefix}UPDATED` }))
        .then(() => Aspect.scope('withSamples').findById(a1.id))
        .then((a) => a.getSamples())
        .each((samp) => {
          samp.get('name').should.match(/.*|__UPDATED$/);
        })
        .then(() => done())
        .catch(done);
      });
    });
  });

  describe('isWritableBy >', () => {
    let prof;
    let aspUnprotected;
    let aspProtected;
    let user1;
    let user2;
    let subj;
    let s1;
    let s2;

    before((done) => {
      Profile.create({
        name: tu.namePrefix + '1',
      })
      .then((createdProfile) => {
        prof = createdProfile.id;
        return User.create({
          profileId: prof,
          name: `${tu.namePrefix}user1@example.com`,
          email: 'user1@example.com',
          password: 'user123password',
        });
      })
      .then((createdUser) => {
        user1 = createdUser;
        return User.create({
          profileId: prof,
          name: `${tu.namePrefix}user2@example.com`,
          email: 'user2@example.com',
          password: 'user223password',
        });
      })
      .then((createdUser) => {
        user2 = createdUser;
        const a = {
          name: `${tu.namePrefix}Unprotected`,
          timeout: '1s',
          isPublished: true,
        };
        return Aspect.create(a);
      })
      .then((aspect) => {
        aspUnprotected = aspect;
        const a = {
          name: `${tu.namePrefix}Protected`,
          timeout: '1s',
          isPublished: true,
        };
        return Aspect.create(a);
      })
      .then((aspect) => {
        aspProtected = aspect;
        return aspect.addWriters([user1]);
      })
      .then(() => Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject1`,
      }))
      .then((subject) => {
        subj = subject;
        return Sample.create({
          aspectId: aspUnprotected.id,
          subjectId: subj.id,
        });
      })
      .then((sample) => {
        s1 = sample;
        return Sample.create({
          aspectId: aspProtected.id,
          subjectId: subj.id,
        });
      })
      .then((sample) => {
        s2 = sample;
        done();
      })
      .catch(done);
    });

    after(u.forceDelete);

    it('aspect is not write-protected, sample isWritableBy true', (done) => {
      s1.isWritableBy(user1.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.true;
        done();
      })
      .catch(done);
    });

    it('aspect is write-protected, sample isWritableBy true', (done) => {
      s2.isWritableBy(user1.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.true;
        done();
      })
      .catch(done);
    });

    it('aspect is write-protected, sample isWritableBy false', (done) => {
      s2.isWritableBy(user2.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.false;
        done();
      })
      .catch(done);
    });

    it('returns correct profile access field name', (done) => {
      expect(Sample.getProfileAccessField()).to.equal('sampleAccess');
      done();
    });
  });
});
