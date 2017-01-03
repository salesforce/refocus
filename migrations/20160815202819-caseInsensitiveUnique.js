/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';

module.exports = {
  up(qi, Sequelize) {
    return qi.sequelize.transaction(() =>
      qi.removeIndex('Aspects', ['name', 'isDeleted'])
      .then(() => qi.addIndex('Aspects',
        [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
        {
          indexName: 'AspectUniqueLowercaseNameIsDeleted',
          indicesType: 'UNIQUE',
        }
      ))
      .then(() => qi.removeIndex('Lenses', ['name', 'isDeleted']))
      .then(() => qi.addIndex('Lenses',
        [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
        {
          indexName: 'LensUniqueLowercaseNameIsDeleted',
          indicesType: 'UNIQUE',
        }
      ))
      .then(() => qi.removeIndex('Perspectives', ['name', 'isDeleted']))
      .then(() => qi.addIndex('Perspectives',
        [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
        {
          indexName: 'PerspectiveUniqueLowercaseNameIsDeleted',
          indicesType: 'UNIQUE',
        }
      ))
      .then(() => qi.removeIndex('Profiles', ['name', 'isDeleted']))
      .then(() => qi.addIndex('Profiles',
        [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
        {
          indexName: 'ProfileUniqueLowercaseNameIsDeleted',
          indicesType: 'UNIQUE',
        }
      ))
      .then(() => qi.removeIndex('Subjects', ['absolutePath', 'isDeleted']))
      .then(() => qi.addIndex('Subjects',
        [Sequelize.fn('lower', Sequelize.col('absolutePath')), 'isDeleted'],
        {
          indexName: 'SubjectUniqueLowercaseAbsolutePathIsDeleted',
          indicesType: 'UNIQUE',
        }
      ))
      .then(() => qi.removeIndex('Tags',
        ['name', 'isDeleted', 'associationId']))
      .then(() => qi.addIndex('Tags', [
        Sequelize.fn('lower', Sequelize.col('name')),
        'isDeleted',
        'associationId',
      ], {
        indexName: 'TagUniqueLowercaseNameIsDeletedAssociationId',
        indicesType: 'UNIQUE',
      }))
      .then(() => qi.removeIndex('Users', ['name', 'isDeleted']))
      .then(() => qi.addIndex('Users',
        [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
        {
          indexName: 'UserUniqueLowercaseNameIsDeleted',
          indicesType: 'UNIQUE',
        }
      ))
      .then(() => qi.removeIndex('Users', ['email']))
      .then(() => qi.addIndex('Users',
        [Sequelize.fn('lower', Sequelize.col('email'))],
        { indexName: 'UserLowercaseEmail' })));
  }, // up

  down(qi /* , Sequelize */) {
    return qi.sequelize.transaction(() =>
      qi.removeIndex('Aspects', 'AspectUniqueLowercaseNameIsDeleted')
      .then(() => qi.addIndex('Aspects', ['name', 'isDeleted']))
      .then(() => qi.removeIndex('Lenses', 'LensUniqueLowercaseNameIsDeleted'))
      .then(() => qi.addIndex('Lenses', ['name', 'isDeleted']))
      .then(() => qi.removeIndex('Perspectives',
        'PerspectiveUniqueLowercaseNameIsDeleted'))
      .then(() => qi.addIndex('Perspectives', ['name', 'isDeleted']))
      .then(() => qi.removeIndex('Profiles',
        'ProfileUniqueLowercaseNameIsDeleted'))
      .then(() => qi.addIndex('Profiles', ['name', 'isDeleted']))
      .then(() => qi.removeIndex('Subjects',
        'SubjectUniqueLowercaseAbsolutePathIsDeleted'))
      .then(() => qi.addIndex('Subjects', ['absolutePath', 'isDeleted']))
      .then(() => qi.removeIndex('Tags',
        'TagUniqueLowercaseNameIsDeletedAssociationId'))
      .then(() => qi.addIndex('Tags', ['name', 'isDeleted', 'associationId']))
      .then(() => qi.removeIndex('Users', 'UserUniqueLowercaseNameIsDeleted'))
      .then(() => qi.addIndex('Users', ['name', 'isDeleted']))
      .then(() => qi.removeIndex('Users', 'UserLowercaseEmail'))
      .then(() => qi.addIndex('Users', ['email'])));
  }, // down
};
