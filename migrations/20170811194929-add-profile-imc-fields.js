/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict'; // eslint-disable-line strict
const TBL = 'Profiles';

module.exports = {
  up(qi /* , Sequelize */) {
    let attr;
    return qi.sequelize.transaction(() => qi.describeTable(TBL)
    .then((attributes) => {
      attr = attributes;
      if (attr.hasOwnProperty('botAccess')) {
        return true;
      }

      return qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ADD COLUMN "botAccess" "enum_Profiles_botAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      });
    })
    .then(() => {
      if (attr.hasOwnProperty('eventAccess')) {
        return true;
      }

      return qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ADD COLUMN "eventAccess" "enum_Profiles_eventAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      });
    })
    .then(() => {
      if (attr.hasOwnProperty('roomAccess')) {
        return true;
      }

      return qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ADD COLUMN "roomAccess" "enum_Profiles_roomAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      });
    })
    .then(() => {
      if (attr.hasOwnProperty('roomTypeAccess')) {
        return true;
      }

      return qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ADD COLUMN "roomTypeAccess" "enum_Profiles_roomTypeAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      });
    }));
  },

  down(qi/* , Sequelize */) {
    let attr;
    return qi.sequelize.transaction(() => qi.describeTable(TBL)
    .then((attributes) => {
      attr = attributes;
      if (attr.hasOwnProperty('botAccess')) {
        return qi.removeColumn(TBL, 'botAccess');
      }

      return true;
    })
    .then(() => {
      if (attr.hasOwnProperty('eventAccess')) {
        return qi.removeColumn(TBL, 'eventAccess');
      }

      return true;
    })
    .then(() => {
      if (attr.hasOwnProperty('roomAccess')) {
        return qi.removeColumn(TBL, 'roomAccess');
      }

      return true;
    })
    .then(() => {
      if (attr.hasOwnProperty('roomTypeAccess')) {
        return qi.removeColumn(TBL, 'roomTypeAccess');
      }

      return true;
    }));
  },
};
