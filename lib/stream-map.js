'use strict';

const Transform = require('stream').Transform;
const util = require('util');

const debug = require('debug')('sto:map');

/**
 * process
 */
function doTransformation (doc, cb) {

  ++this.started;

  // no transformation, continue
  if (!this.func) {

    // push if needed
    if (!this.consume) {
      this.push(doc);
    }

    this.running--;
    this.finished++;
    if (cb) cb();
    return;
  }

  var _this = this;

  this.func.call(this, doc, function (err, response) {

    // check if error
    if (err) {
      return _this.emit('error', err);
    }

    // push if needed (we do not consume)
    if (!_this.consume && response) {
      _this.push(response);
    }

    _this.running--;
    _this.finished++;
    if (cb) cb();

    // ending
    if (_this.endingFunc && _this.running == 0) {
      return _this.push(null);
    }
  }, this.started);
}

/**
 * The transformation function is called with a group of `nitems` objects
 * If a callback is provided, the stream is not propagated further
 */
function StreamMap (nitems, func, callback) {

  // input
  this.nitems = nitems || 10;
  this.func = func;
  this.cb = callback;

  // statistics
  this.started = 0;
  this.running = 0;
  this.finished = 0;

  // control
  this.consume = callback ? true : false;
  this.endingFunc = null;

  if (!(this instanceof StreamMap))
    return new StreamMap(this.options);
  Transform.call(this, { objectMode: true });

  this.on('finish', function () {
    debug('- finish', { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('end', function () {
    debug('- end', { started: this.started, running: this.running, finished: this.finished });
    if (this.consume) this.cb(undefined, { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('error', function (err) {
    debug('- error', err);
    if (this.consume) this.cb(err, { started: this.started, running: this.running, finished: this.finished });
  });

  // if we do not consume the stream, do nothing else
  if (!this.consume) {
    return;
  }

  this.on('readable', function () {
    debug('- readable');
    while (this.read());
  });
}

// hierarchy
util.inherits(StreamMap, Transform);

/**
 * _flush
 */
StreamMap.prototype._flush = function (cb) {
  debug('- _flush', 'running?', this.running);

  if (!this.running) {
    this.push(null);
    return cb();
  }

  // end
  this.endingFunc = cb;
};

/**
 * _transform
 * read items until the queue is full, then call transformation
 */
StreamMap.prototype._transform = function (chunk, encoding, cb) {

  this.running++;

  debug('- _transform', this.started, 'running', this.running);

  // if not enough items, continue
  if (this.running < this.nitems) {
    cb();
    return doTransformation.call(this, chunk);
  }

  doTransformation.call(this, chunk, cb);
};

module.exports = StreamMap;
