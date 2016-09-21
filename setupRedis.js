/**
 * ./setupRedis.js
 */

'use strict'; // eslint-disable-line strict

/**
 * Parses the subject absolute path from the sample name
 * @param  {Object} obj - Message Object received from the redis subscribe
 *                        channel
 * @returns {String} -  which is the subject absolute path
 */
function parseSubjectAbsPath(obj) {
  if (obj.new) {
    // need to return absolutePath, for subject changes
    if (obj.new.absolutePath) {
      return obj.new.absolutePath;
    }
    return obj.new.name.split('|')[0];
  }

  // need to return absolutePath, for subject changes
  if (obj.absolutePath) {
    return obj.absolutePath;
  }

  return obj.name.split('|')[0];
}

/**
 *
 * Redis subscriber uses socket.io to broadcast.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {Object} sub - Redis subscriber instance
*/
module.exports = (io, sub) => {
  sub.on('message', (channel, mssgStr) => {
    // TODO: would regex be faster than JSON.parse to extract the key and
    // object?
    const mssgObj = JSON.parse(mssgStr);
    const key = Object.keys(mssgObj)[0];
    const subjectAbsPath = parseSubjectAbsPath(mssgObj[key]);
    const absPathArray = subjectAbsPath.split('.');
    let subj = '/';

    /*
     * The data is sent to all of the namespaces to which a client could be
     * listening. For example, for a subject with absolute path "NA.US.CA"
     * a client could be interested in the "NA" subject root or "NA.US" or
     * "NA.US.CA". There is a namespace for each of these, and the data is
     * sent to each of these namespaces.
     */
    for (let i = 0; i < absPathArray.length; i++) {
      subj += absPathArray[i];

      /*
       * the subj variable above needed to be assigned to another
       * variable(nameSpace), for socketio to recognize it as a valid namespace
       * and send the data over.
       */
      const nameSpace = subj;
      io.of(nameSpace).emit(key, JSON.stringify(mssgObj));
      subj += '.';
    }
  });
};
