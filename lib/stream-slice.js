/**
 * bob@mallzee.com
 */

const Transform = require('stream').Transform;
const util = require('util');

/**
 * The transformation function is called with a group of `nitems` objects
 * If a callback is provided, the stream is not propagated further
 */
function StreamSlice (nitems, func, callback) {

  // input
  this.nitems = nitems || 10;
  this.func = func;
  this.cb = callback;

  // statistics
  this.started = 0;
  this.finished = 0;
  this.running = 0;

  // control
  this.startedChunks = 0;
  this.queue = [];
  this.consume = callback ? true : false;
  this.endFunc = null;

  if (!(this instanceof StreamSlice))
    return new StreamSlice(this.options);
  Transform.call(this, { objectMode: true });

  // if we do not consume the stream, do nothing else
  if (!this.consume) {
    return;
  }

  // this.on('finish', function () {
  //   console.log(' (StreamSlice) ------- finish ------ finish ');
  // });

  this.on('end', function () {
    // console.log(' (StreamSlice) ------- end ------ end ', { started: this.started, running: this.running, finished: this.finished });
    this.cb(undefined, { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('error', function (err) {
    // console.log(' (StreamSlice) ------- error ------ error ', err);
    this.cb(err, { started: this.started, running: this.running, finished: this.finished });
  });

  this.on('readable', function () {
    // console.log(' (StreamSlice) ------- readable ------ readable ');
    results = [];
    while (this.read());
  });
}

// hierarchy
util.inherits(StreamSlice, Transform);

/**
 * _flush
 */
StreamSlice.prototype._flush = function (cb) {

  // if no element in the queue, we finished
  if (this.queue.length == 0) {
    this.push(null);
    return cb();
  }

  // last call with remaining elements
  var _this = this;
  doTransformation.call(this, function () {
    _this.push(null);
    cb();
  });
};

/**
 * _transform
 * read items until the queue is full, then call transformation
 */
StreamSlice.prototype._transform = function (chunk, encoding, cb) {

  this.started++;
  this.queue.push(chunk);

  // if not enough items, continue
  if (this.queue.length < this.nitems) {
    return cb();
  }

  doTransformation.call(this, cb);
};

/**
 * process
 */
function doTransformation (cb) {

  this.startedChunks++;

  // copy objects
  var theQueue = this.queue;
  this.queue = [];
  this.running++;

  // call transformation function
  if (this.func) {
    var _this = this;

    this.func.call(null, theQueue, function (err, docs) {

      // check if error
      if (err) {
        return _this.emit('error', err);
      }

      // push if needed (we do not consume)
      if (!_this.consume && docs) {
        docs.forEach(function (doc) {
          _this.push(docs);
        });
      }

      _this.finished += theQueue.length;
      _this.running--;
      cb();
    }, this.startedChunks);
  } else {
    // no transformation, push if needed
    if (!this.consume) {
      theQueue.forEach(function (doc) {
        this.push(docs);
      });
    }

    this.finished += theQueue.length;
    _this.running--;
    cb();
  };
}

module.exports = StreamSlice;
