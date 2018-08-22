/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/utils/logEnvVars.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const logEnvVars = require('../../utils/logEnvVars');

describe('tests/utils/logEnvVars.js >', () => {
  describe('prepareObjectsToLog >', () => {
    it('hides values for exact (case-sensitive) match of key name for ' +
    'hidden keys', () => {
      const data = {
        SECRET_TOKEN: 'This is a SECRET_TOKEN, should be hidden',
        SESSION_SECRET: 'This is a SESSION_SECRET, should be hidden',
        SECURITYSESSIONID: 'This is a SECURITYSESSIONID, should be hidden',
        SECRET_TOKEN1: '1',
        SESSION_SECRET2: '2',
        SECURITYSESSIONID3: '3',
        '4SECRET_TOKEN': '4',
        '5SESSION_SECRET': '5',
        '6SECURITYSESSIONID': '6',
        _SECRET_TOKEN: '7',
        _SESSION_SECRET2: '8',
        _SECURITYSESSIONID3: '9',
        SECRET_Token: '10',
        SESSION_Secret: '11',
        SecuritySESSIONId: '12',
      };
      expect(logEnvVars.prepareObjectsToLog(data)).to.deep.equal([
        { name: '4SECRET_TOKEN', value: '"4"' },
        { name: '5SESSION_SECRET', value: '"5"' },
        { name: '6SECURITYSESSIONID', value: '"6"' },
        { name: 'SECRET_TOKEN', value: '"hidden"' },
        { name: 'SECRET_TOKEN1', value: '"1"' },
        { name: 'SECRET_Token', value: '"10"' },
        { name: 'SECURITYSESSIONID', value: '"hidden"' },
        { name: 'SECURITYSESSIONID3', value: '"3"' },
        { name: 'SESSION_SECRET', value: '"hidden"' },
        { name: 'SESSION_SECRET2', value: '"2"' },
        { name: 'SESSION_Secret', value: '"11"' },
        { name: 'SecuritySESSIONId', value: '"12"' },
        { name: '_SECRET_TOKEN', value: '"7"' },
        { name: '_SECURITYSESSIONID3', value: '"9"' },
        { name: '_SESSION_SECRET2', value: '"8"' },
      ]);
    });

    it('skips keys starting with HEROKU_ or REDIS_BASTION or npm_, ' +
    'case sensitive', () => {
      const data = {
        HEROKU_: '1',
        HEROKU_2: '2',
        Heroku_3: '3',
        REDIS_BASTION: '4',
        REDIS_BASTION5: '5',
        Redis_BASTION6: '6',
        npm_7: '7',
        NPM_8: '8',
        npm_: '9',
      };
      expect(logEnvVars.prepareObjectsToLog(data)).to.deep.equal([
        { name: 'Heroku_3', value: '"3"' },
        { name: 'NPM_8', value: '"8"' },
        { name: 'Redis_BASTION6', value: '"6"' },
      ]);
    });

    it('unexpected or empty env returns empty array', () => {
      expect(logEnvVars.prepareObjectsToLog({})).to.deep.equal([]);
      expect(logEnvVars.prepareObjectsToLog(undefined)).to.deep.equal([]);
      expect(logEnvVars.prepareObjectsToLog(null)).to.deep.equal([]);
      expect(logEnvVars.prepareObjectsToLog([1, 2, 'abc'])).to.deep.equal([]);
    });
  });
});
