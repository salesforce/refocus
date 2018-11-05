/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * realTime/connectedNamespaces.js
 */
const ConnectedNamespaces = module.exports = {
  nspStrings: new Set(),

  addNamespace(nsp) {
    ConnectedNamespaces.nspStrings.add(nsp);
  },

  removeNamespace(nsp) {
    ConnectedNamespaces.nspStrings.delete(nsp);
  },
};
