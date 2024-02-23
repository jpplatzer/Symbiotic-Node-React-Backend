// Create test decription object for Lynis tests
// Copyright 2018 Jeff Platzer. All rights reserved.

const fs = require('fs');
const path = require('path');

const testDescFile = 'testDescriptions.json';

if (process.argv.length < 3) {
  console.log("The test directory path must be the first command line argument");
}

const testDir = process.argv[2];

function proceTestDir() {
  fs.readdir(testDir, (err, files) => {
    if (err) {
      console.log("Failure reading directory:", testDir, err);
    }
    else {
      procTestFiles(files);
    }
  });
}

function procTestFiles(files) {
  console.log("Files:", files);
  testFilesProcPromises = files.reduce(testFilesProcPromisesReducer, []);
  Promise.all(testFilesProcPromises)
    .then((testDescResults) => {
      const mergeDocsReducer = (acc, doc) => Object.assign(acc, doc);
      const testDoc = testDescResults.reduce(mergeDocsReducer, {});
      fs.writeFile(testDescFile, JSON.stringify(testDoc, null, ' '), (err) => {
        if (err) throw (err);
        console.log("Wrote test description document:", testDescFile);
      });
    })
    .catch((err) => {
      console.log("Error processing test description files:", err);
    });
}

function testFilesProcPromisesReducer(acc, filename) {
  if (filename.startsWith("tests")) {
    const filepath = path.join(testDir, filename);
    acc.push(procTestFileDescPromise(filepath));
  }
  return acc;
}

function procTestFileDescPromise(filepath) {
  return new Promise((resolve,reject) => {
    fs.readFile(filepath, (err, data) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(procTestFileDescData(data));
      }
    });
  });
}

function procTestFileDescData(data) {
  const registerStr = 'Register';
  const testNoStr = '--test-no';
  const descriptionStr = '--description';
  const reducer = (acc, line) => {
    if (line.includes(registerStr)) {
      const vals = line.match(/\S+/g);
      const testNoIdx = vals.indexOf(testNoStr) + 1;
      const descIdx = vals.indexOf(descriptionStr) + 1;
      if (testNoIdx > 0 && testNoIdx < vals.length &&
          descIdx > 0 && descIdx < vals.length) {
        let testNo = vals[testNoIdx];
        testNo = testNo.charAt(0) == '"' ? testNo.substr(1, testNo.length - 2) : testNo;
        const beginIdx = line.indexOf(vals[descIdx]) + 1;
        const endIdx = line.indexOf('"', beginIdx);
        acc[testNo] = line.substr(beginIdx, endIdx - beginIdx);
      }
    }
    return acc;
  };
  return data
    .toString()
    .split("\n")
    .reduce(reducer, {});
}

proceTestDir();
