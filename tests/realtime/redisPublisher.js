/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/setupSocketIO.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;
const publisher = require('../../realtime/redisPublisher');
const event = require('../../realtime/constants').events.sample;

describe('redis Publisher', () => {
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };

  const samp = { value: 10 };
  let sampId;
  let ipar;
  const humidity = {
    name: `${tu.namePrefix}humidity`,
    timeout: '60s',
    isPublished: true,
  };
  before((done) => {
    Subject.create(par)
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
      done();
    })
    .catch(done);
  });
  after(u.forceDelete);

  it('sample should be published with subject object ' +
      ' and asbolutePath field' , (done) => {
    Sample.findById(sampId)
    .then((sam) => publisher.publishSample(sam, Subject, event.upd))
    .then((pubObj) => {
      expect(pubObj.subject).to.not.equal(null);
      expect(pubObj.subject.name).to.equal(par.name);
      expect(pubObj.subject.tags.length).to.equal(0);
      expect(pubObj.absolutePath).to.equal(par.name);
      expect(pubObj.aspect.tags.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it.only('sample should be published with subject object ' +
      ' and asbolutePath field' , (done) => {
    Sample.findById(sampId)
    .then((sam) => sam.update({ value: 10}))
    .then((pubObj) => {
      console.log('-------pubObj---'+ JSON.stringify(pubObj._changed, null, 2));
      done();
    })
    .catch(done);
  });
});
