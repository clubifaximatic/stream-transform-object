
const Transform = require('stream').Transform;
const util = require('util');

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

  // if we do not consume the stream, do nothing else
  if (!this.consume) {
    return;
  }

  this.on('end', function () {
    if (this.consume) this.cb(undefined, { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('error', function (err) {
    if (this.consume) this.cb(err, { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('readable', function () {
    results = [];
    while (this.read());
  });
}

// hierarchy
util.inherits(StreamFrequency, Transform);

/**
 * _flush
 */
StreamFrequency.prototype._flush = function (cb) {

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
StreamFrequency.prototype._transform = function (chunk, encoding, cb) {

  // set first time
  if (this.firstChunkTime == 0) {
    this.firstChunkTime = new Date().getTime();
  }

  if (this.running >= this.ratio) {

    // check if already on timeout
    if (this.timeout) {
      return this.nextObject = [chunk, cb];
    }

    // calculate offset
    var now = new Date().getTime();
    var offset = now - this.firstChunkTime;

    // start timeout we are in the same second
    if (offset < 1000) {

      this.nextObject = [chunk, cb];

      // set timer
      var _this = this;
      return this.timeout = setTimeout(function () {
        processTimeout.call(_this);
      }, 1000 - offset);
    }

    // nothing processed this time unit
    this.running = 0;

    // calculate new offset
    this.firstChunkTime = (offset < 2000) ? (this.firstChunkTime - 1000) : now;
  }

  this.running++;
  doTransformation.call(this, chunk, cb);
};

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

    this.finished++;
    return;
  }

  // call transformation function
  var _this = this;
  this.func.call(null, doc, function (err, response) {

    // check if error
    if (err) {
      return _this.emit('error', err);
    }

    this.ended++;

    // push if needed (we do not consume)
    if (!_this.consume && response) {
      _this.push(response);
    }

    _this.finished++;

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

  this.running = 0;
  this.timeout = 0;
  this.firstChunkTime = new Date().getTime();

  if (this.nextObject) {
    var chunk = this.nextObject[0];
    var cb = this.nextObject[1];
    nextObject = null;
    this.running++;
    doTransformation.call(this, chunk, cb);
  }
}

module.exports = StreamFrequency;
