/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/pubSub.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const featureToggles = require('feature-toggles');
const tu = require('../testUtils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.Sample;
const redisPublisher = require('../../realtime/redisPublisher');
const event = require('../../realtime/constants').events.sample;
const rtu = require('../cache/models/redisTestUtil');
const subClients = require('../../cache/redisCache').client.subPerspectives;

describe('tests/realtime/pubsub.js >', () => {
  describe('publish and subscribe >', () => {
    const subjectName = `${tu.namePrefix}Subject`;
    const publishCount = 50;

    let subj;
    let samplesNames;
    before((done) => {
      Subject.create({ // create one subject
        isPublished: true,
        name: subjectName,
      })
        .then((createdSubj) => {
          subj = createdSubj;
          const aspNames = [];
          for (let i = 0; i < publishCount; i++) {
            aspNames.push(`${tu.namePrefix}Aspect-${i}`);
          }

          // create multiple aspects
          return Promise.all(aspNames.map((aspName) => Aspect.create({
            isPublished: true,
            name: aspName,
            timeout: '30s',
          })));
        })

        // create multiple samples, num of samples = num of aspects
        .then((createdAspects) => Promise.all(createdAspects.map((asp) =>
          Sample.create({
            subjectId: subj.id,
            aspectId: asp.id,
            value: '0',
          })
        )))
        .then((createdSamples) => {
          samplesNames = createdSamples.map((sample) => sample.name);
          done();
        })
        .catch(done);
    });

    after((done) => {
      rtu.forceDelete(done);
    });

    it('subscribers receive all published messages', (done) => {
      // No subscribers if running with separate real-time application
      if (featureToggles.isFeatureEnabled('enableRealtimeApplication')) {
        expect(subClients.length).to.equal(0);
        return done();
      }

      const receivedMsgs = [];

      // count messages received in each subscriber
      const subMsgCount = new Array(subClients.length);
      for (let i = 0; i < subClients.length; i++) {
        subMsgCount[i] = 0;
        subClients[i].on('message', (ch, msg) => {
          subMsgCount[i]++;
          receivedMsgs.push(msg);
        });
      }

      function waitForMessages(time) {
        // check for messages when we get all of them and then return
        if (receivedMsgs.length === publishCount) {
          if (subClients.length === 1) {
            expect(subMsgCount[0]).to.equal(publishCount);
          } else if (subClients.length > 1) {
            let countSum = 0;
            subMsgCount.forEach((count) => {
              // messages should be distributed among subscribers
              expect(count).to.be.below(publishCount);
              countSum += count;
            });

            // total count should match published count
            expect(countSum).to.equal(publishCount);
          }

          // check received sample names
          receivedMsgs.forEach((msg) => {
            const msgObj = JSON.parse(msg);
            expect(samplesNames).to.include(msgObj[event.upd].name);
          });
          return done();
        }

        return setTimeout(waitForMessages, time);
      }

      Sample.findAll()
        .then((samples) => Promise.all(samples.map((samp) =>
            redisPublisher.publishSample(samp, event.upd)
        )))
        .then(() => {
          // Check every 50ms until we get all the messages
          waitForMessages(50);
        })
        .catch(done);
    });
  });
});
