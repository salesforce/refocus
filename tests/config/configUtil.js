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

const expect = require('chai').expect;
const configUtil = require('../../config/configUtil');

describe('IP List', () => {
  it('parse default IP list', (done) => {
    const iplist = configUtil.parseIPlist('[[0.0.0.0,255.255.255.255]]');
    expect(iplist).to.have.length(1);
    expect(iplist).to.be.eql([['0.0.0.0', '255.255.255.255']]);
    done();
  });

  it('parse IP list with space around opening bracket', (done) => {
    const iplist = configUtil.parseIPlist('[ [1.2.3.4,1.2.3.8],[7.6.5.4,7.6.9.9]]');
    expect(iplist).to.have.length(2);
    expect(iplist).to.be.eql([
      ['1.2.3.4', '1.2.3.8'],
      ['7.6.5.4', '7.6.9.9'],
    ]);
    done();
  });

  it('parse IP list with space around closing bracket', (done) => {
    const iplist = configUtil.parseIPlist('[[1.2.3.4,1.2.3.8],[7.6.5.4,7.6.9.9 ] ]');
    expect(iplist).to.have.length(2);
    expect(iplist).to.be.eql([
      ['1.2.3.4', '1.2.3.8'],
      ['7.6.5.4', '7.6.9.9'],
    ]);
    done();
  });

  it('parse IP list with space around comma', (done) => {
    const iplist = configUtil.parseIPlist('[[1.2.3.4, 1.2.3.8], [7.6.5.4,7.6.9.9]]');
    expect(iplist).to.have.length(2);
    expect(iplist).to.be.eql([
      ['1.2.3.4', '1.2.3.8'],
      ['7.6.5.4', '7.6.9.9'],
    ]);
    done();
  });

  it('parse IP list with misc spaces', (done) => {
    const iplist = configUtil.parseIPlist('[ [ 1.2.3.4, 1.2.3.8], [7.6.5.4, 7.6.9.9 ] ]');
    expect(iplist).to.have.length(2);
    expect(iplist).to.be.eql([
      ['1.2.3.4', '1.2.3.8'],
      ['7.6.5.4', '7.6.9.9'],
    ]);
    done();
  });

  it('error parsing IP list with wrong format', (done) => {
    expect(configUtil.parseIPlist.bind(
      configUtil.parseIPlist, '[ [ 1.2.3.4, 1.2.3.8], [7.6.5.4] ]')
    ).to.throw('Your IP address is not allowed. Verify your network address and your Refocus IP settings');
    done();
  });
});
