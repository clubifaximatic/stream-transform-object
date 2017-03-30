'use strict';

const Writable = require('stream').Writable;
const util = require('util');

const debug = require('debug')('sto:drain');

/** 
 * Constructor
 */
function StreamDrain (options, callback) {

  // check parameters
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // check options
  if (!options) options = {};
  options.objectMode = true;

  this.processed = 0;
  this.cb = callback;

  if (!(this instanceof StreamDrain))
    return new StreamDrain(options, callback);
  Writable.call(this, options);

  this.on('finish', function () {
    debug('- finish', { started: this.processed, running: 0, finished: this.processed });
    if (this.cb) this.cb(undefined, { started: this.processed, running: 0, finished: this.processed });
  });

  this.on('error', function (err) {
    debug('- error', err);
    if (this.cb) this.cb(err, { started: this.processed, running: 0, finished: this.processed });
  });
}
util.inherits(StreamDrain, Writable);

/**
 * _write
 */
StreamDrain.prototype._write = function (chunk, encoding, callback) {
  this.processed++;
  debug('_write', this.processed);
  callback();
};


module.exports = StreamDrain;
