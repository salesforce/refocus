/**
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

 const { expect } = require('chai');
 const { isValidURL } = require('../../../view/authentication/util.js');

 describe('Test isValidURL function', () => {
   it('should return true if the URL has https protocol', () => {
     const str = 'https://www.example.com';
     const result = isValidURL(str);
     expect(result).to.equals(true);
   });

   it('should return true if the URL has http protocol', () => {
     const str = 'http://www.example.com';
     const result = isValidURL(str);
     expect(result).to.equals(true);
   });

   it('should return false if the URL has javascript protocol', () => {
     const str = 'javascript:alert("js ran")';
     const result = isValidURL(str);
     expect(result).to.equals(false);
   });

   it('should return false if the input is not an URL', () => {
     const str = 'random_string';
     const result = isValidURL(str);
     expect(result).to.equals(false);
   });
 });

