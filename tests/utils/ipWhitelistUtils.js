/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/utils/ipWhitelistUtils.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
require('chai').use(require('chai-as-promised')).should();
require('chai-as-promised');
const nock = require('nock');
const ipWhitelistUtils = require('../../utils/ipWhitelistUtils');
const conf = require('../../config');

describe('tests/utils/ipWhitelistUtils.js > ', () => {
  conf.ipWhitelistService = 'http://refocus-whitelist.mock';

  describe('isWhitelisted > ', () => {
    const isWhitelisted = ipWhitelistUtils.isWhitelisted;

    it('is valid and is allowed', () => {
      const addr = '0.0.0.0';
      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(200, { address: addr, allow: true });
      expect(isWhitelisted(addr)).to.eventually.be.true;
    });

    it('is valid and is not allowed', () => {
      const addr = '0.0.0.0';
      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(200, { address: addr, allow: false });
      expect(isWhitelisted(addr)).to.eventually.be.false;
    });

    it('is not valid', () => {
      const addr = 'Hello';
      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(400, 'An error message');
      expect(isWhitelisted(addr)).to.eventually.be.false;
    });

    it('error', (done) => {
      const addr = 'Hello';
      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(500);
      isWhitelisted(addr)
        .then(() => done(new Error('expecting error')))
        .catch((err) => {
          expect(err).to.be.Error;
          expect(err).to.have.property('message', 'refocus-whitelist error');
          done();
        });
    });
  });

  describe('middleware', () => {
    const mw = ipWhitelistUtils.middleware;

    it('is valid and is allowed', () => {
      const addr = '0.0.0.0';
      const req = {
        locals: {
          ipAddress: addr,
        },
      };

      const fn = (err) => {
        expect(err).to.be.undefined;
      };

      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(200, { address: addr, allow: true });

      mw(req, {}, fn);
    });

    it('is valid and is not allowed', (done) => {
      const addr = '0.0.0.0';
      const req = {
        locals: {
          ipAddress: addr,
        },
      };

      const fn = (err) => {
        expect(err).to.have.property('status', 401);
        expect(err).to.have.property('message', 'Access denied');
        done();
      };

      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(200, { address: addr, allow: false });

      mw(req, {}, fn);
    });

    it('is not valid', (done) => {
      const addr = '0.0.0.0';
      const req = {
        locals: {
          ipAddress: addr,
        },
      };

      const fn = (err) => {
        expect(err).to.be.instanceOf(Error);
        expect(err).to.have.property('name', 'Unauthorized');
        expect(err).to.have.property('message', 'Access denied');
        expect(err).to.have.property('status', 401);
        done();
      };

      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(200, { address: addr, allow: false });

      mw(req, {}, fn);
    });

    it('error', (done) => {
      const addr = '0.0.0.0';
      const req = {
        locals: {
          ipAddress: addr,
        },
      };

      const fn = (err) => {
        expect(err).to.have.property('message', 'refocus-whitelist error');
        done();
      };

      nock(conf.ipWhitelistService)
        .get(`/v1/verify/${addr}`)
        .reply(500);

      mw(req, {}, fn);
    });
  });
});
