/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/config/configUtil.js
 *
 * Tests config utilities
 */
'use strict';
const expect = require('chai').expect;
const configUtil = require('../../config/configUtil');
const NOT_ALLOWED = 'Your IP address is not allowed. Verify your ' +
  'network address and your Refocus IP settings';

describe('tests/config/configUtil.js >', () => {
  describe('IP List >', () => {
    it('parse default IP list', () => {
      const iplist = configUtil.parseIPlist('[[0.0.0.0,255.255.255.255]]');
      expect(iplist).to.have.length(1);
      expect(iplist).to.be.eql([['0.0.0.0', '255.255.255.255']]);
    });

    it('parse IP list with space around opening bracket', () => {
      const iplist =
        configUtil.parseIPlist('[ [1.2.3.4,1.2.3.8],[7.6.5.4,7.6.9.9]]');
      expect(iplist).to.have.length(2);
      expect(iplist).to.be.eql([
        ['1.2.3.4', '1.2.3.8'],
        ['7.6.5.4', '7.6.9.9'],
      ]);
    });

    it('parse IP list with space around closing bracket', () => {
      const iplist =
        configUtil.parseIPlist('[[1.2.3.4,1.2.3.8],[7.6.5.4,7.6.9.9 ] ]');
      expect(iplist).to.have.length(2);
      expect(iplist).to.be.eql([
        ['1.2.3.4', '1.2.3.8'],
        ['7.6.5.4', '7.6.9.9'],
      ]);
    });

    it('parse IP list with space around comma', () => {
      const iplist =
        configUtil.parseIPlist('[[1.2.3.4, 1.2.3.8], [7.6.5.4,7.6.9.9]]');
      expect(iplist).to.have.length(2);
      expect(iplist).to.be.eql([
        ['1.2.3.4', '1.2.3.8'],
        ['7.6.5.4', '7.6.9.9'],
      ]);
    });

    it('parse IP list with misc spaces', () => {
      const iplist = configUtil
        .parseIPlist('[ [ 1.2.3.4, 1.2.3.8], [7.6.5.4, 7.6.9.9 ] ]');
      expect(iplist).to.have.length(2);
      expect(iplist).to.be.eql([
        ['1.2.3.4', '1.2.3.8'],
        ['7.6.5.4', '7.6.9.9'],
      ]);
    });

    it('error parsing IP list with wrong format', () => {
      expect(configUtil.parseIPlist.bind(
        configUtil.parseIPlist, '[ [ 1.2.3.4, 1.2.3.8], [7.6.5.4] ]')
      )
      .to.throw(NOT_ALLOWED);
    });
  });

  describe('csvToArray >', () => {
    it('undefined string', () => {
      expect(configUtil.csvToArray(undefined)).to.be.eql([]);
    });

    it('null string', () => {
      expect(configUtil.csvToArray(null)).to.be.eql([]);
    });

    it('zero-length string', () => {
      expect(configUtil.csvToArray('')).to.be.eql([]);
    });

    it('single element', () => {
      expect(configUtil.csvToArray('abc')).to.be.eql(['abc']);
    });

    it('multiple elements with extra left and right padding', () => {
      expect(configUtil.csvToArray('abc,def , ghi'))
      .to.be.eql(['abc', 'def', 'ghi']);
    });
  }); // csvToArray

  describe('getReadReplicas >', () => {
    it('only bad entry will return undefined', () => {
      const pe = { REPLICAS: 'test' };
      expect(configUtil.getReadReplicas(pe, 'REPLICAS')).to.be.eql(undefined);
    });

    it('without Replicas env variable return undefined', () => {
      const pe = {};
      expect(configUtil.getReadReplicas(pe, 'REPLICAS')).to.be.eql(undefined);
    });

    it('Replicas env variable with correct env variables', () => {
      const pe = { REPLICAS: 'test', test: 'testURL' };
      expect(configUtil.getReadReplicas(pe, 'REPLICAS')).to.be.eql(['testURL']);
    });

    it('Replicas env variable with bad env variables', () => {
      const pe = { REPLICAS: 'test, test1', test: 'testURL' };
      expect(configUtil.getReadReplicas(pe, 'REPLICAS')).to.be.eql(['testURL']);
    });
  });
});
