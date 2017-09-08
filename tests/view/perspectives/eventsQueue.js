/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/perspectives/eventsQueue.js
 */
'use strict';
const expect = require('chai').expect;
const eventsQueue = require(
  '../../../view/perspective/eventsQueue'
);

describe('tests/view/perspectives/eventsQueue.js, event queue >', () => {
  before((done) => {
    eventsQueue.queue.splice(0, eventsQueue.queue.length);
    done();
  });

  after((done) => {
    eventsQueue.queue.splice(0, eventsQueue.queue.length);
    done();
  });

  it('enqueue one event in 1 sec', (done) => {
    const eventData = {
      new: {
        someKey: 'someValue',
      },
      old: {
        someOldKey: 'someOldValue',
      },
    };
    eventsQueue.enqueueEvent(
      'refocus.internal.realtime.subject.add', eventData
    );
    let eventsQueueCopy = [];

    // copy and flush queue in 1 sec
    setTimeout(() => {
      eventsQueueCopy = eventsQueue.queue.splice(0);
    }, 1000);

    // check result before 1 sec completion, queue not flushed
    setTimeout(() => {
      expect(eventsQueueCopy).to.have.lengthOf(0);
      expect(eventsQueue.queue).to.have.lengthOf(1);
    }, 500);

    // check result after 1 sec completion, queue flushed
    setTimeout(() => {
      expect(eventsQueueCopy).to.have.lengthOf(1);
      expect(eventsQueue.queue).to.have.lengthOf(0);
      expect(eventsQueueCopy).to.be.eql(
        [{
          'subject.add': {
            new: {
              someKey: 'someValue',
            },
            old: {
              someOldKey: 'someOldValue',
            },
          },
        }]
      );
      done();
    }, 1100);
  });

  it('enqueue multiple event in 1 sec, all enqueue', (done) => {
    for (let i = 0; i < 5; i++) {
      const eventData = {
        new: {
          someKey: 'someValue' + i,
        },
        old: {
          someOldKey: 'someOldValue' + i,
        },
      };
      eventsQueue.enqueueEvent(
        'refocus.internal.realtime.subject.add', eventData
      );
    }

    let eventsQueueCopy = [];

    // copy and flush queue in 1 sec
    setTimeout(() => {
      eventsQueueCopy = eventsQueue.queue.splice(0);
    }, 1000);

    // check result before 1 sec completion, queue not flushed
    setTimeout(() => {
      expect(eventsQueueCopy).to.have.lengthOf(0);
      expect(eventsQueue.queue).to.have.lengthOf(5);
    }, 900);

    // check result after 1 sec completion, queue flushed
    setTimeout(() => {
      expect(eventsQueueCopy).to.have.lengthOf(5);
      expect(eventsQueue.queue).to.have.lengthOf(0);
      done();
    }, 1100);
  });

  it('enqueue multiple event in 1 sec, events with delay,\
  some event enqueue', (done) => {
    const timeoutSecs = 300;
    for (let i = 0; i < 5; i++) {
      const eventData = {
        new: {
          someKey: 'someValue' + i,
        },
        old: {
          someOldKey: 'someOldValue' + i,
        },
      };
      setTimeout(() => {
        eventsQueue.enqueueEvent(
          'refocus.internal.realtime.subject.add', eventData
        );
      }, timeoutSecs * i);
    }

    let eventsQueueCopy = [];

    // copy and flush queue in 1 sec
    setTimeout(() => {
      eventsQueueCopy = eventsQueue.queue.splice(0);
    }, 1000);

    // check result before 1 sec completion, queue not flushed
    setTimeout(() => {
      expect(eventsQueueCopy).to.have.lengthOf(0);
      expect(eventsQueue.queue).to.have.length.within(2,4);
    }, 900);

    // check result after 1 sec completion, queue flushed with some data
    setTimeout(() => {
      expect(eventsQueueCopy).to.have.lengthOf(4);
      expect(eventsQueue.queue).to.have.lengthOf(0);
      done();
    }, 1100);
  });
});
