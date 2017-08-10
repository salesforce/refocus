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
    return qi.describeTable(TBL)
    .then((profile) => {
      if (!profile.hasOwnProperty('botAccess')) {
        qi.addColumn(TBL, 'botAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      }

      return profile;
    })
    .then((profile) => {
      if (!profile.hasOwnProperty('eventAccess')) {
        qi.addColumn(TBL, 'eventAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      }

      return profile;
    })
    .then((profile) => {
      if (!profile.hasOwnProperty('roomAccess')) {
        qi.addColumn(TBL, 'roomAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'rw',
        });
      }

      return profile;
    })
    .then((profile) => {
      if (!profile.hasOwnProperty('roomTypeAccess')) {
        qi.addColumn(TBL, 'roomTypeAccess', {
          type: Sequelize.ENUM('r', 'rw'),
          defaultValue: 'r',
        });
      }
    });
  },

  down: function (qi, Sequelize) {
    return qi.describeTable(TBL)
    .then((profile) => {
      if (profile.hasOwnProperty('botAccess')) {
        qi.removeColumn(TBL, 'botAccess');
      }

      return profile;
    })
    .then((profile) => {
      if (profile.hasOwnProperty('eventAccess')) {
        qi.removeColumn(TBL, 'eventAccess');
      }

      return profile;
    })
    .then((profile) => {
      if (profile.hasOwnProperty('roomAccess')) {
        qi.removeColumn(TBL, 'roomAccess');
      }

      return profile;
    })
    .then((profile) => {
      if (profile.hasOwnProperty('roomTypeAccess')) {
        qi.removeColumn(TBL, 'roomTypeAccess');
      }
    });
  },
};
