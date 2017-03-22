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
'use strict';

const expect = require('chai').expect;
const tu = require('../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;
const publisher = require('../../realtime/redisPublisher');
const sampleEvent = require('../../realtime/constants').events.sample;

describe('redis Publisher', () => {
  const subjectNA = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const subjectSA = { name: `${tu.namePrefix}SouthAmerica`, isPublished: true };

  const samp = { value: 10 };
  let sampId;
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
      sampId = s.id;
      return Subject.create(subjectSA);
    })
    .then(() => done())
    .catch(done);
  });
  after(u.forceDelete);
  describe('publishSample function tests: ', () => {
    it('with EventType argument: sample should be published with subject  ' +
      ' object and asbolutePath field', (done) => {
      Sample.findById(sampId)
      .then((sam) => publisher.publishSample(sam, Subject, sampleEvent.upd))
      .then((pubObj) => {
        expect(pubObj.subject).to.not.equal(null);
        expect(pubObj.subject.name).to.equal(subjectNA.name);
        expect(pubObj.subject.tags.length).to.equal(0);
        expect(pubObj.absolutePath).to.equal(subjectNA.name);
        expect(pubObj.aspect.tags.length).to.equal(0);
        done();
      })
      .catch(done);
    });

    it('without EventType argument: sample should be published with subject ' +
      ' object and asbolutePath field', (done) => {
      Sample.findById(sampId)
      .then((sam) => publisher.publishSample(sam, Subject))
      .then((pubObj) => {
        expect(pubObj.subject).to.not.equal(null);
        expect(pubObj.subject.name).to.equal(subjectNA.name);
        expect(pubObj.subject.tags.length).to.equal(0);
        expect(pubObj.absolutePath).to.equal(subjectNA.name);
        expect(pubObj.aspect.tags.length).to.equal(0);
        done();
      })
      .catch(done);
    });

    it('when tried to publish sample without aspect,'+
      ' aspect should be attached', (done) => {
      Sample.findById(sampId)
      .then((sam) => {
        const sampInst = sam.get();
        delete sampInst.aspect;
        return publisher.publishSample(sam, Subject, sampleEvent.upd, Aspect);
      })
      .then((pubObj) => {
        expect(pubObj.aspect).to.not.equal(null);
        expect(pubObj.aspect.name).to.equal(humidity.name);
        expect(pubObj.aspect.tags.length).to.equal(0);
        expect(pubObj.subject).to.not.equal(null);
        expect(pubObj.subject.name).to.equal(subjectNA.name);
        expect(pubObj.subject.tags.length).to.equal(0);
        expect(pubObj.absolutePath).to.equal(subjectNA.name);
        expect(pubObj.aspect.tags.length).to.equal(0);

        done();
      })
      .catch(done);
    });
  });

  describe('getSampleEventType function tests: ', () => {
    it('update Event', (done) => {
      Sample.findById(sampId)
      .then((sam) => sam.update({ value: 10}))
      .then((updSample) => {
        // pass sequelize object
        let eventType = publisher.getSampleEventType(updSample);
        expect(eventType).to.equal(sampleEvent.upd);
        // pass plain object
        eventType = publisher.getSampleEventType(updSample.get());
        expect(eventType).to.equal(sampleEvent.upd);
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
        let eventType = publisher.getSampleEventType(sam);
        expect(eventType).to.equal(sampleEvent.add);
        // pass plain object
        eventType = publisher.getSampleEventType(sam.get());
        expect(eventType).to.equal(sampleEvent.add);
        done();
      })
      .catch(done);
    });
  });
});
