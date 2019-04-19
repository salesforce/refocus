/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/utils/ipAddressUtils.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const ipAddressUtils = require('../../utils/ipAddressUtils');

describe('tests/utils/ipAddressUtils.js > ', () => {
  describe('getIpAddressFromRequest > ', () => {
    const getIpAddressFromRequest = ipAddressUtils.getIpAddressFromRequest;

    it('undefined, not object', () => {
      expect(getIpAddressFromRequest()).to.be.undefined;
      expect(getIpAddressFromRequest(1)).to.be.undefined;
      expect(getIpAddressFromRequest('Hi')).to.be.undefined;
      expect(getIpAddressFromRequest(null)).to.be.undefined;
    });

    it('x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '127.0.0.1',
        },
        connection: {
          remoteAddress: '127.0.0.1',
        },
      };
      expect(getIpAddressFromRequest(req)).to.equal('127.0.0.1');
    });

    it('connection remoteAddress', () => {
      const req = {
        headers: {},
        connection: {
          remoteAddress: '127.0.0.1',
        },
      };

      expect(getIpAddressFromRequest(req)).to.equal('127.0.0.1');
    });

    it('neither x-forwarded-for header nor connection remoteAddress', () => {
      const req = {
        headers: {},
        connection: {},
      };

      expect(getIpAddressFromRequest(req)).to.be.undefined;
    });
  });

  describe('getIpAddressFromSocket > ', () => {
    const getIpAddressFromSocket = ipAddressUtils.getIpAddressFromSocket;

    it('undefined, not object', () => {
      expect(getIpAddressFromSocket()).to.be.undefined;
      expect(getIpAddressFromSocket(1)).to.be.undefined;
      expect(getIpAddressFromSocket('Hi')).to.be.undefined;
      expect(getIpAddressFromSocket(null)).to.be.undefined;
      expect(getIpAddressFromSocket({})).to.be.undefined;
      expect(getIpAddressFromSocket({ address: 'Hi' })).to.be.undefined;
    });

    it('x-forwarded-for handshake header', () => {
      const socket = {
        handshake: {
          headers: {
            'x-forwarded-for': '127.0.0.1',
          },
          address: '127.0.0.1',
        },
      };
      expect(getIpAddressFromSocket(socket)).to.equal('127.0.0.1');
    });

    it('handshake address', () => {
      const socket = {
        handshake: {
          headers: {},
          address: '127.0.0.1',
        },
      };
      expect(getIpAddressFromSocket(socket)).to.equal('127.0.0.1');
    });

    it('neither x-forwarded-for header nor address', () => {
      const socket = {
        handshake: {
        },
      };

      expect(getIpAddressFromSocket(socket)).to.be.undefined;
    });
  });

  describe('middleware > ', () => {
    const mw = ipAddressUtils.middleware;
    const req = {
      connection: {
        remoteAddress: '127.0.0.1',
      },
      locals: {},
    };
    const fn = () => {
      expect(req.locals.ipAddress).to.equal('127.0.0.1');
    };

    it('OK', () => {
      mw(req, {}, fn);
    });
  });
});
