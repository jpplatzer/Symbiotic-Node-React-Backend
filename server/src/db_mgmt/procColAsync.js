// Process collections using async functions
// Copyright 2018 Jeff Platzer. All rights reserved.


function* colGen(collection) {
  for (const item of collection) {
    yield item;
  }
}

function procColItem(colIter, procFcn, accum, completeCB) {
  const result = colIter.next();
  if (!result.done) {
    const procCompleteCB = (err, accum) => {
      if (err) {
        completeCB(err);
      }
      else {
        procColItem(colIter, procFcn, accum, completeCB);
      }
    }
    procFcn(result.value, accum, procCompleteCB);
  }
  else {
    completeCB(null, accum);
  }
}

function procCollectionAsync(col, procFcn, accum, completeCB) {
  const colIter = colGen(col);
  procColItem(colIter, procFcn, accum, completeCB);
}
exports.procCollectionAsync = procCollectionAsync;

function createFcnChainCollection() {
  const collection = [];
  fcnChain = {
    collection,
    then: (f) => {
      collection.push(f);
      return fcnChain;
    }
  };
  return fcnChain;
}
exports.createFcnChainCollection = createFcnChainCollection;

function createFcnCollectionProcFcn(fcnChainCollection) {
  return (item, accum, procCompleteCB) => {
    const completeCb = (err, ignore) => {
      if (err) {
        procCompleteCB(err);
      }
      else {
        procCompleteCB(null, accum);
      }
    };
    const procFcn =  (fcn, ignore, doneCB) => fcn(item, doneCB);
    procCollectionAsync(fcnChainCollection, procFcn, accum, completeCb);
  }
}
exports.createFcnCollectionProcFcn = createFcnCollectionProcFcn;
