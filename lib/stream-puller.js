'use strict';

const Readable = require('stream').Readable;
const util = require('util');

/**
 * Call original provided function for getting more results
 */
function _readNext (self, cb) {
  self._n++;
  self._readNext(self._n, function (err, items) {

    // if error
    if (err) return self.emit('error', err);

    // if end
    if (!items || (Array.isArray(items) && items.length === 0)) return self.push(null);

    const theItems = Array.isArray(items) ? items : [items];
    theItems.forEach(function (doc) {
      self.buffer.push(doc);
    });

    self._read();
  });
}


/**
 * Constructor
 */
var StreamPuller = function (func) {

  this.buffer = [];
  this._readNext = func;

  Readable.call(this, { objectMode: true });
};

util.inherits(StreamPuller, Readable);

/**
 *
 */
StreamPuller.prototype._read = function () {

  if (this.buffer.length > 0) {
    return this.push(this.buffer.shift());
  }

  // read more
  _readNext(this);

  // // check if we have ended
  // var _this = this;
  // if (this.end) {
  //   return setImmediate(function () {
  //     _this.started = 0;
  //     _this.push(null);
  //   });
  // }
};

// /**
//  *
//  */
// function _readNext (self, cb) {

//   var query = self.scrollId ? self.queryNext : self.query;

//   if (self.scrollId == null) {
//     return self.client.search(query, function (err, response) {

//       if (err) {
//         return self.emit('error', err);
//       }

//       // finish if there are no elements
//       if (response.hits.total === 0) {
//         return cb(undefined, false);
//       }

//       self.scrollId = response._scroll_id;
//       _readNext(self, cb);

//     });
//   } else {

//     self.client.scroll({
//       scroll: self.query.scroll,
//       scroll_id: self.scrollId
//     },
//     function (err, response) {

//       if (err) return self.emit('error', err);

//       // no results
//       if (response.hits.hits.length == 0) {
//         return cb(undefined, false);
//       }

//       // save hits
//       var limit = false;
//       response.hits.hits.forEach(function (doc) {

//         // check limit
//         limit = self.params.limit ? (self.params.limit <= self.started) : false;
//         if (limit) return;

//         self.buffer.push(doc._source);
//         self.started++;
//       });

//       self.scrollId = response._scroll_id;

//       // callback
//       var finish = (limit || (response.hits.total == self.started));
//       cb(undefined, !finish);
//     });
//   }
// }

module.exports = StreamPuller;
