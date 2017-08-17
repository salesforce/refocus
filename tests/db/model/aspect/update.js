/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/update.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const User = tu.db.User;
const Profile = tu.db.Profile;

describe('tests/db/model/aspect/update.js >', () => {
  describe('db: aspect: update >', () => {
    beforeEach((done) => {
      u.createMedium()
      .then(() => done())
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('update criticalRange', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ criticalRange: [100, 200] }))
      .then(() => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => {
        if (Array.isArray(o.criticalRange) &&
          o.criticalRange[0] === 100 &&
          o.criticalRange[1] === 200) {
          done();
        } else {
          done(new Error('expecting it to be updated'));
        }
      })
      .catch(done);
    });

    it('update warningRange', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ warningRange: [100, 200] }))
      .then(() => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => {
        if (Array.isArray(o.warningRange) &&
          o.warningRange[0] === 100 &&
          o.warningRange[1] === 200) {
          done();
        } else {
          done(new Error('expecting it to be updated'));
        }
      })
      .catch(done);
    });

    it('update infoRange', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ infoRange: [200, 300] }))
      .then(() => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => {
        if (Array.isArray(o.infoRange) &&
          o.infoRange[0] === 200 &&
          o.infoRange[1] === 300) {
          done();
        } else {
          done(new Error('expecting it to be updated'));
        }
      })
      .catch(done);
    });

    it('update okRange', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ okRange: [300, 400] }))
      .then(() => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => {
        if (Array.isArray(o.okRange) &&
          o.okRange[0] === 300 &&
          o.okRange[1] === 400) {
          done();
        } else {
          done(new Error('expecting it to be updated'));
        }
      })
      .catch(done);
    });

    it('update name of an aspect', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => {
        expect(o.dataValues).to.have.property('name').to.equal(u.name);
        return o.update({ name: 'newName' });
      })
      .then((o) => {
        expect(o.dataValues).to.have.property('name').to.equal('newName');
        done();
      })
      .catch(done);
    });

    it('update description of an aspect', (done) => {
      const newDescription = 'This is some new and interesting description.';
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ description: newDescription }))
      .then((o) => {
        expect(o.dataValues).to.have.property('description', newDescription);
        done();
      })
      .catch(done);
    });

    it('update helpEmail of an aspect', (done) => {
      const newEmail = 'newemail@test.com';
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ helpEmail: newEmail }))
      .then((o) => {
        expect(o.dataValues).to.have.property('helpEmail', newEmail);
        done();
      })
      .catch(done);
    });

    it('update helpUrl of an aspect', (done) => {
      const newUrl = 'http://www.updatedUrl.com';
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ helpUrl: newUrl }))
      .then((o) => {
        expect(o.dataValues).to.have.property('helpUrl', newUrl);
        done();
      })
      .catch(done);
    });

    it('update isPublished of an aspect', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ isPublished: false }))
      .then((o) => {
        expect(o.dataValues).to.have.property('isPublished', false);
        done();
      })
      .catch(done);
    });

    it('update timeout field of an aspect', (done) => {
      const newTimeout = '5m';
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ timeout: newTimeout }))
      .then((o) => {
        expect(o.dataValues).to.have.property('timeout', newTimeout);
        done();
      })
      .catch(done);
    });

    it('update valueLabel field of an aspect', (done) => {
      const newLabel = 'hrs';
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ valueLabel: newLabel }))
      .then((o) => {
        expect(o.dataValues).to.have.property('valueLabel', newLabel);
        done();
      })
      .catch(done);
    });

    it('update valueType field of an aspect', (done) => {
      const newType = 'NUMERIC';
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ valueType: newType }))
      .then((o) => {
        expect(o.dataValues).to.have.property('valueType', newType);
        done();
      })
      .catch(done);
    });

    it('update imageUrl of an aspect', (done) => {
      const newUrl = 'http://www.newtestUrl.com';
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.update({ imageUrl: newUrl }))
      .then((o) => {
        expect(o.dataValues).to.have.property('imageUrl', newUrl);
        done();
      })
      .catch(done);
    });
  }); // db: aspect: update:

  describe('relatedLinks >', () => {
    afterEach(u.forceDelete);
    it('update a relatedLink', (done) => {
      const asp = u.getSmall();
      asp.relatedLinks = [{ name: '___reLink', url: 'https://fakelink.com' }];
      Aspect.create(asp)
        .then((o) => {
          o.relatedLinks = [
            { name: 'new-reLink', url: 'https://evenfakerlink.com' },
          ];
          return o.save();
        })
        .then((o) => {
          expect(o.dataValues.relatedLinks[0]).to.have.property('name')
            .to.equal('new-reLink');
          expect(o.dataValues.relatedLinks[0]).to.have.property('url')
            .to.equal('https://evenfakerlink.com');
          done();
        })
        .catch(done);
    });

    it('update a relatedLink', (done) => {
      const asp = u.getSmall();
      asp.relatedLinks = [{ name: '___reLink', url: 'https://fakelink.com' }];
      Aspect.create(asp)
      .then((o) => {
        o.relatedLinks = [
          { name: 'new-reLink', url: 'https://evenfakerlink.com' },
        ];
        return o.save();
      })
      .then((o) => {
        expect(o.dataValues.relatedLinks[0]).to.have.property('name')
          .to.equal('new-reLink');
        expect(o.dataValues.relatedLinks[0]).to.have.property('url')
          .to.equal('https://evenfakerlink.com');
        done();
      })
      .catch(done);
    });

    it('update a Tag', (done) => {
      const asp = u.getSmall();
      asp.tags = ['___tagged'];
      Aspect.create(asp)
      .then((o) => {
        o.tags = ['not-tagged'];
        return o.save();
      })
      .then((o) => {
        expect(o.dataValues.tags).to.have.members(['not-tagged']);
        done();
      })
      .catch(done);
    });
  }); // related links

  describe('Field Validation >', () => {
    afterEach(u.forceDelete);

    it('without url field should fail', (done) => {
      const asp = u.getSmall();
      asp.relatedLinks = [{ name: '___reLink' }];
      Aspect.create(asp)
      .then((o) => {
        o.relatedLinks = [
          { name: 'new-reLink', url: 'https://evenfakerlink.com' },
        ];
        return o.save();
      })
      .then((o) => {
        expect(o.dataValues.relatedLinks[0]).to.have.property('name')
          .to.equal('new-reLink');
        expect(o.dataValues.relatedLinks[0]).to.have.property('url')
          .to.equal('https://evenfakerlink.com');
        done();
      })
      .catch(done);
    });
  }); // Field Validation

  describe('isWritableBy >', () => {
    let prof;
    let aspUnprotected;
    let aspProtected;
    let user1;
    let user2;

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
        const a = u.getSmall();
        return Aspect.create(a);
      })
      .then((aspect) => {
        aspUnprotected = aspect;
        const a = u.getSmall();
        a.name += 'Protected';
        return Aspect.create(a);
      })
      .then((aspect) => {
        aspProtected = aspect;
        return aspect.addWriters([user1]);
      })
      .then(() => done())
      .catch(done);
    });

    after(u.forceDelete);

    it('aspect is not write-protected, isWritableBy true', (done) => {
      aspUnprotected.isWritableBy(user1.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.true;
        done();
      })
      .catch(done);
    });

    it('aspect is write-protected, isWritableBy true', (done) => {
      aspProtected.isWritableBy(user1.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.true;
        done();
      })
      .catch(done);
    });

    it('aspect is write-protected, isWritableBy false', (done) => {
      aspProtected.isWritableBy(user2.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.false;
        done();
      })
      .catch(done);
    });
  }); // isWritableBy
});
