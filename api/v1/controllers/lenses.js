/**
 * api/v1/controllers/lenses.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../helpers/nouns/lenses');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const apiErrors = require('../apiErrors');
const AdmZip = require('adm-zip');

const ZERO = 0;
const ONE = 1;

/**
 * overwrites name, description and version from lens metadata if not provided
 * in request
 * @param  {object} seqObj - lens object
 */
function updateLensDetails(seqObj) {
  if (seqObj.hasOwnProperty('name') === false || seqObj.name === '') {
    if (seqObj.hasOwnProperty('sourceName')) {
      seqObj.name = seqObj.sourceName;
    } else {
      throw new apiErrors.ValidationError();
    }
  }

  if (seqObj.hasOwnProperty('description') === false ||
      seqObj.description === '') {
    if (seqObj.hasOwnProperty('sourceDescription')) {
      seqObj.description = seqObj.sourceDescription;
    }
  }

  if (seqObj.hasOwnProperty('version') === false ||
      seqObj.version === '') {
    if (seqObj.hasOwnProperty('sourceVersion')) {
      seqObj.version = seqObj.sourceVersion;
    }
  }
}

/**
 * Parse lens metadata from lens json provided in lens zip
 * @param  {object} zip - lens zip
 * @param  {object} lensJson - lens metadata in json format
 * @param  {object} seqObj - lens object to create
 */
function parseLensMetadata(zip, lensJson, seqObj) {
  const metadataJson = JSON.parse(zip.readAsText(lensJson));
  for (const metadataEntry in metadataJson) {
    // lens metadata name will be saved as sourceName.
    //  Same with description and version
    if (metadataEntry === 'name' || metadataEntry === 'description' ||
     metadataEntry === 'version') {
      const capMetadataEntry = metadataEntry.charAt(ZERO).toUpperCase() +
       metadataEntry.slice(ONE);
      seqObj['source' + capMetadataEntry] = metadataJson[metadataEntry];
    } else {
      seqObj[metadataEntry] = metadataJson[metadataEntry];
    }
  }
}

/**
 * Extract lens metadata from lens zip
 * @param  {object} requestObj - request object
 * @param  {string} libraryParam - zip parameter in request object
 * @param  {object} seqObj - description
 */
function handleLensMetadata(requestObj, libraryParam, seqObj) {
  if (requestObj[libraryParam].value.mimetype === 'application/zip') {
    const zip = new AdmZip(requestObj[libraryParam].value.buffer);
    const zipEntries = zip.getEntries();

    // make sure zip has required files, lens.json and lens.js
    let lensJsonFound = false;
    let lensJsFound = false;
    let lensJson;
    for (let i = 0; i < zipEntries.length; i++) {
      if (zipEntries[i].entryName === 'lens.json') {
        lensJsonFound = true;
        lensJson = zipEntries[i];
      }

      if (zipEntries[i].entryName === 'lens.js') {
        lensJsFound = true;
      }
    }

    if (lensJsonFound && lensJsFound) {
      parseLensMetadata(zip, lensJson, seqObj);
    } else {
      throw new apiErrors.ValidationError();
    }
  } else {
    throw new apiErrors.ValidationError();
  }
}

/**
 * Create Json for files in Lens library with format, filename: file contents.
 * @param  {Object} lensObject - lens object
 * @returns {Object} zipContents - Json prepared from library contents.
 */
function createLensLibraryJson(lensObject) {
  const re = /(?:\.([^.]+))?$/;
  const zip = AdmZip(lensObject.library);
  const zipEntries = zip.getEntries();

  const zipContents = {};
  for (let j = 0; j < zipEntries.length; j++) {
    let ext = re.exec(zipEntries[j].entryName)[ONE] || '';
    ext = ext.toLowerCase();

    // handle different file types here
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      const b64str = zipEntries[j].getData().toString('base64');
      zipContents[zipEntries[j].entryName] = b64str;
    } else {
      zipContents[zipEntries[j].entryName] = zip.readAsText(
        zipEntries[j]
      );
    }
  }

  return zipContents;
}

/**
 * Recursively cleans the object (i.e. calls "get" on any sequelize
 * instances), strips out nulls (because swagger validation doesn't like
 * nulls).
 *
 * @param {Object} obj - The object to clean
 * @returns {Object} - The cleaned object
 */
function cleanAndCreateLensJson(obj) {
  const o = obj.get ? obj.get({ plain: true }) : obj;
  if (o) {
    const keys = Object.keys(o);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (key === 'library' && o[key]) {
        const lensLibraryJson = createLensLibraryJson(o);
        o[key] = lensLibraryJson;
      } else if (o[key] === undefined || o[key] === null) {
        delete o[key];
      } else if (Array.isArray(o[key])) {
        o[key] = o[key].map((j) => cleanAndCreateLensJson(j));
      } else if (typeof o[key] === 'object') {
        o[key] = cleanAndCreateLensJson(o[key]);
      }
    }
  }

  return o;
}

/**
 * Prepares the object to be sent back in the response ("cleans" the object,
 * strips out nulls, adds API links).
 *
 * @param {Instance|Array} rec - The record or records to return in the
 *  response
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {String} method - The request method, used to help build the API
 *  links
 * @returns {Object} the "responsified" cleaned up object to send back in
 *  the response
 */
function responsify(rec, props, method) {
  const o = cleanAndCreateLensJson(rec);
  o.apiLinks = u.getApiLinks(o.id, props, method);
  return o;
}

module.exports = {

  /**
   * DELETE /lenses/{key}
   *
   * Uninstalls the lens and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteLens(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /lenses
   *
   * Finds zero or more lenses and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findLenses(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /lenses/{key}
   *
   * Retrieves the lens and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getLens(req, res, next) {
    u.findByKey(helper, req.swagger.params, ['lensLibrary'])
    .then((o) => {
      res.status(httpStatus.OK).json(responsify(o, helper, req.method));
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * PATCH /lenses/{key}
   *
   * Updates selected lens metadata fields and sends the updated lens back in
   * the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchLens(req, res, next) {
    const requestBody = req.swagger.params.queryBody.value;
    u.findByKey(helper, req.swagger.params)
    .then((o) => {
      if (requestBody.name === '') {
        if (o.sourceName) {
          requestBody.name = requestBody.sourceName;
        }
      }

      if (requestBody.description === '') {
        if (o.sourceDescription) {
          requestBody.description = requestBody.sourceDescription;
        }
      }

      if (requestBody.version === '') {
        if (o.sourceVersion) {
          requestBody.version = requestBody.sourceVersion;
        }
      }

      return o.update(requestBody);
    })
    .then((o) => u.handleAssociations(requestBody, o, helper, req.method))
    .then((retVal) =>
      res.status(httpStatus.OK).json(u.responsify(retVal, helper, req.method)))
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /lenses
   *
   * Installs a new lens and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postLens(req, res, next) {
    const reqObj = req.swagger.params;
    const seqObj = {};
    try {
      for (const param in reqObj) {
        if (reqObj[param].value) {
          if (typeof (reqObj[param].value) === 'object' &&
            param === 'library') {
            handleLensMetadata(reqObj, param, seqObj);
            seqObj[param] = reqObj[param].value.buffer;
          } else {
            seqObj[param] = reqObj[param].value;
          }
        }
      }

      updateLensDetails(seqObj);
      const assocToCreate = u.includeAssocToCreate(seqObj, helper);
      helper.model.create(seqObj, assocToCreate)
      .then((o) => {
        delete o.dataValues.library;
        res.status(httpStatus.CREATED).json(
          u.responsify(o, helper, req.method)
        );
      })
      .catch((err) => {
        u.handleError(next, err, helper.modelName);
      });
    } catch (err) {
      err.info = 'Invalid library uploaded.';
      u.handleError(next, err, helper.modelName);
    }
  },

  /**
   * PUT /lenses/{key}
   *
   * Updates the lens and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putLens(req, res, next) {
    const reqObj = req.swagger.params;
    u.findByKey(helper, req.swagger.params)
    .then((o) => {
      for (const param in reqObj) {
        if (reqObj[param].value === undefined) {
          let nullish = null;
          if (reqObj[param].schema.type === 'boolean') {
            nullish = false;
          } else if (reqObj[param].schema.default) {
            nullish = reqObj[param].schema.default;
          }

          o.set(param, nullish);
        } else if (param === 'library') {
          o.set(param, reqObj[param].value.buffer);
        } else {
          o.set(param, reqObj[param].value);
        }
      }

      if (o.name === null || o.name === '') {
        o.set('name', o.get('sourceName'));
      }

      if (o.description === null || o.description === '') {
        o.set('description', o.get('sourceDescription'));
      }

      if (o.version === null || o.version === '') {
        o.set('version', o.get('sourceVersion'));
      }

      return o.save();
    })
    .then((o) => {
      delete o.dataValues.library;
      return res.status(httpStatus.OK).json(
        u.responsify(o, helper, req.method)
      );
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
