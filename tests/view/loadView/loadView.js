/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/loadView.js
 */

const expect = require('chai').expect;
const loadView = require('../../view/loadView.js');
const ZERO = 0;

describe('tests/view/loadView.js', () => {
  describe('getRedirectURI function', () => {

    afterEach(() => {
      delete process.env.SHOULD_REDIRECT_FOR_MONITORING;
      delete process.env.SHOULD_REDIRECT_FOR_ROOMS;
      delete process.env.REFOCUS_MONITORING_BASE_URL
      delete process.env.REFOCUS_ROOMS_BASE_URL
    });

    it('ok, should not redirect at all, return empty string', () => {
      const redirectURI = loadView.getRedirectURI('/perspectives',
        '/perspectives/perspectiveName');
      expect(redirectURI.length).to.equal(ZERO);
    });

    it('ok, should redirect to monitoring instance of refocus', () => {
      process.env.SHOULD_REDIRECT_FOR_MONITORING = 'true';
      process.env.REFOCUS_MONITORING_BASE_URL = 'http://localhost:9999';
      const redirectURI = loadView.getRedirectURI('/perspectives',
        '/perspectives/perspectiveName');
      expect(redirectURI.length).to.be.above(ZERO);
      expect(redirectURI).to
        .equal('http://localhost:9999/perspectives/perspectiveName');
    });

    it('ok, should redirect to rooms instance of refocus', () => {
      process.env.SHOULD_REDIRECT_FOR_ROOMS = 'true';
      process.env.REFOCUS_ROOMS_BASE_URL = 'http://localhost:2018';
      const redirectURI = loadView.getRedirectURI('/rooms',
        '/rooms');
      expect(redirectURI.length).to.be.above(ZERO);
      expect(redirectURI).to
        .equal('http://localhost:2018/rooms');
    });

    it('ok, redirect should keep parameters', () => {
      process.env.SHOULD_REDIRECT_FOR_ROOMS = 'true';
      process.env.REFOCUS_ROOMS_BASE_URL = 'http://localhost:2018';
      const redirectURI = loadView.getRedirectURI('/rooms',
        '/rooms?active=true');
      expect(redirectURI).to
        .include('?active=true');
    });
  });
});
