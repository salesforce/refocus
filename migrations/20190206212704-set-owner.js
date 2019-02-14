/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
const db = require('../db/index');
const Promise = require('bluebird');

const modelsToUpdate = [
  'Aspect',
  'BotAction',
  'BotData',
  'Bot',
  'CollectorGroup',
  'Collector',
  'Event',
  'Generator',
  'GeneratorTemplate',
  'Lens',
  'Perspective',
  'Room',
  'RoomType',
  'Subject',
];

module.exports = {
  up: (qi, Sequelize) =>
    db.User.findOne({ where: { name: 'admin@refocus.admin' } })
    .then((adminUser) => {
      if (!adminUser || !adminUser.id) return Promise.reject("couldn't find admin user");
      const defaultOwnerId = adminUser.id;
      return Promise.mapSeries(modelsToUpdate, (modelName) => {
        const model = db[modelName];
        return model.findAll()
        .then((records) => Promise.mapSeries(records, (record) => {
          if (record.ownerId) return Promise.resolve();
          const ownerId = record.createdBy || record.installedBy
            || record.userId || defaultOwnerId;
          return record.update({ ownerId });
        }));
      });
    }),

  down: (qi, Sequelize) =>
    Promise.mapSeries(modelsToUpdate, (modelName) =>
      db[modelName].findAll()
      .then((records) => Promise.mapSeries(records, (record) =>
        record.update({ ownerId: null })
      ))
    ),
};

