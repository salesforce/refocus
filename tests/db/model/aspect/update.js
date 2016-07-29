/**
 * tests/db/model/aspect/update.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;

describe('db: aspect: update: ', () => {
  beforeEach((done) => {
    u.createMedium()
    .then(() => done())
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('update criticalRange', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => o.update({ criticalRange: [100, 200] }))
    .then(() => Aspect.findOne({ where: { name: u.name } }))
    .then((o) => {
      // console.log(o.dataValues.criticalRange);
      if (Array.isArray(o.criticalRange) &&
        o.criticalRange[0] === 100 &&
        o.criticalRange[1] === 200) {
        done();
      } else {
        done(new Error('expecting it to be updated'));
      }
    })
    .catch((err) => done(err));
  });

  it('update warningRange', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => o.update({ warningRange: [100, 200] }))
    .then(() => Aspect.findOne({ where: { name: u.name } }))
    .then((o) => {
      // console.log(o.dataValues.warningRange);
      if (Array.isArray(o.warningRange) &&
        o.warningRange[0] === 100 &&
        o.warningRange[1] === 200) {
        done();
      } else {
        done(new Error('expecting it to be updated'));
      }
    })
    .catch((err) => done(err));
  });

  it('update infoRange', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => o.update({ infoRange: [200, 300] }))
    .then(() => Aspect.findOne({ where: { name: u.name } }))
    .then((o) => {
      // console.log(o.dataValues.infoRange);
      if (Array.isArray(o.infoRange) &&
        o.infoRange[0] === 200 &&
        o.infoRange[1] === 300) {
        done();
      } else {
        done(new Error('expecting it to be updated'));
      }
    })
    .catch((err) => done(err));
  });

  it('update okRange', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => o.update({ okRange: [300, 400] }))
    .then(() => Aspect.findOne({ where: { name: u.name } }))
    .then((o) => {
      // console.log(o.dataValues.okRange);
      if (Array.isArray(o.okRange) &&
        o.okRange[0] === 300 &&
        o.okRange[1] === 400) {
        done();
      } else {
        done(new Error('expecting it to be updated'));
      }
    })
    .catch((err) => done(err));
  });

  it('update name of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      // console.log(o.dataValues);
      expect(o.dataValues).to.have.property('name').to.equal(u.name);
      return o.update({ name: 'newName' });
    })
    .then((o) => {
      expect(o.dataValues).to.have.property('name').to.equal('newName');
      // console.log(o.dataValues);
      done();
    })
    .catch((err) => done(err));
  });

  it('update description of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const descriptionDefault = o.dataValues.description;
      // console.log(o.dataValues.description);
      expect(o.dataValues).to.have.property('description')
      .to.equal(descriptionDefault);
      return o.update({ description: 'newDescription' });
    })
    .then((o) => {
      const newDefault = o.dataValues.description;
      expect(o.dataValues).to.have.property('description').to.equal(newDefault);
      // console.log(o.dataValues.description);
      done();
    })
    .catch((err) => done(err));
  });

  it('update helpEmail of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const helpEmailDefault = o.dataValues.helpEmail;
      // console.log(o.dataValues.helpEmail);
      expect(o.dataValues).to.have.property('helpEmail')
      .to.equal(helpEmailDefault);
      return o.update({ helpEmail: 'newemail@test.com' });
    })
    .then((o) => {
      const newDefault = o.dataValues.helpEmail;
      expect(o.dataValues).to.have.property('helpEmail').to.equal(newDefault);
      // console.log(o.dataValues.helpEmail);
      done();
    })
    .catch((err) => done(err));
  });

  it('update helpUrl of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const helpUrlDefault = o.dataValues.helpUrl;
      // console.log(o.dataValues.helpUrl);
      expect(o.dataValues).to.have.property('helpUrl')
      .to.equal(helpUrlDefault);
      return o.update({ helpUrl: 'http://www.updatedUrl.com' });
    })
    .then((o) => {
      const newDefault = o.dataValues.helpUrl;
      expect(o.dataValues).to.have.property('helpUrl').to.equal(newDefault);
      // console.log(o.dataValues.helpUrl);
      done();
    })
    .catch((err) => done(err));
  });

  it('update isPublished of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const isPublishedDefault = o.dataValues.isPublished;
      // console.log(o.dataValues.isPublished);
      expect(o.dataValues).to.have.property('isPublished')
      .to.equal(isPublishedDefault);
      return o.update({ isPublished: false });
    })
    .then((o) => {
      const newDefault = o.dataValues.isPublished;
      expect(o.dataValues).to.have.property('isPublished').to.equal(newDefault);
      // console.log(o.dataValues.isPublished);
      done();
    })
    .catch((err) => done(err));
  });

  it('update timeout field of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const timeoutDefault = o.dataValues.timeout;
      // console.log(o.dataValues.timeout);
      expect(o.dataValues).to.have.property('timeout')
      .to.equal(timeoutDefault);
      return o.update({ timeout: '5m' });
    })
    .then((o) => {
      const newDefault = o.dataValues.timeout;
      expect(o.dataValues).to.have.property('timeout').to.equal(newDefault);
      // console.log(o.dataValues.timeout);
      done();
    })
    .catch((err) => done(err));
  });

  it('update valueLabel field of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const valueLabelDefault = o.dataValues.valueLabel;
      // console.log(o.dataValues.valueLabel);
      expect(o.dataValues).to.have.property('valueLabel')
      .to.equal(valueLabelDefault);
      return o.update({ valueLabel: 'ping' });
    })
    .then((o) => {
      const newDefault = o.dataValues.valueLabel;
      expect(o.dataValues).to.have.property('valueLabel').to.equal(newDefault);
      // console.log(o.dataValues.valueLabel);
      done();
    })
    .catch((err) => done(err));
  });

  it('update valueType field of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const valueTypeDefault = o.dataValues.valueType;
      // console.log(o.dataValues.valueType);
      expect(o.dataValues).to.have.property('valueType')
      .to.equal(valueTypeDefault);
      return o.update({ valueType: 'NUMERIC' });
    })
    .then((o) => {
      const newDefault = o.dataValues.valueType;
      expect(o.dataValues).to.have.property('valueType').to.equal(newDefault);
      // console.log(o.dataValues.valueType);
      done();
    })
    .catch((err) => done(err));
  });

  it('update imageUrl of an aspect', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      const imageUrlDefault = o.dataValues.imageUrl;
      // console.log(o.dataValues.imageUrl);
      expect(o.dataValues).to.have.property('imageUrl')
      .to.equal(imageUrlDefault);
      expect(o.dataValues.imageUrl).to.be.null;
      return o.update({ imageUrl: 'http://www.newtestUrl.com' });
    })
    .then((o) => {
      const newDefault = o.dataValues.imageUrl;
      expect(o.dataValues).to.have.property('imageUrl').to.equal(newDefault);
      // console.log(o.dataValues.imageUrl);
      done();
    })
    .catch((err) => done(err));
  });
});

describe('associations: relatedLinks & Tags ', () => {
  afterEach(u.forceDelete);
  describe('relatedLinks: ', () => {
    it('update a relatedLink', (done) => {
      const asp = u.getSmall();
      asp.relatedLinks = [{ name: '___reLink', url: 'https://fakelink.com'}];
      Aspect.create(asp)
        .then((o) => {
          // console.log(o.dataValues.relatedLinks);
          o.relatedLinks= [{ name: 'new-reLink',
                    url: 'https://evenfakerlink.com'}];
          return o.save();
        })
        .then((o) => {
          expect(o.dataValues.relatedLinks[0]).to.have.property('name')
            .to.equal('new-reLink');
          expect(o.dataValues.relatedLinks[0]).to.have.property('url')
            .to.equal('https://evenfakerlink.com');
          done();
        })
        .catch((err) => done(err));
    });
    it('update a relatedLink', (done) => {
      const asp = u.getSmall();
      asp.relatedLinks = [{ name: '___reLink', url: 'https://fakelink.com'}];
      Aspect.create(asp)
        .then((o) => {
          // console.log(o.dataValues.relatedLinks);
          o.relatedLinks= [{ name: 'new-reLink',
                    url: 'https://evenfakerlink.com'}];
          return o.save();
        })
        .then((o) => {
          expect(o.dataValues.relatedLinks[0]).to.have.property('name')
            .to.equal('new-reLink');
          expect(o.dataValues.relatedLinks[0]).to.have.property('url')
            .to.equal('https://evenfakerlink.com');
          done();
        })
        .catch((err) => done(err));
    });
    it('update a Tag', (done) => {
      const asp = u.getSmall();
      asp.tags = [{ name: '___tagged', associatedModelName: 'Aspect' }];
      Aspect.create(asp, { include: Aspect.getAspectAssociations().tags })
        .then((o) => {
          // console.log(o.dataValues.Tags);
          return o.tags[0].destroy();
        })
        .then((o) => {
          // console.log(o.dataValues);
          expect(o.dataValues).to.have.property('isDeleted').to.not.equal(0);
          done();
        })
        .catch((err) => done(err));
    });
  });
});

describe('Field Validation', () => {
  afterEach(u.forceDelete);
  describe('relatedLinks: ', () => {
    it('without url field should fail', (done) => {
      const asp = u.getSmall();
      asp.relatedLinks = [{ name: '___reLink' }];
      Aspect.create(asp)
        .then((o) => {
          o.relatedLinks= [{ name: 'new-reLink',
                    url: 'https://evenfakerlink.com' }];
          return o.save();
        })
        .then((o) => {
          expect(o.dataValues.relatedLinks[0]).to.have.property('name')
            .to.equal('new-reLink');
          expect(o.dataValues.relatedLinks[0]).to.have.property('url')
            .to.equal('https://evenfakerlink.com');
          done();
        })
        .catch((err) => done(err));
    });
  });
});
