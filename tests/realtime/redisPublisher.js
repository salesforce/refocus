/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/redisPublisher.js
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const expect = require('chai').expect;
const tu = require('../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.Sample;
const redisPublisher = require('../../realtime/redisPublisher');
const event = require('../../realtime/constants').events.sample;
const rtu = require('../cache/models/redisTestUtil');
const realTimeUtils = require('../../realtime/utils');
const sinon = require('sinon');

describe('tests/realtime/redisPublisher.js >', () => {
  describe('publishSample with redis cache on >', () => {
    const subjectName = `${tu.namePrefix}Subject`;
    const aspectName = `${tu.namePrefix}Aspect`;
    const sampleName = `${subjectName}|${aspectName}`;

    before((done) => {
      let a1;
      let s1;
      Aspect.create({
        isPublished: true,
        name: aspectName,
        timeout: '30s',
        valueType: 'NUMERIC',
        criticalRange: [0, 1],
        relatedLinks: [
          { name: 'Google', value: 'http://www.google.com' },
          { name: 'Yahoo', value: 'http://www.yahoo.com' },
        ],
      })
        .then((created) => (a1 = created))
        .then(() => Subject.create({
          isPublished: true,
          name: subjectName,
        }))
        .then((created) => (s1 = created))
        .then(() => Sample.create({
          messageCode: '25',
          subjectId: s1.id,
          aspectId: a1.id,
          value: '0',
          relatedLinks: [
            { name: 'Salesforce', value: 'http://www.salesforce.com' },
          ],
        }))
        .then(() => done())
        .catch(done);
    });

    after((done) => {
      rtu.forceDelete(done);
    });

    it('certain aspect fields should be array, others undefined', (done) => {
      Sample.findOne(sampleName)
        .then((sam) => redisPublisher.publishSample(sam, event.upd))
        .then((pubObj) => {
          expect(pubObj.aspect).to.not.equal(null);
          expect(pubObj.aspect.name).to.equal(aspectName);
          expect(pubObj.aspect.writers).to.be.undefined;
          expect(Array.isArray(pubObj.aspect.relatedLinks)).to.be.true;
          expect(pubObj.subject).to.not.have.property('helpEmail');
          done();
        })
        .catch(done);
    });

    it('certain subject fields should be array, others undefined', (done) => {
      Sample.findOne(sampleName)
        .then((sam) => redisPublisher.publishSample(sam, event.upd))
        .then((pubObj) => {
          expect(pubObj.subject).to.not.equal(null);
          expect(pubObj.subject.name).to.equal(subjectName);
          expect(pubObj.subject).to.not.have.property('relatedLinks');
          expect(pubObj.subject).to.not.have.property('helpEmail');
          done();
        })
        .catch(done);
    });

    it('when tried to publish sample without aspect, ' +
      'aspect should be attached, along with subject', (done) => {
      Sample.findOne(sampleName)
        .then((sam) => {
          const sampInst = sam;
          delete sampInst.aspect;
          return redisPublisher.publishSample(sam, event.upd);
        })
        .then((pubObj) => {
          expect(pubObj.aspect).to.not.equal(null);
          expect(pubObj.aspect.name).to.equal(aspectName);
          expect(pubObj.aspect.writers).to.be.undefined;
          expect(Array.isArray(pubObj.aspect.relatedLinks)).to.be.true;
          expect(pubObj.subject).to.not.have.property('helpEmail');

          // check subject is still there
          expect(pubObj.subject).to.not.equal(null);
          expect(pubObj.subject.name).to.equal(subjectName);
          expect(pubObj.subject).to.not.have.property('writers');
          expect(pubObj.subject).to.not.have.property('relatedLinks');
          expect(pubObj.subject).to.not.have.property('helpEmail');
          done();
        })
        .catch(done);
    });
  });

  describe('redis Publisher >', () => {
    const subjectNA = {
      name: `${tu.namePrefix}NorthAmerica`,
      isPublished: true,
    };
    const subjectSA = {
      name: `${tu.namePrefix}SouthAmerica`,
      isPublished: true,
    };

    const samp = { value: 10 };
    let sampleName;
    let ipar;
    const humidity = {
      name: `${tu.namePrefix}humidity`,
      timeout: '60s',
      isPublished: true,
    };
    before((done) => {
      Subject.create(subjectNA)
        .then((subj) => {
          ipar = subj.id;
          return Aspect.create(humidity);
        })
        .then((asp) => {
          samp.subjectId = ipar;
          samp.aspectId = asp.id;
          return Sample.create(samp);
        })
        .then((s) => {
          sampleName = s.name;
          return Subject.create(subjectSA);
        })
        .then(() => done())
        .catch(done);
    });
    after(u.forceDelete);

    describe('publishSample function tests >', () => {
      it('with EventType argument: sample should be published with subject ' +
        'object and asbolutePath field', (done) => {
        Sample.findOne(sampleName)
          .then((sam) => redisPublisher
            .publishSample(sam, event.upd))
          .then((pubObj) => {
            expect(pubObj.subject).to.not.equal(null);
            expect(pubObj.subject.name).to.equal(subjectNA.name);
            expect(pubObj.subject).to.not.have.property('helpEmail');
            expect(pubObj.subject.tags.length).to.equal(0);
            expect(pubObj.absolutePath).to.equal(subjectNA.name);
            expect(pubObj.aspect.tags.length).to.equal(0);
            expect(pubObj.aspect.writers).to.be.undefined;
            done();
          })
          .catch(done);
      });

      it('without EventType argument: sample should be published with subject ' +
        ' object and absolutePath field', (done) => {
        Sample.findOne(sampleName)
          .then((sam) => redisPublisher.publishSample(sam, null))
          .then((pubObj) => {
            expect(pubObj.subject).to.not.equal(null);
            expect(pubObj.subject.name).to.equal(subjectNA.name);
            expect(pubObj.subject).to.not.have.property('helpEmail');
            expect(pubObj.subject.tags.length).to.equal(0);
            expect(pubObj.absolutePath).to.equal(subjectNA.name);
            expect(pubObj.aspect.tags.length).to.equal(0);
            expect(pubObj.aspect.writers).to.be.undefined;
            done();
          })
          .catch(done);
      });

      it('when tried to publish sample without aspect, ' +
        'aspect should be attached', (done) => {
        Sample.findOne(sampleName)
          .then((sam) => {
            const sampInst = sam;
            delete sampInst.aspect;
            return redisPublisher.publishSample(sam, event.upd);
          })
          .then((pubObj) => {
            expect(pubObj.aspect).to.not.equal(null);
            expect(pubObj.aspect.name).to.equal(humidity.name);
            expect(pubObj.subject).to.not.have.property('helpEmail');
            expect(pubObj.aspect.tags.length).to.equal(0);
            expect(pubObj.subject).to.not.equal(null);
            expect(pubObj.subject.name).to.equal(subjectNA.name);
            expect(pubObj.subject.tags.length).to.equal(0);
            expect(pubObj.absolutePath).to.equal(subjectNA.name);
            expect(pubObj.aspect.tags.length).to.equal(0);
            expect(pubObj.aspect.writers).to.be.undefined;
            expect(pubObj.subject.absolutePath).to.be.equal(pubObj.absolutePath);
            done();
          })
          .catch(done);
      });
    });

    it('Must return an undefined promise when Error from real time ' +
      'attachAspectSubject', (done) => {
      sinon.stub(realTimeUtils, 'attachAspectSubject')
        .rejects(Error());

      Sample.findOne(sampleName)
        .then((sam) => redisPublisher
          .publishSample(sam, event.upd))
        .then((sample) => {
          expect(sample).to.equal(undefined);
          done();
        }).finally(() => {
        realTimeUtils.attachAspectSubject.restore();
      });
    });

    describe('getSampleEventType function tests >', () => {
      it('update Event', (done) => {
        Sample.update({ value: 10 }, sampleName)
          .then((updSample) => {
            // pass sequelize object
            let eventType = redisPublisher.getSampleEventType(updSample);
            expect(eventType).to.equal(event.upd);

            // pass plain object
            eventType = redisPublisher.getSampleEventType(updSample);
            expect(eventType).to.equal(event.upd);
            done();
          })
          .catch(done);
      });

      it('add Event', (done) => {
        Sample.upsertByName({
          name: subjectSA.name + '|' + humidity.name,
          value: '1',
        })
          .then((sam) => {
            // pass sequelize object
            let eventType = redisPublisher.getSampleEventType(sam);
            expect(eventType).to.equal(event.add);

            // pass plain object
            eventType = redisPublisher.getSampleEventType(sam);
            expect(eventType).to.equal(event.add);
            done();
          })
          .catch(done);
      });
    });
  });

  describe('sample event payload >', () => {
    const subjectName = `${tu.namePrefix}Subject`;
    const aspectName = `${tu.namePrefix}Aspect`;
    const sampleName = `${subjectName}|${aspectName}`;

    before((done) => {
      let a1;
      let s1;
      Aspect.create({
        isPublished: true,
        name: aspectName,
        timeout: '30s',
        valueType: 'NUMERIC',
        criticalRange: [0, 1],
        relatedLinks: [
          { name: 'Google', value: 'http://www.google.com' },
          { name: 'Yahoo', value: 'http://www.yahoo.com' },
        ],
      })
        .then((created) => (a1 = created))
        .then(() => Subject.create({
          isPublished: true,
          name: subjectName,
        }))
        .then((created) => (s1 = created))
        .then(() => Sample.create({
          messageCode: '25',
          subjectId: s1.id,
          aspectId: a1.id,
          value: '0',
          relatedLinks: [
            { name: 'Salesforce', value: 'http://www.salesforce.com' },
          ],
        }))
        .then(() => done())
        .catch(done);
    });

    after((done) => {
      rtu.forceDelete(done);
    });

    it('smaller subject', (done) => {
      Sample.findOne(sampleName)
        .then((sam) => redisPublisher.publishSample(sam, event.upd))
        .then((pubObj) => {
          expect(pubObj.subject).to.not.equal(null);
          expect(pubObj.subject.name).to.equal(subjectName);
          expect(pubObj.subject).to.not.have.property('relatedLinks');
          expect(pubObj.subject).to.not.have.property('helpEmail');
          done();
        })
        .catch(done);
    });
  });
});
