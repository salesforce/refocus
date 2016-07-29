/**
 * db/helpers/common.js
 *
 * Common utility file used by all the models
 */

'use strict'; // eslint-disable-line strict

const pub = require('../../pubsub').pub;
const channelName = require('../../config').redis.channelName;

// jsonSchema keys for relatedLink
const jsonSchemaProperties = {
  relatedlink: ['name', 'url'],
};

/**
 * This function checks if the aspect and subject associated with the sample
 * are published or not. It resolves to true when both the aspect and
 * the subject are published or false otherwise.
 *
 * @param {Sequelize} seq - A reference to Sequelize to have access to the
 * the Promise class.
 * @param {Instance} inst - The Sample Instance.
 * @returns {Promise} - Returns  a promise which resolves to true when both the
 * aspect and the subject are published or false otherwise.
 */
function sampleAspectAndSubjectArePublished(seq, inst) {
  return new seq.Promise((resolve, reject) => {
    let asp, sub;
    inst.getSubject()
    .then((s) => sub = s)
    .then(() => inst.getAspect())
    .then((a) => asp = a)
    .then(() => resolve(sub && asp && sub.isPublished && asp.isPublished))
    .catch((err) => reject(err));
  });
} // sampleAspectAndSubjectArePublished

/**
 * This function returns an object to be published via redis channel
 * @param  {Object} inst  -  Model instance
  @param  {[Array]} changedKeys - An array containing the fileds of the model
 * that were changed
 * @param  {[Array]} ignoreAttributes An array containing the fileds of the
 * mode that should be ignored
 * @returns {Object} - Returns an object that is ready to be published Or null
 * if there are no changedfields.
 */
function prepareToPublish(inst, changedKeys, ignoreAttributes) {
  // prepare the data iff changed fields are not in ignoreAttributes
  const ignoreSet = new Set(ignoreAttributes);
  for (let i = 0; i < changedKeys.length; i++) {
    if (!ignoreSet.has(changedKeys[i])) {
      return {
        old: inst._previousDataValues,
        new: inst.get(),
      };
    }
  }

  return null;
} // prepareToPublish

/**
 * This function publishes an created, updated or a deleted model instance to
 * the redis channel and returns the object that was published
 *
 * @param  {Object} inst - Model instance to be published
 * @param  {String} event  - Type of the event that is being published
 * @param  {[Array]} changedKeys - An array containing the fileds of the model
 * that were changed
 * @param  {[Array]} ignoreAttributes An array containing the fileds of the mode
 * that should be ignored
 * @returns {Object} - object that was published
 */
function publishChange(inst, event, changedKeys, ignoreAttributes) {
  const obj = {};

  obj[event] = inst.get();

  /**
   * The shape of the object required for update events are a bit different.
   * changedKeys and ignoreAttributes are passed in as arrays by the
   * afterUpdate hooks of the models, which are passed to the prepareToPublish
   * to get the object just for update events.
   */
  if (Array.isArray(changedKeys) && Array.isArray(ignoreAttributes)) {
    obj[event] = prepareToPublish(inst, changedKeys, ignoreAttributes);
  }

  if (obj[event]) {
    pub.publish(channelName, JSON.stringify(obj));
  }

  return obj;
} // publishChange

/**
 * This function updates or creates the associated tags of an Instance
 *
 * @param  {[Object]} inst - An instance that has to have the associated
 *  tags updated or created
 * @param  {[Array]} tags - An array containing the tags to be
 *  updated or inserted
 * @returns {Promise} which resolves to an object containing the tags
 */
function handleTags(inst, tags, method) {
  const promises = tags.map((tag) =>
    new Promise((resolve, reject) => {
      inst.getTags({ where:
          { name: tag.name, },
      })
      .then((o) => {
        // since the combination of name and associationId is unique,
        // this instance o, of tag will either be an array
        // of size 0 or size 1.
        const assocInst = o [0];
        if (!assocInst) {
          return inst.createTag(tag);
        }

        return assocInst;
      })
      .then((retVal) => resolve(retVal))
      .catch((err) => reject(err));
    })
  );
  if (/put/i.test(method)) {
    return new Promise((resolve, reject) => {
      let resolvedTags;
      Promise.all(promises)
      .then((retValue) => {
        resolvedTags = retValue;
        return inst.getTags();
      })
      .then((instTags) => {
        instTags.forEach((tag) => {
          let found = false;
          resolvedTags.forEach((rTag) => {
            if (rTag.id === tag.id) {
              found = true;
            }
          });

          if (!found) {
            tag.destroy();
          }
        });
      })
      .then(() => resolve(resolvedTags))
      .catch((err) => reject(err));
    });
  }

  return Promise.all(promises);
} // handleTags

/**
 * The Json format of the relatedLink is validated against a pre-defined
 * schema. Validation to check the uniqueness of relatedLinks by name is
 * done
 * @param  {Object} value - Array of Json object that needed to be validated
 * against a predefined schema
 * @returns {undefined} OK
 */
function validateJsonSchema(value) {
  const relLinkNameSet = new Set();

  for (let i = 0; i < value.length; i++) {
    const relLink = value[i];
    if (Object.keys(relLink).length > jsonSchemaProperties.relatedlink.length) {
      throw new Error('A relatedlinks can only have'+
        jsonSchemaProperties.relatedlink.length +' properties: ' +
        jsonSchemaProperties.relatedlink);
    }
    if (relLinkNameSet.has(relLink.name)) {
      throw new Error('Name of the relatedlinks should be unique');
    } else {
      relLinkNameSet.add(relLink.name);
    }
  }
}

/**
 * Sets the instance's isDeleted field.
 *
 * @param {Promise} Promise -The Sequelize Promise class
 * @param {Instance} inst - The instance being deleted
 * @returns {Promise} which resolves undefined if OK or rejects if an error
 *  was encountered trying to update the instance's isDeleted field
 */
function setIsDeleted(Promise, inst) {
  return new Promise((resolve, reject) =>
    inst.update({ isDeleted: Date.now() })
    .then(() => resolve())
    .catch((err) => reject(err)));
} // setIsDeleted

module.exports = {
  setIsDeleted,
  handleTags,
  publishChange,
  sampleAspectAndSubjectArePublished,
  validateJsonSchema,
}; // exports
