/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/sample.js
 */
'use strict'; // eslint-disable-line strict
const constants = require('../constants');
const u = require('../helpers/sampleUtils');
const common = require('../helpers/common');
const ResourceNotFoundError = require('../dbErrors').ResourceNotFoundError;
const config = require('../../config');
const eventName = {
  add: 'refocus.internal.realtime.sample.add',
  upd: 'refocus.internal.realtime.sample.update',
  del: 'refocus.internal.realtime.sample.remove',
};
const dbLoggingEnabled = (
    config.auditSamples === 'DB' || config.auditSamples === 'ALL'
  ) || false;
const messageCodeLen = 5;
const assoc = {};
const EMPTY_STRING = '';
const NO = 0;

module.exports = function sample(seq, dataTypes) {
  const Sample = seq.define('Sample', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    messageBody: {
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    messageCode: {
      type: dataTypes.STRING(messageCodeLen),
    },
    name: {
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    status: {
      type: dataTypes.ENUM(Object.keys(constants.statuses)),
      defaultValue: constants.statuses.Invalid,
      allowNull: false,
    },
    previousStatus: {
      type: dataTypes.ENUM(Object.keys(constants.statuses)),
      defaultValue: constants.statuses.Invalid,
      allowNull: false,
    },
    statusChangedAt: {
      type: dataTypes.DATE,
      defaultValue: dataTypes.NOW,
      allowNull: false,
    },
    value: {
      type: dataTypes.STRING,
      defaultValue: EMPTY_STRING,
      allowNull: false,
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
  }, {
    classMethods: {
      getSampleAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.provider = Sample.belongsTo(models.User, {
          foreignKey: 'provider',

          // TODO uncomment the next line once we have users/profiles done:
          // allowNull: false,
        });
        assoc.aspect = Sample.belongsTo(models.Aspect, {
          as: 'aspect',
          foreignKey: {
            name: 'aspectId',
            allowNull: false,
          },
          hooks: true,
        });
        assoc.subject = Sample.belongsTo(models.Subject, {
          as: 'subject',
          foreignKey: {
            name: 'subjectId',
            allowNull: false,
          },
          onDelete: 'CASCADE',
          hooks: true,
        });
        Sample.addScope('defaultScope', {
          include: [
            {
              association: assoc.aspect,
              attributes: [
                'id',
                'description',
                'isPublished',
                'helpEmail',
                'helpUrl',
                'name',
                'timeout',
                'criticalRange',
                'warningRange',
                'infoRange',
                'okRange',
                'valueLabel',
                'tags',
              ],
            },

            // assoc.provider,
          ],
          order: ['Sample.name'],
        }, {
          override: true,
        });
        Sample.addScope('checkTimeout', {
          attributes: [
            'id',
            'updatedAt',
            'value'
          ],
          where: {
            status: {
              $ne: constants.statuses.Timeout,
            },
          },
          include: [
            {
              association: assoc.aspect,
              attributes: ['timeout', 'isPublished'],
            },
          ],
        });
      },

      /**
       * Pseudo-upserts a sample using its name to look up its associated
       * subject and aspect. We can't use a "real" upsert because upsert
       * doesn't invoke hooks, and we rely on hooks to publish the change.
       *
       * @param {Sample} toUpsert - The sample to upsert
       * @param {Boolean} isBulk - true when used with bulk upsert, false
       *  otherwise
       * @returns {Promise} which resolves to the newly-created or -updated
       *  sample record, or rejects if a ResourceNotFoundError was encountered
       *  looking up the associated subject and aspect, or if an error was
       *  encountered while performing the sample upsert operation itself.
       */
      upsertByName(toUpsert, isBulk) {
        if (config.optimizeUpsert) {
          let sampleExists = true;
          return new seq.Promise((resolve, reject) => {
            // get sample by name
            Sample.findOne({
              where: {
                name: {
                  $iLike: toUpsert.name,
                },
              },
            })
            .then((o) => {
              // If sample does not exist, set sampleExists to false, which is
              // used after this promise returns. Get corresponding subject and
              //  aspect to check if the sample name is valid.
              if (o === null) {
                sampleExists = false;
                return u.getSubjectAndAspectBySampleName(seq, toUpsert.name,
                  isBulk);
              }

              // Else, if sample exists, update the sample.
              // set value changed to true, during updates to avoid timeouts
              // Adding this to the before update hook does
              // give the needed effect; so adding it here!!!.
              o.changed('value', true);
              return o.update(toUpsert);
            })
            .then((returnedObj) => {
              // If sample existed, return the updated object.
              if (sampleExists) {
                return returnedObj;
              }

              // If sample does not exist, update subject and aspect id in
              // sample object to be created. Create sample.
              toUpsert.subjectId = returnedObj.subject.id;
              toUpsert.aspectId = returnedObj.aspect.id;
              return Sample.create(toUpsert);
            })
            .then((o) => resolve(o))
            .catch((err) => {
              isBulk ? resolve(err) : reject(err);
            });
          });
        } else {
          let subjasp;
          return new seq.Promise((resolve, reject) => {
            u.getSubjectAndAspectBySampleName(seq, toUpsert.name, isBulk)
            .then((sa) => {
              subjasp = sa;
              toUpsert.subjectId = sa.subject.id;
              toUpsert.aspectId = sa.aspect.id;
            })
            .then(() => Sample.findOne({
              where: {
                subjectId: subjasp.subject.id,
                aspectId: subjasp.aspect.id,
                isDeleted: NO,
              },
            }))
            .then((o) => {
              if (o === null) {
                return Sample.create(toUpsert);
              }

              // set value changed to true, during updates to avoid timeouts
              // Adding this to the before update hook does
              // give the needed effect; so adding it here!!!.
              o.changed('value', true);
              return o.update(toUpsert);
            })
            .then((o) => resolve(o))
            .catch((err) => {
              isBulk ? resolve(err) : reject(err);
            });
          });
        }
      }, // upsertByName

      bulkUpsertByName(toUpsert) {
        const promises = toUpsert.map((s) =>
          this.upsertByName(s, true)
        );
        return seq.Promise.all(promises);
      }, // bulkUpsertByName

      /**
       * Invalidates samples which were last updated before the "timeout"
       * specified by the aspect.
       *
       * @param {Date} now - For testing, pass in a Date object to represent
       *  the current time
       * @returns {Integer} number of samples timed out
       */
      doTimeout(now) {
        const curr = now || new Date();
        let numberTimedOut = 0;
        let numberEvaluated = 0;
        return new seq.Promise((resolve, reject) => {
          Sample.scope('checkTimeout').findAll()
          .each((s) => {
            numberEvaluated++;
            if (s.aspect && u.isTimedOut(s.aspect.timeout, curr, s.updatedAt)) {
              numberTimedOut++;
              return s.update({ value: constants.statuses.Timeout });
            }
          })
          .then(() => resolve(`Evaluated ${numberEvaluated} samples; ${numberTimedOut} were timed out.`))
          .catch((err) => reject(err));
        });
      }, // doTimeout
    }, // classMethods
    hooks: {

      /**
       * Assigns the sample name based on its associated subject and aspect.
       *
       * @param {Sample} inst - The Sample instance about to be created
       * @returns {Promise} which resolves to the updated version of the
       *   Sample instance about to be created, or rejects if an error was
       *   encountered trying to retrieve the associated Subject or Aspect
       *   records, or increment the sample count in each
       */
      beforeCreate(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          inst.getSubject()
          .then((s) => {
            inst.name = s.absolutePath + constants.sampleNameSeparator;
          })
          .then(() => inst.getAspect())
          .then((a) => {
            if (a && a.getDataValue('isPublished')) {
              inst.name += a.name;
              inst.status = u.computeStatus(a, inst.value);
            } else {
              const err = new ResourceNotFoundError();
              err.resourceType = 'Aspect';
              err.resourceKey = inst.getDataValue('aspectId');
              throw err;
            }
          })
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeCreate

      /**
       * Publishes the created sample to redis channel *including* the values
       * from its aspect association.
       *
       * @param {Sample} inst - The newly-created instance
       */
      afterCreate(inst /* , opts */) {
        let samp;

        // log instance creation
        if (dbLoggingEnabled) {
          common.createDBLog(inst, common.changeType.add);
        }

        Sample.findById(inst.dataValues.id)
        .then((found) => {
          samp = found;
          return common.sampleAspectAndSubjectArePublished(seq, samp);
        })
        .then((published) => {
          if (published) {
            // augment the sample instance with the subject instance to enable
            // filtering by subjecttags in the realtime socketio module
            common.augmentSampleWithSubjectInfo(seq, samp)
            .then(() => {
              return common.publishChange(samp, eventName.add);
            });
          }
        });
      },

      /**
       * Publishes the delete to redis subscriber
       *
       * @param {Sample} inst - The Sample instance which was just deleted
       */
      afterDelete(inst /* , opts */) {
        // log instance deletion
        if (dbLoggingEnabled) {
          common.createDBLog(inst, common.changeType.del);
        }

        return common.sampleAspectAndSubjectArePublished(seq, inst)
        .then((published) => {
          if (published) {
            // augument the sample instance with the subject instance to enable
            // filtering by subjecttags in the realtime socketio module
            common.augmentSampleWithSubjectInfo(seq, inst)
            .then(() => {
              return common.publishChange(inst, eventName.del);
            });
          }
        });
      }, // hooks.afterDelete

      /**
       * If the sample changed significantly,
       * publish the updated and former sample to redis channel.
       *
       * @param {Sample} inst - The updated instance
       */
      afterUpdate(inst /* , opts */) {
        const changedKeys = Object.keys(inst._changed);
        const ignoreAttributes = ['isDeleted'];

        // log instance update
        if (dbLoggingEnabled) {
          common.createDBLog(
            inst, common.changeType.upd, changedKeys, ignoreAttributes
          );
        }

        return common.sampleAspectAndSubjectArePublished(seq, inst)
        .then((published) => {
          if (published) {
            // augument the sample instance with the subject instance to enable
            // filtering by subjecttags in the realtime socketio module
            common.augmentSampleWithSubjectInfo(seq, inst)
            .then(() => {
              return common.publishChange(inst, eventName.upd, changedKeys,
              ignoreAttributes);
            });
          }
        });
      },

      /**
       * Update isDeleted.
       * Publishes the deleted sample to redis channel.
       *
       * @param {Sample} inst - The Sample instance being deleted
       * @returns {Promise} which resolves undefined or rejects if an error
       *  was encountered trying to update the instance's isDeleted field
       */
      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      }, // hooks.beforeDestroy

      /**
       * Update status if value changed, loading the aspect (asynchronously)
       * if the instance doesn't already include its associated aspect.
       *
       * @param {Sample} inst - The Sample instance being updated
       * @returns {undefined}
       */
      beforeUpdate(inst /* , opts */) {
        if (inst.changed('value')) {
          return new seq.Promise((resolve, reject) => {
            if (inst.aspect) {
              resolve(inst.aspect);
            } else {
              inst.getAspect()
              .then(resolve)
              .catch(reject);
            }
          })
          .then((aspect) => {
            if (aspect && aspect.getDataValue('isPublished')) {
              inst.aspect = aspect;
              inst.calculateStatus();
              inst.setStatusChangedAt();
            } else {
              const err = new ResourceNotFoundError();
              err.resourceType = 'Aspect';
              err.resourceKey = inst.getDataValue('aspectId');
              throw err;
            }
          })
          .catch((err) => {
            throw err;
          });
        }
      }, // hooks.beforeUpdate

    }, // hooks
    indexes: [
      { unique: true, fields: ['aspectId', 'subjectId', 'isDeleted'] },
      {
        name: 'SampleStatusDeletedAt',
        fields: [
          'deletedAt',
          'status',
        ],
      },
      {
        name: 'SampleName',
        fields: [
          'name',
        ],
      },
    ],
    instanceMethods: {

      /**
       * Instance method wrapper around computeStatus.
       */
      calculateStatus() {
        this.status = u.computeStatus(this.aspect, this.value);
      }, // calculateStatus

      setStatusChangedAt() {
        if (this.status !== this._previousDataValues.status) {
          this.previousStatus = this._previousDataValues.status;
          this.statusChangedAt = this.updatedAt;
        }
      }, // setStatusChangedAt
    }, // instanceMethods
    paranoid: true,
  });
  return Sample;

  // TODO add a getterMethod or instanceMethod to retrieve the aspect's links
  // with variable substitution
};
