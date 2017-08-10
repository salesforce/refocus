/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';
const TBL = 'Profiles';

module.exports = {
  up: function (qi, Sequelize) {
    let attr;
    return qi.describeTable(TBL)
    .then((attributes) => {
      attr = attributes;
      if (!attr.hasOwnProperty('botAccess')) {
        return qi.addColumn(TBL, 'botAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      } else {
        return true;
      }
    })
    .then(() => {
      if (!attr.hasOwnProperty('eventAccess')) {
        return qi.addColumn(TBL, 'eventAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      } else {
        return true;
      }
    })
    .then(() => {
      if (!attr.hasOwnProperty('roomAccess')) {
        return qi.addColumn(TBL, 'roomAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'rw',
        });
      } else {
        return true;
      }
    })
    .then(() => {
      if (!attr.hasOwnProperty('roomTypeAccess')) {
        return qi.addColumn(TBL, 'roomTypeAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      } else {
        return true;
      }
    });
  },

  down: function (qi, Sequelize) {
    let attr;
    return qi.describeTable(TBL)
    .then((attributes) => {
      attr = attributes;
      if (attr.hasOwnProperty('botAccess')) {
        return qi.removeColumn(TBL, 'botAccess');
      } else {
        return true;
      }
    })
    .then(() => {
      if (attr.hasOwnProperty('eventAccess')) {
        return qi.removeColumn(TBL, 'eventAccess');
      } else {
        return true;
      }
    })
    .then(() => {
      if (attr.hasOwnProperty('roomAccess')) {
        return qi.removeColumn(TBL, 'roomAccess');
      } else {
        return true;
      }
    })
    .then(() => {
      if (attr.hasOwnProperty('roomTypeAccess')) {
        return qi.removeColumn(TBL, 'roomTypeAccess');
      } else {
        return true;
      }
    });
  },
};
