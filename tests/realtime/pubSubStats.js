/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/pubSubStats.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const stdout = require('test-console').stdout;
const pss = require('../../realtime/pubSubStats');
const globalKey = require('../../realtime/constants').pubSubStatsAggregator;
const tu = require('../testUtils');
const u = require('./utils');

describe('tests/realtime/pubSubStats.js >', () => {
  describe('track >', () => {
    describe('missing or invalid args >', () => {
      beforeEach(() => (delete global[globalKey]));
      afterEach(() => (delete global[globalKey]));

      it('src', () => {
        expect(() => pss.track()).to.throw();
        expect(() => pss.track(null)).to.throw();
        expect(() => pss.track('')).to.throw();
        expect(() => pss.track('abc')).to.throw();
        expect(() => pss.track(14.5)).to.throw();
        expect(() => pss.track({ foo: 'bar' })).to.throw();
        expect(() => pss.track([1, 2, 3])).to.throw();
        expect(global[globalKey]).to.be.undefined;
      });

      it('evt', () => {
        expect(() => pss.track('pub')).to.throw();
        expect(() => pss.track('pub', null)).to.throw();
        expect(() => pss.track('pub', undefined)).to.throw();
        expect(() => pss.track('pub', [])).to.throw();
        expect(() => pss.track('pub', '')).to.throw();
        expect(() => pss.track('pub', { foo: 12 })).to.throw();
        expect(global[globalKey]).to.be.undefined;
      });

      it('obj', () => {
        expect(() => pss.track('pub', 'hello.world')).to.throw();
        expect(() => pss.track('pub', 'hello.world', null)).to.throw();
        expect(() => pss.track('pub', 'hello.world', undefined)).to.throw();
        expect(() => pss.track('pub', 'hello.world', [])).to.throw();
        expect(() => pss.track('pub', 'hello.world', '')).to.throw();
        expect(global[globalKey]).to.be.undefined;
      });
    });

    describe('elapsed >', () => {
      beforeEach(() => (delete global[globalKey]));
      afterEach(() => (delete global[globalKey]));

      it('obj has "updatedAt"', () => {
        pss.track('pub', 'hello.world', { updatedAt: Date.now() - 1000 });
        const g = global[globalKey];
        expect(g).to.have.property('hello.world');
        expect(g['hello.world']).to.have.property('pubCount', 1);
        expect(g['hello.world'].pubTime).to.be.greaterThan(100);
        expect(g['hello.world']).to.have.property('subCount', 0);
        expect(g['hello.world']).to.have.property('subTime', 0);
      });

      it('obj has "new" with "updatedAt"', () => {
        pss.track('pub', 'hello.world', {
          new: { updatedAt: Date.now() - 1000 },
        });
        const g = global[globalKey];
        expect(g).to.have.property('hello.world');
        expect(g['hello.world']).to.have.property('pubCount', 1);
        expect(g['hello.world'].pubTime).to.be.greaterThan(100);
        expect(g['hello.world']).to.have.property('subCount', 0);
        expect(g['hello.world']).to.have.property('subTime', 0);
      });

      it('obj has "new" without "updatedAt"', () => {
        pss.track('pub', 'hello.world', {
          new: { notUpdatedAt: Date.now() - 1000 },
        });
        const g = global[globalKey];
        expect(g).to.have.property('hello.world');
        expect(g['hello.world']).to.have.property('pubCount', 1);
        expect(g['hello.world']).to.have.property('pubTime', 0);
        expect(g['hello.world']).to.have.property('subCount', 0);
        expect(g['hello.world']).to.have.property('subTime', 0);
      });

      it('no updatedAt', () => {
        pss.track('pub', 'hello.world', { hello: 'world' });
        const g = global[globalKey];
        expect(g).to.have.property('hello.world');
        expect(g['hello.world']).to.have.property('pubCount', 1);
        expect(g['hello.world']).to.have.property('pubTime', 0);
        expect(g['hello.world']).to.have.property('subCount', 0);
        expect(g['hello.world']).to.have.property('subTime', 0);
      });
    });

    describe('pub/sub >', () => {
      beforeEach(() => (delete global[globalKey]));
      afterEach(() => (delete global[globalKey]));

      it('pub and sub and multiple event types', () => {
        pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
        pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
        pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
        pss.track('pub', 'hello.world', { updatedAt: Date.now() - 1 });
        pss.track('sub', 'hello.world', { updatedAt: Date.now() - 1 });
        pss.track('sub', 'bye.world', { updatedAt: Date.now() - 1 });

        const g = global[globalKey];

        expect(g).to.have.property('bye.world');
        const bye = g['bye.world'];
        expect(bye).to.have.property('pubCount', 3);
        expect(bye).to.be.have.property('pubTime').to.be.greaterThan(1000);
        expect(bye).to.have.property('subCount', 1);
        expect(bye).to.have.property('subTime').to.be.lessThan(100);

        expect(g).to.have.property('hello.world');
        const hi = g['hello.world'];
        expect(hi).to.have.property('pubCount', 1);
        expect(hi).to.have.property('pubTime').to.be.lessThan(100);
        expect(hi).to.have.property('subCount', 1);
        expect(hi).to.have.property('subTime').to.be.lessThan(100);
      });
    });
  });

  describe('prepareLogLines >', () => {
    beforeEach(() => {
      delete global[globalKey];
      pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
      pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
      pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
      pss.track('pub', 'hello.world', { updatedAt: Date.now() - 1 });
      pss.track('sub', 'hello.world', { updatedAt: Date.now() - 1 });
      pss.track('sub', 'bye.world', { updatedAt: Date.now() - 1 });
    });

    afterEach(() => (delete global[globalKey]));

    it('ok', () => {
      const prepared = pss.prepareLogLines('MYPROCESS');
      expect(global[globalKey]).to.be.undefined;
      expect(prepared).to.be.array;
      expect(prepared).to.have.lengthOf(2);

      expect(prepared[0]).to.have.property('activity', 'pubsub');
      expect(prepared[0]).to.have.property('key', 'bye.world');
      expect(prepared[0]).to.have.property('process', 'MYPROCESS');
      expect(prepared[0]).to.have.property('pubCount', 3);
      expect(prepared[0]).to.have.property('pubTime').to.be.greaterThan(1000);
      expect(prepared[0]).to.have.property('subCount', 1);
      expect(prepared[0]).to.have.property('subTime').to.be.lessThan(100);

      expect(prepared[1]).to.have.property('activity', 'pubsub');
      expect(prepared[1]).to.have.property('key', 'hello.world');
      expect(prepared[1]).to.have.property('process', 'MYPROCESS');
      expect(prepared[1]).to.have.property('pubCount', 1);
      expect(prepared[1]).to.have.property('pubTime').to.be.lessThan(100);
      expect(prepared[1]).to.have.property('subCount', 1);
      expect(prepared[1]).to.have.property('subTime').to.be.lessThan(100);

      const again = pss.prepareLogLines('MYPROCESS');
      expect(again).to.be.array;
      expect(again).to.have.lengthOf(0);
    });
  });

  describe('log >', () => {
    let inspect;
    tu.toggleOverride('localLogging', true);

    beforeEach(() => {
      inspect = stdout.inspect();
      delete global[globalKey];
      pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
      pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
      pss.track('pub', 'bye.world', { updatedAt: Date.now() - 1000 });
      pss.track('pub', 'hello.world', { updatedAt: Date.now() - 1 });
      pss.track('sub', 'hello.world', { updatedAt: Date.now() - 1 });
      pss.track('sub', 'bye.world', { updatedAt: Date.now() - 1 });
      pss.log('MyProcessName');
    });

    afterEach(() => {
      delete global[globalKey];
      inspect.restore();
    });

    it('ok', () => {
      const re1 = /.activity=pubsub key=bye.world process=MyProcessName pubCount=3 pubTime=\d+ subCount=1 subTime=\d+/; // jscs:ignore maximumLineLength
      const re2 = /.activity=pubsub key=hello.world process=MyProcessName pubCount=1 pubTime=\d+ subCount=1 subTime=\d+/; // jscs:ignore maximumLineLength
      expect(inspect.output).to.be.array;
      expect(inspect.output).to.have.lengthOf(4);
      expect(inspect.output[1]).to.match(re1);
      expect(inspect.output[3]).to.match(re2);
    });
  });
});
