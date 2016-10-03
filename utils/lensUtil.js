/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * lensUtils.js
 *
 * Utilities for lenses
 */

'use strict'; // eslint-disable-line strict

const AdmZip = require('adm-zip');
const ONE = 1;

/**
 * Create Json for files in Lens library with format, filename: file contents.
 * @param  {Object} lensObject - lens object
 * @returns {Object} zipContents - Json prepared from library contents.
 */
function createLensLibraryJson(lensObject) {
  const re = /(?:\.([^.]+))?$/;
  const zip = AdmZip(lensObject.library);
  const zipEntries = zip.getEntries();

  const zipContents = {};
  for (let j = 0; j < zipEntries.length; j++) {
    let ext = re.exec(zipEntries[j].entryName)[ONE] || '';
    ext = ext.toLowerCase();

    // handle different file types here
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      const b64str = zipEntries[j].getData().toString('base64');
      zipContents[zipEntries[j].entryName] = b64str;
    } else {
      zipContents[zipEntries[j].entryName] = zip.readAsText(
        zipEntries[j]
      );
    }
  }

  return zipContents;
}

/**
 * Recursively cleans the object (i.e. calls "get" on any sequelize
 * instances), strips out nulls (because swagger validation doesn't like
 * nulls).
 *
 * @param {Object} obj - The object to clean
 * @returns {Object} - The cleaned object
 */
function cleanAndCreateLensJson(obj) {
  const o = obj.get ? obj.get({ plain: true }) : obj;
  if (o) {
    const keys = Object.keys(o);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (key === 'library' && o[key]) {
        const lensLibraryJson = createLensLibraryJson(o);
        o[key] = lensLibraryJson;
      } else if (o[key] === undefined || o[key] === null) {
        delete o[key];
      } else if (Array.isArray(o[key])) {
        o[key] = o[key].map((j) => cleanAndCreateLensJson(j));
      } else if (typeof o[key] === 'object') {
        o[key] = cleanAndCreateLensJson(o[key]);
      }
    }
  }

  return o;
}

module.exports = {
  cleanAndCreateLensJson,
};
