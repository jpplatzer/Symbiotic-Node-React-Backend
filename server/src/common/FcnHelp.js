const R = require('ramda');

exports.chain = R.curry((f, container) => container.chain(f));

exports.map = R.curry((f, container) => container.map(f));

exports.value = (c) => c.value;

exports.then = R.curry((f, thenable) => thenable.then(f));

exports.mapP = (fcn) => (value) => Promise.resolve(fcn(value));

exports.catchP = R.curry((f, catchable) => catchable.catch(f));

exports.eitherToPromise = (e) => e.isRight ? Promise.resolve(e.value) :  Promise.reject(e.value);

exports.logValueFcn = (msg, fcn) => (value) => {
  const unused = fcn ? console.log(msg, fcn(value)) : console.log(msg);
  return value;
}

exports.valuesOfType = (typeStr, xformFcn) => (value) => {
  const keys = [];
  const xformedValue = xformFcn ? xformFcn(value) : value;
  for (const key in xformedValue) {
    const val = xformedValue[key];
    if (val !== null && val !== undefined && typeof val === typeStr) {
      keys.push(key);
    }
  }
  return keys;
}
