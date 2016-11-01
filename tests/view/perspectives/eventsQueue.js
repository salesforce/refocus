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

describe('eventsQueue', () => {
  it('clone', (done) => {
    const evt = {
      'refocus.internal.realtime.sample.update': {
        new: {
          id: '189c61e6-e310-404c-81a5-f526e0ea51e1',
          isDeleted: '0',
          messageBody: null,
          messageCode: null,
          name: 'FirstFloor.LivingRoom.Rug|Color',
          status: 'OK',
          previousStatus: 'Timeout',
          statusChangedAt: '2016-10-31T18:23:26.651Z',
          value: '0',
          relatedLinks: [
            {
              url: 'https://foo.bar.baz.com?abc=def',
              name: 'Foo',
            }, {
              url: 'https://bar.baz.foo.com?def=abc&x=y',
              name: 'Bar',
            },
          ],
          createdAt: '2016-09-02T17:09:51.822Z',
          updatedAt: '2016-11-01T00:21:44.012Z',
          deletedAt: null,
          aspectId: '5352e458-e69e-4de7-a7e0-0303e107ceab',
          provider: null,
          subjectId: 'afe98f09-9fb0-42aa-9dfa-8b77329619ed',
          aspect: {
            id: '5352e458-e69e-4de7-a7e0-0303e107ceab',
            description: 'The color of the subject',
            isPublished: true,
            helpEmail: 'abc@baz.com',
            helpUrl: 'https://foo.bar.baz.com/FirstFloor',
            name: 'Color',
            timeout: '360s',
            criticalRange: [3, 4],
            warningRange: [2, 2],
            infoRange: [1, 1],
            okRange: [0, 0],
            valueLabel: null,
            tags: [],
          },
          subject: {
            absolutePath: 'FirstFloor.LivingRoom.Rug',
            childCount: 0,
            description: 'The rug in the living room on the first floor',
            geolocation: null,
            helpEmail: null,
            helpUrl: null,
            id: 'afe98f09-9fb0-42aa-9dfa-8b77329619ed',
            imageUrl: null,
            isDeleted: '0',
            isPublished: true,
            name: 'NA39',
            parentAbsolutePath: 'FirstFloor.LivingRoom',
            relatedLinks: [
              {
                url: 'https://foo.bar.baz.com?abc=def',
                name: 'XXXXXX',
              }, {
                url: 'https://foo.bar.baz.com?ghi=jkl',
                name: 'YYYYYY',
              }, {
                url: 'https://foo.bar.baz.com?mno=pqr',
                name: 'ZZZZZZZ',
              },
            ],
            tags: ['Room', 'House'],
            createdAt: '2016-09-02T17:08:38.247Z',
            updatedAt: '2016-10-31T06:45:36.569Z',
            deletedAt: null,
            hierarchyLevel: 5,
            parentId: '26f56955-56f4-4aef-b42b-c4725cd4a8ed',
            createdBy: null,
          },
          absolutePath: 'FirstFloor.LivingRoom.Rug',
        },
      },
    };
    expect(eventsQueue.clone(evt)).to.be.eql(JSON.parse(JSON.stringify(evt)));
    done();
  });
});

describe('event queue', () => {
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
      eventsQueueCopy = eventsQueue.clone(eventsQueue.queue);
      eventsQueue.queue.length = 0;
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
      eventsQueueCopy = eventsQueue.clone(eventsQueue.queue);
      eventsQueue.queue.length = 0;
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
      eventsQueueCopy = eventsQueue.clone(eventsQueue.queue);
      eventsQueue.queue.length = 0;
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
