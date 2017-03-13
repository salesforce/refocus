/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * realtime/constants.js
 */
'use strict';

module.exports = {
  asbPathIndex: 0,

  aspectFilterIndex: 1,

  subjectTagFilterIndex: 2,

  aspectTagFilterIndex: 3,

  statusFilterIndex: 4,

  filterSeperator: '&',

  valuesSeparator: ';',

  fieldTypeFieldSeparator: '=',

  filterTypeInclude: 'INCLUDE',

  events: {
    subject: {
      add: 'refocus.internal.realtime.subject.add',
      upd: 'refocus.internal.realtime.subject.update',
      del: 'refocus.internal.realtime.subject.remove',
    },

    sample: {
      add: 'refocus.internal.realtime.sample.add',
      upd: 'refocus.internal.realtime.sample.update',
      del: 'refocus.internal.realtime.sample.remove',
    },

    perspective: {
      initialize: 'refocus.internal.realtime.perspective.namespace.initialize',
    },
  },

};
