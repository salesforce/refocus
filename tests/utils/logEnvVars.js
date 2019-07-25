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
  describe('truncate >', () => {
    it('over the maxlen, truncated', () => {
      expect(logEnvVars.truncate('abcdefgh', 6)).to.equal('abc...');
    });

    it('equal maxlen', () => {
      expect(logEnvVars.truncate('abcdef', 6)).to.equal('abcdef');
    });

    it('under maxlen', () => {
      expect(logEnvVars.truncate('abc', 6)).to.equal('abc');
    });

    it('false-y strings', () => {
      expect(logEnvVars.truncate('', 5)).to.equal('');
      expect(logEnvVars.truncate(null, 5)).to.equal('');
      expect(logEnvVars.truncate(undefined, 5)).to.equal('');
    });
  });

  describe('prepareObjectsToLog >', () => {
    describe('with mask list >', () => {
      const opts = {
        MASK_LIST: 'ABC,DEF , GHI ',
      };

      it('hides exact, case-sensitive matches', () => {
        const data = {
          ABC: '1',
          _ABC: '2',
          ABC_: '3',
          $ABC: '4',
          abc: '5',
          ab: '6',
          DEF: '7',
          GHI: '8',
        };
        expect(logEnvVars.prepareObjectsToLog(data, opts)).to.deep.equal([
          { name: '$ABC', value: '"4"' },
          { name: 'ABC', value: '"hidden"' },
          { name: 'ABC_', value: '"3"' },
          { name: 'DEF', value: '"hidden"' },
          { name: 'GHI', value: '"hidden"' },
          { name: '_ABC', value: '"2"' },
          { name: 'ab', value: '"6"' },
          { name: 'abc', value: '"5"' },
        ]);
      });

      it('unexpected or empty env returns empty array', () => {
        expect(logEnvVars.prepareObjectsToLog({}, opts)).to.deep.equal([]);
        expect(logEnvVars.prepareObjectsToLog(undefined, opts))
        .to.deep.equal([]);
        expect(logEnvVars.prepareObjectsToLog(null, opts)).to.deep.equal([]);
        expect(logEnvVars.prepareObjectsToLog([1, 2, 'abc'], opts))
        .to.deep.equal([]);
      });
    });
  });
});
