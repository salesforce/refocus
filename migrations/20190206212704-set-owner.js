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

const modelsToUpdate = {
  Aspect: 'createdBy',
  BotAction: 'userId',
  BotData: 'createdBy',
  Bot: 'installedBy',
  CollectorGroup: 'createdBy',
  Collector: 'createdBy',
  Event: 'userId',
  Generator: 'createdBy',
  GeneratorTemplate: 'createdBy',
  Lens: 'installedBy',
  Perspective: 'createdBy',
  Room: 'createdBy',
  RoomType: 'createdBy',
  Subject: 'createdBy',
};

module.exports = {
  up: (qi, Sequelize) =>
    db.User.findOne({ where: { name: 'admin@refocus.admin' } })
    .then((adminUser) => {
      if (!adminUser || !adminUser.id) return Promise.reject("couldn't find admin user");
      const defaultOwnerId = adminUser.id;
      return Promise.mapSeries(Object.keys(modelsToUpdate), (modelName) => {
        const model = db[modelName];
        const createdByField = modelsToUpdate[modelName];
        return model.findAll({ attributes: ['id', createdByField, 'ownerId'] })
        .then((records) => Promise.mapSeries(records, (record) => {
          if (record.ownerId) return Promise.resolve();
          const ownerId = record[createdByField] || defaultOwnerId;
          return record.update({ ownerId }, { hooks: false, validate: false });
        }));
      });
    }),

  down: (qi, Sequelize) =>
    Promise.mapSeries(Object.keys(modelsToUpdate), (modelName) =>
      db[modelName].findAll(({ attributes: ['id'] }))
      .then((records) => Promise.mapSeries(records, (record) =>
        record.update({ ownerId: null }, { hooks: false, validate: false })
      ))
    ),
};

