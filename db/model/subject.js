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
const common = require('../helpers/common');
const subjectUtils = require('../helpers/subjectUtils');
const throwNotMatchError = subjectUtils.throwNotMatchError;
const updateParentFields = subjectUtils.updateParentFields;
const validateParentField = subjectUtils.validateParentField;
const constants = require('../constants');
const dbErrors = require('../dbErrors');
const redisOps = require('../../cache/redisOps');
const subjectType = redisOps.subjectType;
const publishObject = require('../../realtime/redisPublisher').publishObject;
const eventName = require('../../realtime/constants').events.subject;
const Op = require('sequelize').Op;

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
          if (value === null || value === undefined) {
            return;
          }

          if (value && value.length !== 2) {
            throw new dbErrors.InvalidRangeSizeError();
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
      allowNull: false,
      defaultValue: constants.defaultJsonArrayValue,
      validate: {
        validateJsonSchema(value) {
          common.validateJsonSchema(value);
        },
      },
    },
    tags: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: false,
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
        return inst.setupParentFields();
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
        const promiseArr = [];
        publishObject(inst, eventName.add);

        // Prevent any changes to original inst dataValues object
        const instDataObj = JSON.parse(JSON.stringify(inst.get()));

        promiseArr.push(redisOps.addKey(subjectType,
          inst.getDataValue('absolutePath')));
        promiseArr.push(redisOps.hmSet(
          subjectType,
          inst.getDataValue('absolutePath'),
          instDataObj
        ));

        return new seq.Promise((resolve, reject) =>
          inst.getParent()
            .then((par) => {
              if (par) {
                par.increment('childCount');
              }

              return Promise.all(promiseArr);
            })
            .then(() => resolve(inst))
            .catch((err) => reject(err))
        );
      }, // hooks.afterCreate

      /**
       * Do the following
       * 1. Update entire hierarchy if parentId, parentAbsolutePath, name
       *   changes
       * 2. If a subject is unpublished, delete its related samples and the
       * entries in subject aspect map in redis
       * 3. If the absolutePath of the subject changes, remake the subject in
       * the subject master list, rename the hash, delete the related samples
       * and the subject aspect map in redis
       * 4. Send the appropriate realtime event for the subject
       * 5. If the samples get deleted send the sample delete event
       * @param {Subject} inst - The updated instance
       * @returns {Promise}
       */
      afterUpdate(inst /* , opts */) {
        const cmds = [];

        // Prevent any changes to original inst dataValues object
        const instDataObj = JSON.parse(JSON.stringify(inst.get()));

        const promiseArr = [];

        // change from published to unpublished
        const isSubjectUnpublished = inst.changed('isPublished') &&
          !inst.isPublished;

        // change from unpublished to published
        const isSubjectPublished = inst.changed('isPublished') &&
          inst.isPublished;

        if (isSubjectUnpublished) {
          promiseArr.push(
            subjectUtils.removeRelatedSamples(inst.dataValues, seq));
        }

        if (inst.changed('absolutePath')) {
          const newAbsPath = inst.absolutePath;
          const oldAbsPath = inst._previousDataValues.absolutePath;

          // rename entry in subject store
          promiseArr.push(redisOps.renameKey(subjectType, oldAbsPath,
            newAbsPath));

          if (inst.isPublished) {
            // duplicate subject-to-aspect resource map with new absolute path
            promiseArr.push(redisOps.executeCommand(redisOps.duplicateSet(
              redisOps.subAspMapType, newAbsPath, oldAbsPath)));

            /* add new subject absolute path entries to aspect-to-subject
              resource maps */
            promiseArr.push(
              redisOps.executeCommand(redisOps.getSubjAspMapMembers(oldAbsPath))
                .map((aspectName) => cmds.push(
                  redisOps.addSubjectAbsPathInAspectSet(aspectName, newAbsPath)))
            );
          }

          // remove all the related samples
          promiseArr.push(
            subjectUtils.removeRelatedSamples(inst._previousDataValues, seq));
        }

        if (inst.changed('parentAbsolutePath') ||
          inst.changed('absolutePath')) {
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

        // finally update the subject hash in redis too
        promiseArr.push(redisOps.hmSet(subjectType, inst.absolutePath,
          instDataObj));

        /*
         * Once all the data-related changes are done and the sample realtime
         * events have been sent, send the corresponding subject realtime event.
         */
        return Promise.all(promiseArr)
          .then(() => redisOps.executeBatchCmds(cmds))
          .then(() => {
            if (isSubjectUnpublished) {
              // Treat unpublishing a subject as a "delete" event.
              publishObject(inst, eventName.del);
            } else if (isSubjectPublished) {
              // Treat publishing a subject as an "add" event.
              publishObject(inst, eventName.add);
            } else if (inst.isPublished && inst.changed('absolutePath')) {
              /*
               * When an absolutePath is changed, send a subject delete event with
               * the old subject instance, followed by a subject add event with
               * the new subject instance
               */
              publishObject(inst._previousDataValues, eventName.del,
                changedKeys, ignoreAttributes);
              publishObject(inst, eventName.add, changedKeys,
                ignoreAttributes);
            } else if (inst.isPublished && (common.tagsChanged(inst) ||
              inst.changed('parentId'))) {
              /*
               * If tags OR parent were updated, send a "delete" event followed
               * by an "add" event so that perspectives get notified and lenses
               * can re-render correctly. Tag changes have to be handled this
               * way for filtering.
               * If subject tags or parent were not updated, just send the usual
               * "update" event.
               */
              publishObject(inst, eventName.del, changedKeys,
                ignoreAttributes);
              publishObject(inst, eventName.add, changedKeys,
                ignoreAttributes);
            } else if (inst.published) {
              publishObject(inst, eventName.upd, changedKeys,
                ignoreAttributes);
            }
          });
      }, // hooks.afterUpdate

      /**
       * Decrements childCount in parent.
       * Publishes the deleted subject to redis channel.
       *
       * @param {Subject} inst - The deleted instance
       * @returns {Promise} which resolves to the deleted Subject or rejects
       *  if an error was encountered
       */
      afterDestroy(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          inst.getParent()
            .then((par) => {
              if (par) {
                par.decrement('childCount');
              }

              // remove the subject and its related samples
              return subjectUtils.removeFromRedis(inst.dataValues, seq);
            })
            .then(() => {
              // send the subject delete event if the subject was published
              if (inst.getDataValue('isPublished')) {
                return publishObject(inst, eventName.del);
              }

              return null;
            })
            .then(() => resolve(inst))
            .catch((err) => reject(err))
        );
      }, // hooks.afterDestroy

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
                const err = new dbErrors.SubjectDeleteConstraintError();
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
        function checkPublished() {
          if (inst.getDataValue('isPublished') === false) {
            return inst.getChildren()
              .then((children) => {
                if (children && children.length) {
                  const len = children.length;
                  for (let i = 0; i < len; ++i) {
                    if (children[i].getDataValue('isPublished') === true) {
                      throw new dbErrors.ValidationError({
                        message: 'You cannot unpublish this subject until ' +
                          'all its descendants are unpublished.',
                      });
                    }
                  }
                }

                return;
              });
          } else {
            return;
          }
        }

        const papChanged = inst.changed('parentAbsolutePath');
        const pidChanged = inst.changed('parentId');
        const papEmpty = inst.parentAbsolutePath == null ||
          inst.parentAbsolutePath == false;
        const pidEmpty = inst.parentId == null || inst.parentId == false;

        return new seq.Promise((resolve, reject) => resolve(checkPublished()))
          .then(() => {
            if ((papChanged && pidChanged) && (papEmpty != pidEmpty)) {
              return inst.setupParentFields();
            } else {
              return Promise.resolve();
            }
          })
          .then(() => {
            const papChanged = inst.changed('parentAbsolutePath');
            const pidChanged = inst.changed('parentId');
            const papEmpty = inst.parentAbsolutePath == null ||
              inst.parentAbsolutePath == false;
            const pidEmpty = inst.parentId == null || inst.parentId == false;

            // If either is empty, decrement the parent's childCount
            if ((papChanged && papEmpty) || (pidChanged && pidEmpty)) {
              // set parentAbsolutePath, parentId to null
              return updateParentFields(Subject, null, null, inst);
            }

            if ((papChanged && pidChanged) && (!papEmpty && !pidEmpty)) {
              // do parentAbsolutePath and parentId point to the same subject?
              return validateParentField(Subject,
                inst.parentAbsolutePath, inst.absolutePath, 'absolutePath')
                .then(() => validateParentField(Subject, inst.parentId, inst.id, 'id'))
                .then((parent) => {
                  if (parent.absolutePath != inst.parentAbsolutePath) {

                    // don't match. throw error.
                    throwNotMatchError(inst.parentId, inst.absolutePath);
                  }

                  // if match, update
                  parent.increment('childCount');
                  return updateParentFields(
                    Subject, inst.parentId, parent.absolutePath, inst);
                });
            } else if (pidChanged && !pidEmpty) {
              let parentAbsolutePath;
              return validateParentField(Subject, inst.parentId, inst.id, 'id')
                .then((parent) => {
                  parent.increment('childCount');
                  parentAbsolutePath = parent.absolutePath;
                  return updateParentFields(
                    Subject, inst.parentId, parentAbsolutePath, inst);
                });
            } else if (papChanged && !papEmpty) {
              return validateParentField(Subject,
                inst.parentAbsolutePath, inst.absolutePath, 'absolutePath')
                .then((parent) => {

                  // notice parent.id can != inst.parentId.
                  // since parentId field did not change, use parent.id
                  parent.increment('childCount');
                  return updateParentFields(
                    Subject, parent.id, parent.absolutePath, inst);
                });
            } else {
              return inst;
            }
          })
          .then((updatedInst) => {
            if (updatedInst.changed('name')) {
              if (updatedInst.parentAbsolutePath) {
                updatedInst.setDataValue('absolutePath',
                  updatedInst.parentAbsolutePath + '.' + updatedInst.name);
              } else {
                updatedInst.setDataValue('absolutePath', updatedInst.name);
              }

              return updatedInst;
            } else {
              return updatedInst;
            }
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
    paranoid: true,
  });

  /**
   * Class Methods:
   */

  Subject.getSubjectAssociations = function () {
    return assoc;
  };

  Subject.getProfileAccessField = function () {
    return 'subjectAccess';
  };

  Subject.postImport = function (models) {
    assoc.owner = Subject.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
    });
    assoc.user = Subject.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'user',
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

    Subject.addScope('baseScope', {
      order: seq.col('absolutePath'),
    });

    Subject.addScope('defaultScope', {
      include: [
        {
          association: assoc.user,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
        {
          association: assoc.owner,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
      order: seq.col('absolutePath'),
    }, {
      override: true,
    });

    Subject.addScope('owner', {
      include: [
        {
          association: assoc.owner,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    });

    Subject.addScope('user', {
      include: [
        {
          association: assoc.user,
          attributes: ['id', 'name', 'email', 'fullName'],
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
        absolutePath: { [Op.iLike]: value },
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
        },
      ],
    });
    Subject.addScope('forRealTime', (value) => ({
      where: {
        absolutePath: { [Op.iLike]: value },
      },
      attributes: ['id', 'name', 'tags', 'absolutePath'],
    }));
  };

  /**
   * Instance Methods:
   */

  /**
   * This deletes everything under it. Recursive delete. Use with caution.
   *
   * @returns {Promise} which resolves to undefined or rejects with error
   */
  Subject.prototype.deleteHierarchy = function () {
    const _this = this;
    return new seq.Promise((resolve, reject) =>
      _this.getChildren()
        .each((kid) => kid.deleteHierarchy())
        .then(() => _this.destroy())
        .then(() => resolve())
        .catch((err) => reject(err))
    );
  }; // deleteHierarchy

  Subject.prototype.isWritableBy = function (who) {
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
  }; // isWritableBy

  Subject.prototype.setupParentFields = function () {
    if (this.parentAbsolutePath || this.parentId) {
      let key = null;
      let value = null;
      if (this.parentId) {
        key = 'id';
        value = this.getDataValue('parentId');
      } else {
        key = 'absolutePath';
        value = this.getDataValue('parentAbsolutePath');
      }

      return Subject.scope({ method: [key, value] }).findOne()
        .then((parent) => {
          if (parent) {
            if (parent.getDataValue('isPublished') === false &&
              this.getDataValue('isPublished') === true) {
              throw new dbErrors.ValidationError({
                message: 'You cannot insert a subject with ' +
                  'isPublished = true unless all its ancestors are also ' +
                  'published.',
              });
            }

            this.setDataValue('absolutePath',
              parent.absolutePath + '.' + this.name);
            this.setDataValue('parentId', parent.id);
            this.setDataValue('parentAbsolutePath', parent.absolutePath);
          } else {
            throw new dbErrors.ParentSubjectNotFound({
              message: 'parent' + key + ' not found.',
            });
          }
        });
    } else {
      this.setDataValue('absolutePath', this.name);
      return Promise.resolve();
    }
  };

  // Use the seq-hierarchy module to generate subject hierarchy.
  Subject.isHierarchy();

  return Subject;
};
