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

const featureToggles = require('feature-toggles');
const constants = require('../constants');
const u = require('../helpers/sampleUtils');
const common = require('../helpers/common');
const dbErrors = require('../dbErrors');
const commonUtils = require('../../utils/common');
const messageCodeLen = 5;
const assoc = {};
const EMPTY_STRING = '';
const maxSampleNameLength = constants.fieldlen.longish +
  constants.fieldlen.normalName + 1; // eslint-disable-line no-magic-numbers

module.exports = function sample(seq, dataTypes) {
  const Sample = seq.define('Sample', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    messageBody: {
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    messageCode: {
      type: dataTypes.STRING(messageCodeLen),
    },
    name: {
      type: dataTypes.STRING(maxSampleNameLength),
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

      getProfileAccessField() {
        return 'sampleAccess';
      },

      postImport(models) {
        assoc.user = Sample.belongsTo(models.User, {
          foreignKey: 'provider',
          as: 'user',
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
          hooks: true,
        });
        Sample.addScope('defaultScope', {
          include: [
            {
              association: assoc.user,
              attributes: ['name', 'email'],
            },
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
                'valueType',
                'relatedLinks',
                'tags',
                'rank',
              ],
            },
          ],
          order: ['Sample.name'],
        }, {
          override: true,
        });
        Sample.addScope('checkTimeout', {
          attributes: [
            'id',
            'updatedAt',
            'value',
            'subjectId',
            'aspectId',
            'name',
            'relatedLinks',
          ],
          where: {
            status: {
              $ne: constants.statuses.Timeout,
            },
          },
          include: [
            {
              association: assoc.aspect,
              attributes: ['timeout', 'isPublished', 'tags', 'name'],
            },
          ],
        });
      },

      /**
       * Custom class method to create a sample.
       * @param  {Object} toCreate - Sample object that needs to be created.
       * @param {Object} user - The user performing the write operation.
       * @returns {Promise} which resolves to the created sample instance.
      */
      createSample(toCreate, user) {
        const options = {};
        options.where = { id: toCreate.aspectId };

        // find the aspect related to the sample being created
        return seq.models.Aspect.findOne(options)
        .then((aspect) => {
          if (!aspect) {
            throw new dbErrors.ResourceNotFoundError({
              explanation: 'Aspect not found.',
              resourceType: 'Aspect',
              resourceKey: toCreate.aspectId,
            });
          }

          // check if the user has permission to create the sample
          return aspect.isWritableBy(user);
        })
        .then((ok) => {
          if (!ok) {
            throw new dbErrors.ForbiddenError({
              explanation: `The user: ${user}, does not have write permission` +
                  'on the sample',
            });
          }

          if (user) {
            toCreate.provider = user.id;
            toCreate.user = { name: user.name, email: user.email };
          }

          // create the sample if the user has write permission
          return Sample.create(toCreate);
        });
      }, // createSample
      /**
       * NOTE:
       * This sequelize method also has a check to make sure that the user
       * performing the upsert operation is authorized to do so.
       * The check is done in the DB layer to avoid extra calls to the aspect
       * model every time an upsert is done. For example, if we are making
       * a bulk upsert call with 1000 samples, we do not want to be making a
       * 1000 calls in the API layer and a 1000 calls again in the DB layer.
       *
       * Pseudo-upserts a sample using its name to look up its associated
       * subject and aspect. We can't use a "real" upsert because upsert
       * doesn't invoke hooks, and we rely on hooks to publish the change.
       *
       * @param {Sample} toUpsert - The sample to upsert
       * @param {Object} user - The user performing the write operation
       * @param {Boolean} isBulk - true when used with bulk upsert, false
       *  otherwise
       * @returns {Promise} which resolves to the newly-created or -updated
       *  sample record, or rejects if a ResourceNotFoundError was encountered
       *  looking up the associated subject and aspect, or if an error was
       *  encountered while performing the sample upsert operation itself.
       */
      upsertByName(toUpsert, user, isBulk) {
        const userName = user ? user.name : false;
        let subjasp;
        return new seq.Promise((resolve, reject) => {
          u.getSubjectAndAspectBySampleName(seq, toUpsert.name)
          .then((sa) => {
            if (sa && sa.subject && !sa.subject.isPublished) {
              throw new dbErrors.ResourceNotFoundError({
                explanation: 'Subject not found.',
                resourceType: 'Subject',
                resourceKey: sa.subject.id,
              });
            }

            subjasp = sa;
            toUpsert.subjectId = sa.subject.id;
            toUpsert.aspectId = sa.aspect.id;
            return sa.aspect.isWritableBy(userName);
          })
          .then((ok) => {
            if (!ok) {
              throw new dbErrors.UpdateDeleteForbidden();
            }

            return Sample.findOne({
              where: {
                subjectId: subjasp.subject.id,
                aspectId: subjasp.aspect.id,
              },
            });
          })
          .then((o) => {
            if (o === null) {

              // New sample. Add provider and user object,
              // if conditions are met
              if (user &&
                featureToggles.isFeatureEnabled('returnUser')) {
                toUpsert.provider = user.id;
                toUpsert.user = { name: user.name, email: user.email };
              }

              // Make sure the name is correct
              toUpsert.name = subjasp.subject.absolutePath +
                '|' + subjasp.aspect.name;
              return Sample.create(toUpsert);
            }

            // Existing sample. Do not update sample name
            delete toUpsert.name;

            /*
             * set value changed to true during updates to avoid timeouts.
             * Adding this to the before update hook does
             * give the needed effect; so adding it here!!!.
             */
            o.changed('value', true);
            return o.update(toUpsert);
          })
          .then((o) => {
            if (featureToggles.isFeatureEnabled('returnUser')) {
              return o.reload().then((o) => resolve(o));
            }

            return resolve(o);
          })
          .catch((err) => {
            if (isBulk) {
              /*
               * adding isFailed:true to differentiate failed results from
               * success results in bulk upsert
              */
              resolve({ explanation: err, isFailed: true });
            } else {
              reject(err);
            }
          });
        });
      }, // upsertByName

      /**
       * Upsert multiple samples concurrently.
       * @param  {Array} toUpsert - An array of sample objects to upsert
       * @param {Object} user - The user performing the write operation
       * @param {Array} readOnlyFields - An array of read-only-fields
       * @returns {Array} - Resolves to an array of resolved promises
      */
      bulkUpsertByName(toUpsert, user, readOnlyFields) {
        const promises = toUpsert.map((s) => {
          try {
            // thow an error if a sample is upserted with a read-only-field
            commonUtils.noReadOnlyFieldsInReq(s, readOnlyFields);
            return this.upsertByName(s, user, true);
          } catch (err) {
            return Promise.resolve({ explanation: err, isFailed: true });
          }
        }
        );
        return seq.Promise.all(promises);
      }, // bulkUpsertByName

      /**
       * Invalidates samples which were last updated before the "timeout"
       * specified by the aspect and resolves to an object containing the
       * number of samples evaluated, the number of samples timedout and an
       * array containing a "copy" of the sample object.
       *
       * @param {Date} now - For testing, pass in a Date object to represent
       *  the current time
       * @returns {Integer} number of samples timed out
       */
      doTimeout(now) {
        const curr = now || new Date();
        let numberTimedOut = 0;
        let numberEvaluated = 0;
        const timedOutSamples = [];
        return new seq.Promise((resolve, reject) => {
          Sample.scope('checkTimeout').findAll()
          .each((s) => {
            numberEvaluated++;
            if (s.aspect && u.isTimedOut(s.aspect.timeout, curr, s.updatedAt)) {
              numberTimedOut++;

              /*
               * NOTE: a separate copy of the sample needed to be made (by
               * deep cloning the required fields) to let the garbage collector
               * cleanup the timedOutSamples array.
               */
              const timedOutSample = {
                value: constants.statuses.Timeout,
                status: constants.statuses.Timeout,
                name: s.name.split()[0],
                statusChangedAt: new Date(),
                aspect: JSON.parse(JSON.stringify(s.aspect)),
              };
              timedOutSamples.push(timedOutSample);
              return s.update({ value: constants.statuses.Timeout });
            }
          })
          .then(() => resolve({ numberEvaluated, numberTimedOut,
            timedOutSamples, }))
          .catch(reject);
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
            if (s && s.getDataValue('isPublished')) {
              inst.name = s.absolutePath + constants.sampleNameSeparator;
              return inst.getAspect();
            }

            throw new dbErrors.ResourceNotFoundError({
              explanation: 'Subject not found.',
              resourceType: 'Subject',
              resourceKey: inst.getDataValue('subjectId'),
            });
          })
          .then((a) => {
            if (a && a.getDataValue('isPublished')) {
              inst.name += a.name;
              inst.status = u.computeStatus(a, inst.value);
              return resolve(inst);
            }

            throw new dbErrors.ResourceNotFoundError({
              explanation: 'Aspect not found.',
              resourceType: 'Aspect',
              resourceKey: inst.getDataValue('aspectId'),
            });
          })
          .then(() => resolve(inst))
          .catch(reject)
        );
      }, // hooks.beforeCreate

      /**
       * Update status if value changed, loading the aspect (asynchronously)
       * if the instance doesn't already include its associated aspect.
       *
       * @param {Sample} inst - The Sample instance being updated
       * @returns {undefined}
       */
      beforeUpdate(inst /* , opts */) {
        if (inst.changed('value')) {
          return inst.getSubject()
          .then((subject) => {
            if (subject && subject.isPublished) {
              return inst.aspect ? inst.aspect : inst.getAspect();
            }

            throw new dbErrors.ResourceNotFoundError({
              explanation: 'Subject not found.',
              resourceType: 'Subject',
              resourceKey: inst.getDataValue('subjectId'),
            });
          })
          .then((aspect) => {
            if (aspect && aspect.getDataValue('isPublished')) {
              inst.aspect = aspect;
              inst.calculateStatus();
              inst.setStatusChangedAt();
            } else {
              throw new dbErrors.ResourceNotFoundError({
                explanation: 'Aspect not found.',
                resourceType: 'Aspect',
                resourceKey: inst.getDataValue('aspectId'),
              });

            }
          });
        }
      }, // hooks.beforeUpdate

    }, // hooks
    indexes: [
      {
        name: 'AspectIdSubjectId',
        unique: true,
        fields: ['aspectId', 'subjectId'],
      },
      {
        name: 'SampleStatusIdx',
        fields: [
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

      isWritableBy(who) {
        return new seq.Promise((resolve /* , reject */) =>
          this.getAspect()
          .then((a) => a.getWriters())
          .then((writers) => {
            if (!writers.length) {
              resolve(true);
            }

            const found = writers.filter((w) =>
              w.name === who || w.id === who);
            resolve(found.length === 1);
          }));
      }, // isWritableBy

      setStatusChangedAt() {
        if (this.status !== this._previousDataValues.status) {
          this.previousStatus = this._previousDataValues.status;
          this.statusChangedAt = this.updatedAt;
        }
      }, // setStatusChangedAt
    }, // instanceMethods
  });
  return Sample;

  // TODO add a getterMethod or instanceMethod to retrieve the aspect's links
  // with variable substitution
};
