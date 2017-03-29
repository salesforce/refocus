/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/subject.js
 */
'use strict'; // eslint-disable-line strict

const featureToggles = require('feature-toggles');
const sampleStoreFeature =
                  require('../../cache/sampleStore').constants.featureName;
const common = require('../helpers/common');
const constants = require('../constants');
const SubjectDeleteConstraintError = require('../dbErrors')
  .SubjectDeleteConstraintError;
const InvalidRangeSizeError = require('../dbErrors').InvalidRangeSizeError;
const ValidationError = require('../dbErrors').ValidationError;
const ParentSubjectNotFound = require('../dbErrors')
  .ParentSubjectNotFound;
const ParentSubjectNotMatch = require('../dbErrors')
  .ParentSubjectNotMatch;
const IllegalSelfParenting = require('../dbErrors')
  .IllegalSelfParenting;
const redisOps = require('../../cache/redisOps');
const subjectType = redisOps.subjectType;
const sampleType = redisOps.sampleType;

const eventName = {
  add: 'refocus.internal.realtime.subject.add',
  upd: 'refocus.internal.realtime.subject.update',
  del: 'refocus.internal.realtime.subject.remove',
};

const assoc = {};

module.exports = function subject(seq, dataTypes) {
  const Subject = seq.define('Subject', {
    absolutePath: {
      type: dataTypes.STRING(constants.fieldlen.longish),
      allowNull: false,
      defaultValue: '',
    },
    childCount: {
      type: dataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: dataTypes.TEXT,
    },
    geolocation: {
      type: dataTypes.ARRAY(dataTypes.FLOAT),
      allowNull: true,
      validate: {
        validateGeolocation(value) {
          if (value && value.length !== 2) {
            throw new InvalidRangeSizeError();
          }

          if (value[0] === null || value[1] === null) {
            throw new ('If you are specifying geolocation, you must ' +
              'provide both longitude and latitude.');
          }
        },
      },
    },
    helpEmail: {
      type: dataTypes.STRING(constants.fieldlen.email),
      validate: { isEmail: true },
    },
    helpUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    imageUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    isPublished: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    parentAbsolutePath: {
      type: dataTypes.STRING(constants.fieldlen.longish),
      allowNull: true,
    },
    relatedLinks: {
      type: dataTypes.ARRAY(dataTypes.JSON),
      allowNull: true,
      defaultValue: constants.defaultJsonArrayValue,
      validate: {
        validateJsonSchema(value) {
          common.validateJsonSchema(value);
        },
      },
    },
    tags: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: true,
      defaultValue: constants.defaultArrayValue,
    },
    sortBy: {
      type: dataTypes.STRING(constants.fieldlen.sortField),
      allowNull: true,
      defaultValue: '',
      validate: {
        is: constants.sortByRegex,
      },
    },
  }, {
    classMethods: {
      getSubjectAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.createdBy = Subject.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
        assoc.samples = Subject.hasMany(models.Sample, {
          foreignKey: 'subjectId',
          as: 'samples',
          onDelete: 'CASCADE',
          hooks: true,
        });
        assoc.writers = Subject.belongsToMany(models.User, {
          as: 'writers',
          through: 'SubjectWriters',
          foreignKey: 'subjectId',
        });
        Subject.addScope('defaultScope', {
          order: ['absolutePath'],
        }, {
          override: true,
        });
        Subject.addScope('withSamples', {
          include: [
            {
              model: models.Sample,
              as: 'samples',
              attributes: { exclude: ['subjectId'] },
              include: [
                {
                  required: false,
                  model: models.Aspect,
                  as: 'aspect',
                  where: {
                    isPublished: true,
                  },
                },
              ],
            },
          ],
        });
        Subject.addScope('id', (value) => ({
          where: {
            id: value,
          },
        }));
        Subject.addScope('absolutePath', (value) => ({
          where: {
            absolutePath: value,
          },
        }));
        Subject.addScope('hierarchy', {
          where: {
            isPublished: true,
          },
          include: [
            {
              model: models.Subject,
              as: 'descendents',
              hierarchy: true,
              required: false,
              where: {
                isPublished: true,
              },
              include: [
                {
                  model: models.Sample,
                  as: 'samples',
                  attributes: {
                    exclude: ['subjectId'],
                  },
                },
              ],
            },
          ],
        });
        Subject.addScope('subjectHierarchy', {
          where: {
            isPublished: true,
          },
          include: [
            {
              model: models.Subject,
              as: 'descendents',
              hierarchy: true,
              required: false,
              where: {
                isPublished: true,
              },
            },
          ],
        });
      },
    },
    hooks: {

      /**
       * BeforeCreate hook
       * set up appropriate parentAbsolutePath, absolutePath and ParentId
       * If parentAbsolutePath or parentId is provided while creating a subject,
       * get the parent record using the parentId provided and set the
       * parentAbsolutePath or get the parent record using the
       * parentAbsolutePath and set the parentId. Finally set the absolute path
       * of the subject.
       * @param {Subject} inst - The newly-created instance
       * @returns {Promise} which resolves to the new Subject or rejects if an
       *  error was encountered while retrieving or incrementing the parent
       *  record
       */
      beforeCreate(inst /* , opts*/) {
        if (inst.parentAbsolutePath || inst.parentId) {
          let key = null;
          let value = null;
          let param = null;
          let key1 = null;
          if (inst.parentId) {
            key = 'id';
            value = inst.getDataValue('parentId');
            param = 'parentAbsolutePath';
            key1 = 'absolutePath';
          } else {
            key = 'absolutePath';
            value = inst.getDataValue('parentAbsolutePath');
            param = 'parentId';
            key1 = 'id';
          }

          return new seq.Promise((resolve, reject) => {
            Subject.scope({ method: [key, value] }).find()
            .then((parent) => {
              if (parent) {
                if (parent.getDataValue('isPublished') === false &&
                  inst.getDataValue('isPublished') === true) {
                  throw new ValidationError({
                    message: 'You cannot insert a subject with ' +
                      'isPublished = true unless all its ancestors are also ' +
                      'published.',
                  });
                }

                inst.setDataValue('absolutePath',
                  parent.absolutePath + '.' + inst.name);
                inst.setDataValue(param, parent.getDataValue(key1));
              } else {
                throw new ParentSubjectNotFound({
                  message: 'parent' + key + ' not found.',
                });
              }

              resolve(inst);
            })
            .catch((err) => reject(err));
          });
        }

        inst.setDataValue('absolutePath', inst.name);
      },

      /**
       * Increments childCount in parent.
       * Publishes the created subject to redis channel.
       *
       * @param {Subject} inst - The newly-created instance
       * @returns {Promise} which resolves to the new Subject or rejects if an
       *  error was encountered while retrieving or incrementing the parent
       *  record
       */
      afterCreate(inst /* , opts */) {
        if (inst.getDataValue('isPublished')) {
          common.publishChange(inst, eventName.add);

          /*
           * add entry to the subjectStore in redis only if the subject
           * is published and the sampleStoreFeature is enabled
           */
          if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
            redisOps.addKey(subjectType,
                inst.getDataValue('absolutePath'));
          }
        }

        // no change here
        return new seq.Promise((resolve, reject) =>
          inst.getParent()
          .then((par) => {
            if (par) {
              par.increment('childCount');
            }
          })
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.afterCreate

      /**
       * Update entire hierarchy if parentId, parentAbsolutePath, Name changes
       * If the subject changed significantly,
       * publish the updated and former subject to redis channel.
       *
       * @param {Subject} inst - The updated instance
       */
      afterUpdate(inst /* , opts */) {

        /*
         * When the sample store feature is enabled do the following
         * 1. if subject is changed from published to unpublished -> delete
         * 2. if subject is changed from unpublished to published -> add
         * 3. if the asbsolutepath of the subject changes and the subject is
         * puslished, rename the keys
        */
        if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
          if (inst.changed('absolutePath') && inst.isPublished) {
            const newAbsPath = inst.absolutePath;
            const oldAbsPath = inst._previousDataValues.absolutePath;

            // rename entry in subject store
            redisOps.renameKey(subjectType, oldAbsPath, newAbsPath);

            // rename entries in sample store
            redisOps.renameKeys(sampleType, subjectType, oldAbsPath,
                                                           newAbsPath);
          } else if (inst.changed('isPublished')) {
            if (inst.isPublished) {
              redisOps.addKey(subjectType, inst.absolutePath);
            } else {
              // delete the entry in the subject store
              redisOps.deleteKey(subjectType, inst.absolutePath);

              // delete multiple possible entries in sample store
              redisOps.deleteKeys(sampleType, subjectType, inst.absolutePath);
            }
          }
        }

        if (inst.changed('parentAbsolutePath') ||
          inst.changed('absolutePath')) {
          inst.getSamples()
          .each((samp) => {
            if (samp) {
              samp.update({
                name: inst.absolutePath + '|' + samp.aspect.dataValues.name,
              });
            }
          })
          .catch((err) => {
            throw (err);
          });
          inst.getChildren()
          .then((children) => {
            if (children) {
              for (let i = 0, len = children.length; i < len; ++i) {
                children[i].setDataValue('absolutePath',
                  inst.absolutePath + '.' + children[i].name);
                children[i].setDataValue('parentAbsolutePath',
                  inst.absolutePath);
                children[i].save();
              }
            }

            return;
          })
          .catch((err) => {
            throw err;
          });

        }

        const changedKeys = Object.keys(inst._changed);
        const ignoreAttributes = [
          'childcount',
          'parentAbsolutePath',
          'updatedAt',
          'isDeleted',
        ];

        if (inst.getDataValue('isPublished')) {
          if (inst.previous('isPublished')) {
            /*
             * If tags OR parent were updated, send a "delete" event followed
             * by an "add" event so that perspectives get notified and lenses
             * can re-render correctly. Tag changes have to be handled this
             * way for filtering.
             * If subject tags or parent were not updated, just send the usual
             * "update" event.
             *
             * TODO : Right now don't have the ability to mock the socket.io
             * test for this.
             */
            if (inst.changed('tags') || inst.changed('parentId')) {
              common.publishChange(inst, eventName.del, changedKeys,
                ignoreAttributes);
              common.publishChange(inst, eventName.add, changedKeys,
                ignoreAttributes);
            } else {
              common.publishChange(inst, eventName.upd, changedKeys,
              ignoreAttributes);
            }
          } else {

            // Treat publishing a subject as an "add" event.
            common.publishChange(inst, eventName.add);
          }
        } else if (inst.previous('isPublished')) {

          // Treat unpublishing a subject as a "delete" event.
          common.publishChange(inst, eventName.del);
        }
      }, // hooks.afterupdate

      /**
       * Decrements childCount in parent.
       * Publishes the deleted subject to redis channel.
       *
       * @param {Subject} inst - The deleted instance
       * @returns {Promise} which resolves to the deleted Subject or rejects
       *  if an error was encountered
       */
      afterDelete(inst /* , opts */) {
        if (inst.getDataValue('isPublished')) {
          common.publishChange(inst, eventName.del);

          if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {

            // delete the entry in the subject store
            redisOps.deleteKey(subjectType, inst.absolutePath);

            // delete multiple possible entries in sample store
            redisOps.deleteKeys(sampleType, subjectType, inst.absolutePath);
          }
        }

        return new seq.Promise((resolve, reject) =>
          inst.getParent()
          .then((par) => {
            if (par) {
              par.decrement('childCount');
            }
          })
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.afterDelete

      /**
       * Prevents from deleting a subject which has children.
       *
       * @param {Subject} inst - The instance being destroyed
       * @returns {Promise} which resolves to undefined or rejects if an error
       *  was encountered
       */
      beforeDestroy(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          inst.getChildren()
          .then((kids) => {
            if (kids && kids.length > 0) {
              const err = new SubjectDeleteConstraintError();
              err.subject = inst.get();
              throw err;
            } else {
              return common.setIsDeleted(seq.Promise, inst);
            }
          })
          .then(() => resolve())
          .catch((err) => reject(err))
        );
      }, // hooks.beforeDestroy

      /**
       * Updates this record's absolutePath
       * if this record's name and/or parentId changed. It also
       * updates the childCount of this model's parent if this model is
       * reparented
       *
       * @param {Subject} inst - The instance being updated
       * @param {Object} opts - The Sequelize options
       * @returns {undefined|Promise} undefined if name/parentId did not
       *  change, otherwise returns a Promise which resolves to undefined, or
       * rejects if an error was encountered
       */
      beforeUpdate(inst /* ,  opts */) { // eslint-disable-line max-statements
        /*
         * If a subject is getting unpublished, check to see if its children are
         * unpublished too. If any of the children are published, throw a
         * validation error
         */
        if (inst.getDataValue('isPublished') === false) {
          return new seq.Promise((resolve, reject) => {
            inst.getChildren()
            .then((children) => {
              if (children && children.length) {
                const len = children.length;
                for (let i = 0; i < len; ++i) {
                  if (children[i].getDataValue('isPublished') === true) {
                    throw new ValidationError({
                      message: 'You cannot unpublish this subject until ' +
                        'all its descendants are unpublished.',
                    });
                  }
                }
              }

              return resolve(inst);
            })
            .catch(reject);
          });
        }

        if (inst.changed('name')) {
          return new seq.Promise((resolve, reject) => {
            if (inst.parentAbsolutePath) {
              inst.setDataValue('absolutePath',
              inst.parentAbsolutePath + '.' + inst.name);
            } else {
              inst.setDataValue('absolutePath', inst.name);
            }

            return resolve(inst);
          });
        }

        // parentId and parentAbsolutePath check
        // PAP is shorthand for parentAbsolutePath,
        // PID is shorthand for parentId
        // initialize PAP_changed, PID_changed: check whether the fields are in inst.changed() <- an array
        const PAP_changed = inst.changed('parentAbsolutePath');
        const PID_changed = inst.changed('parentId');

        // If both are false, there's no update to do. Return
        if (!PAP_changed && !PID_changed) {
          return;
        }

        // initialize PAP_empty, PID_empty: check whether the body fields are empty
        const PAP_empty = inst.parentAbsolutePath;
        const PID_empty = inst.parentId;

        // If both are true, decrement the parent's childCount
        if (PAP_empty && PID_empty) {
          Subject.scope({ method: ['id', inst.previous('parentId')] })
          .then((par) => {
            if (par) {
              par.decrement('childCount');
            }
          });

          // update the subject to root subject,
          inst.setDataValue('parentId', null);
          inst.setDataValue('parentAbsolutePath', null);
          inst.setDataValue('absolutePath', inst.name);
          return;
        }

        // check whether the subject PID and PAP point to exist.
        // if either does not, throw a ParentNotFound error
        Subject.findById(inst.parentId)
        .then((parent) => {
          if (!parent) {
            throw new ParentSubjectNotFound({
              message: inst.parentId + ' not found.',
            });
          }

          // subject with id = parentId exists.
          return Subject.scope({
            method: ['absolutePath', inst.parentAbsolutePath],
          })
        })
        .then((parent) => {
          if (!parent) {
            throw new ParentSubjectNotFound({
              message: inst.parentAbsolutePath + ' not found.',
            });
          }

          // both subjects exist
          // if their id's don't match, throw ParentNotMatch error.
          if(inst.parentId != parent.id) {
            throw new ParentSubjectNotMatch({
              message: parentId + ' does not match ' + parent.id,
            });
          }

          // if PAP === absolutePath || PID === id, throw cannot self parent error.
          if (inst.parentAbsolutePath === inst.absolutePath ||
            inst.parentId === inst.id) {
            throw new IllegalSelfParenting({
              message: 'absolutePath cannot equal parentAbsolutePath: ' + value,
            });
          }

          // if no errors are thrown yet: re-parent the subject
          parent.increment('childCount');
          return Subject.scope({ method: ['id', inst.previous('parentId')] })
        })
        .then((parent) => {
          if (parent) {
            par.decrement('childCount');
          }

          // update the subject values
          inst.setDataValue('parentId', inst.parentIde);
          inst.setDataValue('parentAbsolutePath', inst.parentAbsolutePath);
          inst.setDataValue('absolutePath',
            parent.absolutePath + '.' + inst.name);
        })
        .catch((err) => {
          reject(err);
        });
      }, // hooks.beforeUpdate

      /**
       * Makes sure isUrl/isEmail validations will handle empty strings
       * appropriately.
       *
       * @param {Subject} inst - The instance being validated
       */
      beforeValidate(inst /* , opts*/) {
        if (inst.changed('helpUrl') &&
          inst.helpUrl !== null &&
          inst.helpUrl.length === 0) {
          inst.helpUrl = null;
        }

        if (inst.changed('imageUrl') &&
          inst.imageUrl !== null &&
          inst.imageUrl.length === 0) {
          inst.imageUrl = null;
        }

        if (inst.changed('helpEmail') &&
          inst.helpEmail !== null &&
          inst.helpEmail.length === 0) {
          inst.helpEmail = null;
        }
      }, // hooks.beforeValidate

    }, // hooks
    indexes: [
      {
        name: 'SubjectUniqueLowercaseAbsolutePathIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('absolutePath')),
          'isDeleted',
        ],
      },
      {
        name: 'SubjectAbsolutePathDeletedAtIsPublished',
        fields: [
          seq.fn('lower', seq.col('absolutePath')),
          'deletedAt',
          'isPublished',
        ],
      },
    ],
    instanceMethods: {

      /**
       * This deletes everything under it. Recursive delete. Use with caution.
       *
       * @returns {Promise} which resolves to undefined or rejects with error
       */
      deleteHierarchy() {
        const _this = this;
        return new seq.Promise((resolve, reject) =>
          _this.getChildren()
          .each((kid) => kid.deleteHierarchy())
          .then(() => _this.destroy())
          .then(() => resolve())
          .catch((err) => reject(err))
        );
      }, // instanceMethods.deleteHierarchy

      isWritableBy(who) {
        return new seq.Promise((resolve /* , reject */) =>
          this.getWriters()
          .then((writers) => {
            if (!writers.length) {
              resolve(true);
            }

            const found = writers.filter((w) =>
              w.name === who || w.id === who);
            resolve(found.length === 1);
          }));
      }, // isWritableBy
    }, // instanceMethods
    paranoid: true,
  });

  // Use the seq-hierarchy module to generate subject hierarchy.
  Subject.isHierarchy();

  return Subject;
};
