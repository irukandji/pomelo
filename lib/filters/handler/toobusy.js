/**
 * Filter for toobusy.
 * if the process is toobusy, just skip the new request
 */
const logger = require('pomelo-logger').getLogger('pomelo', __filename);
const toobusy = require('toobusy-js');
const DEFAULT_MAXLAG = 70;
const DEFAULT_INTERVAL = 250;
const ERROR_CODE = 9999;

module.exports = function(maxLag, interval) {
  return new Filter(maxLag || DEFAULT_MAXLAG, interval ||DEFAULT_INTERVAL);
};

var Filter = function(maxLag, interval) {
    toobusy.maxLag(maxLag);
    toobusy.interval(interval);
};

Filter.prototype.before = function(msg, session, next) {
  if (toobusy()) {
      logger.debug('[toobusy] reject request msg: %j', msg);
    next(ERROR_CODE, {code: ERROR_CODE});
  } else {
      next();
  }
};
