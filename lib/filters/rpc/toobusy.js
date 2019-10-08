/**
 * Filter for rpc log.
 * Reject rpc request when toobusy
 */
const rpcLogger = require('pomelo-logger').getLogger('rpc-log', __filename);
const toobusy = require('toobusy-js');
const DEFAULT_MAXLAG = 70;
const DEFAULT_INTERVAL = 250;
const ERROR_CODE = 9998;

module.exports = function(maxLag, interval) {
  return new Filter(maxLag || DEFAULT_MAXLAG, interval ||DEFAULT_INTERVAL);
};

const Filter = function(maxLag, interval) {
    toobusy.maxLag(maxLag);
    toobusy.interval(interval);
};

Filter.prototype.name = 'toobusy';

/**
 * Before filter for rpc
 */
 Filter.prototype.before = function(serverId, msg, opts, next) {
  opts = opts||{};
  if (toobusy()) {
    rpcLogger.warn('Server too busy for rpc request, serverId:' + serverId + ' msg: ' + msg);
    var err =  new Error('Backend server ' + serverId + ' is too busy now!');
    err.code = 500;
    next(err);
  } else {
    next();
  }
};
