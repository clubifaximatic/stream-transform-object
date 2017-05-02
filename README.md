# stream-transform-object

A collection of implementations to work with streams and transform/manage documents

## methods

The constructor of each class has the parameters `func` and `callback` both are optional.

### func parameter
If `func` is defined the func will be call for each element depending on the implementation

The function `func` receives three parameters:

1. The `document` to be processed
2. The `next` function to be called once the document has been processed. It receives two parameters: 1) the error, if any 2) the document that we want to propagate or undefined.
3. The `index` of the document being processed in the stream


### callback parameter
If `callback` is defined, it will be called when the stream ends or there is an error. In this case the stream cannot propagate to another stream (no pipe)

If it is not declares it works like a normal stream and you can pipe to another stream

The function `callback` receives two parameters:

1. The `error` object, if any
2. The `result` object with the number of objects `started` and `finished`


## implementations

### map(nitems, func, callback)

Execute a function for each element in the stream. Element has to be passed to the next() function if we want to propagate to another stream. It is necessary specify the number of parallel items to be processed

* nitems: number of items to process in parallel
* func: (optional) function to be executed
* callback: (optional) callback function called when stream ends


```js
const st = require('stream-transform-object');

// create stream
var smap = st.map(
  // nitems
  1,

  // func
  function (doc, next, n) {
    doc.username = doc.username.toUppercase();
    next (undefined, doc);
  },

  // callback
  function (doc, stats) {
    console.log('END', stats);
  }
);

// pipe results
mongocursor.pipe(smap);

```

### slice(nitems, func, callback)

Execute the function with an array for `nitems`. This is good for back operations like updating databases

* nitems: number of items in the array
* func: (optional) function to be executed
* callback: (optional) callback function called when stream ends


```js
const st = require('stream-transform-object');

// create stream
var sslice = st.slice(
  // nitems
  10,

  // func. docs is an array of 10 elements
  function (docs, next, n) {
    console.log('processing document:', n);
    updateDatabaseBatch(docs, function (err) {
      next(err, docs);
    });
  },

  // callback
  function (doc, stats) {
    console.log('END', stats);
  }
);

// pipe results
mongocursor.pipe(sslice);

```


### frequency(nitems, func, callback)

Execute the function with a frequency of nitems per second. No more than nitems are executed each second, so you can calculate the ouput of documents. This should be useful for dynamodb read/write taking capacity into account

* nitems: number of items to be readed by second
* func: (optional) function to be executed
* callback: (optional) callback function called when stream ends


```js
const st = require('stream-transform-objecth');

// create stream
var sfreq = st.frequency(
  // nitems
  10,

  // func. docs is an array of 10 elements
  function (docs, next) {
    updateDatabaseBatch(docs, function (err) {
      next(err, docs);
    });
  },

  // callback
  function (doc, stats) {
    console.log('END', stats);
  }
);

// pipe results
mongocursor.pipe(sfreq);

```

### drain(callback)

Consumes the stream doing nothing

* callback: (optional) callback function called when stream ends


```js
const st = require('stream-transform-objecth');

// create stream
var sfreq = st.frequency (
  // callback
  function (doc, stats) {
    console.log('END', stats);
  }
);

// pipe results
mongocursor.pipe(sfreq);

```

### Pipe all 


```js
const st = require('stream-transform-object');

var transform = st.map (
  // nitems
  100,

  function (docs, next) {
    // transform documents
  }
);

var save = st.slice (
  // nitems
  50,

  function (docs, next) {
    // save documents in batch
  }
);

var update = st.frequency (
  60,

  function (docs, next) {
    // Update Dynamo table
  }
);

var drain = st.drain (
  // callback
  function (doc, stats) {
    console.log('END', stats);
  }
);

// pipe all
mongocursor
  .pipe(transform)
  .pipe(save)
  .pipe(update)
  .pipe(drain);

```

