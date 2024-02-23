// Common/useful functions
// Copyright 2018 Jeff Platzer. All rights reserved.

function fcnCbToPromise(fcnWithCb, procErrFcn = null, procDocFcn = null) {
  return new Promise((resolve,reject) => {
    const completeCB = (err, doc) => {
      if (err) {
        if (procErrFcn) {
          procErrFcn(err, resolve, reject);
        }
        else {
          reject(err);
        }
      }
      else {
        if (procDocFcn) {
          procDocFcn(doc, resolve, reject);
        }
        else {
          resolve(doc);
        }
      }
    };
    fcnWithCb(completeCB);
  });
}
exports.fcnCbToPromise = fcnCbToPromise;

exports.modString = (modFcn) => (inStr) => {
  const outStr = modFcn(inStr);
  return ({
    value: outStr,
    next: (fcn) => fcn(outStr),
  });
}

const cloneObjProps = function(obj, props) {
  const copy = {};
  const keys = props ? props : obj;
  for (let key in keys) {
    key = props ? props[key] : key;
    const value = obj[key];
    if (value !== undefined) {
      copy[key] = value;
    }
  }
  return copy;
};
exports.cloneObjProps = cloneObjProps;

const objectsMatch = (obj1, obj2, keys) => {
  const reducer = (result, key) => result && obj1[key] == obj2[key];
  return keys.reduce(reducer, true);
}
exports.objectsMatch = objectsMatch;

const arraysMatch = (arr1, arr2, entriesMatchFcn) => {
  const reducer = (result, entry1, idx) => result && entriesMatchFcn(entry1, arr2[idx]);
  return arr1.length == arr2.length && arr1.reduce(reducer, true);
}
exports.arraysMatch = arraysMatch;

const arrayAsyncReduce = function(arr, ayncReducer, initial) {
  return arr.reduce((promise, item) => {
    return promise
      .then((result) => ayncReducer(result, item))
  }, Promise.resolve(initial));
};
exports.arrayAsyncReduce = arrayAsyncReduce;

function isObjectorArray(o) {
    return o
      ? typeof o === 'object'
      : false;
}

function isObject(o) {
    return o
      ? typeof o === 'object' &&
        !(o instanceof Array)
      : false;
}

function filterObj(o, stripKeys) {
  if (isObject(o)) {
      for (const idx in stripKeys) {
          const key = stripKeys[idx];
          if (o[key]) {
              // console.log("deleting:", key, "from", o);
              delete o[key];
          }
      }
  }
  return o;
}

function recursiveFilterObj(o, stripKeys) {
    if (isObjectorArray(o)) {
        // console.log("recursiveFilterObj:", o);
        filterObj(o, stripKeys);
        for (const key in o) {
            const value = o[key];
            recursiveFilterObj(value, stripKeys);
        }
    }
    return o;
}
exports.recursiveFilterObj = recursiveFilterObj;

