'use strict';

const Transform = require('stream').Transform;
const util = require('util');

const debug = require('debug')('sto:frequency');

/**
 * process
 */
function doTransformation (doc, cb) {

  ++this.started;

  if (cb) cb();

  // no transformation, continue
  if (!this.func) {

    // push if needed
    if (!this.consume) {
      this.push(doc);
    }

    this.running--;
    this.finished++;

    debug(' doTransformation (nofunc) running:', this.running);

    if (this.endingFunc && this.running == 0) {
      return this.push(null);
    }

    return;
  }

  // call transformation function
  var _this = this;
  this.func.call(null, doc, function (err, response) {

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

    debug(' doTransformation running:', _this.running);

    // ending
    if (_this.endingFunc && _this.running == 0) {
      return _this.push(null);
    }
  }, this.started);
}

/**
 * processTimeout
 */
function processTimeout () {
  debug('- processTimeout');

  this.runningStep = 0;
  this.timeout = 0;
  this.firstChunkTime = new Date().getTime();

  if (this.nextObject) {
    const chunk = this.nextObject[0];
    const cb = this.nextObject[1];
    this.nextObject = null;
    this.runningStep++;
    this.running++;
    doTransformation.call(this, chunk, cb);
  }
}

/**
 * The transformation function is called with frequency of  nitems by second
 * as max. Calls are in parallel
 * If a callback is provided, the stream is not propagated further
 */
function StreamFrequency (nitems, func, callback) {

  // input
  this.ratio = nitems || (nitems > 0) ? nitems : 100;
  this.func = func;
  this.cb = callback;

  // statistics
  this.started = 0;
  this.runningStep = 0;
  this.running = 0;
  this.finished = 0;

  // control
  this.consume = callback ? true : false;
  this.endingFunc = null;

  this.timeout = null;
  this.firstChunkTime = 0;
  this.nextObject = null;

  if (!(this instanceof StreamFrequency))
    return new StreamFrequency(this.options);
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
util.inherits(StreamFrequency, Transform);

/**
 * _flush
 */
StreamFrequency.prototype._flush = function (cb) {
  debug ('- _flush', 'running?', this.running, 'nextObject?', (this.nextObject !== null), 'timeout?', this.timeout);

  if (!this.running && !this.nextObject) {
    this.push(null);
    return cb();
  }

  debug ('- _waiting more');
  // end
  this.endingFunc = cb;

  return false;
};

/**
 * _transform
 * read items until the queue is full, then call transformation
 */
StreamFrequency.prototype._transform = function (chunk, encoding, cb) {
  debug('- _transform', this.started, 'ratio', this.ratio);

  // set first time
  if (this.firstChunkTime === 0) {
    this.firstChunkTime = new Date().getTime();
  }

  if (this.runningStep >= this.ratio) {

    // check if already on timeout
    if (this.timeout) {
      debug('- _transform. Timer Already Set =',this.runningStep,' STOP for a while');
      this.nextObject = [chunk, cb];
      return;
    }

    debug('- _transform. Too much this.runningStep =',this.runningStep,' STOP for a while');

    // calculate offset
    var now = new Date().getTime();
    var offset = now - this.firstChunkTime;

    // start timeout we are in the same second
    if (offset < 1000) {

      debug('- _transform. about to set a timer. offset =', offset);

      this.nextObject = [chunk, cb];

      // set timer
      var _this = this;
      this.timeout = setTimeout(function () {
        processTimeout.call(_this);
      }, 1000 - offset);
      return;
    }

    // nothing processed this time unit
    this.runningStep = 0;

    // calculate new offset
    this.firstChunkTime = (offset < 2000) ? (this.firstChunkTime - 1000) : now;
  }

  this.running++;
  this.runningStep++;
  doTransformation.call(this, chunk, cb);
};

module.exports = StreamFrequency;
