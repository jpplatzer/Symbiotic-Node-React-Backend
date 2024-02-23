// Symbiotic device management CLI
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
const readline = require('readline');

function allHelp(cmds, resolve) {
  Object.keys(cmds).forEach(cmd => console.log(cmds[cmd].help));
  resolve(false);
}

function cmdHelp(cmds, resolve, parm, invalidParm = false) {
  const cmd = cmds[parm];
  if (cmd === undefined) {
    console.log("Undefined command");
    allHelp(cmds, resolve);
  }
  else {
    if (invalidParm) {
      console.log("Invalid command parameters")
    }
    console.log(cmds[parm].help);
    resolve(false);
  }
};

function procCmd(cmds, resolve, parms, validationFcn, procFcn, errCB, successCB, returnVal) {
  const slicedParms = parms.slice(1);
  const procCB = (err, val) => {
      if (err) {
        errCB(err);
      }
      else {
        successCB(val);
      }
      resolve(returnVal);
    };
  if (validationFcn(slicedParms)) {
    procFcn(...slicedParms, procCB);
  }
  else {
    cmdHelp(cmds, resolve, parms[0], true);
  }
}

function createParmCntValidation(minParms, maxParms) {
  return R.curry((parms) => (maxParms === undefined) ? parms.length == minParms :
    parms.length >= minParms  && parms.length <= maxParms);
}
exports.createParmCntValidation = createParmCntValidation;

function createCmdProc(validationFcn, procFcn,
  errCB = logErr, successCB = logSuccess, returnVal = false) {
  return R.curry(procCmd)(R.__, R.__, R.__,
    validationFcn, procFcn, errCB, successCB, returnVal);
}
exports.createCmdProc = createCmdProc;

function createCmdResponse(msg, procFcn) {
  return (val) => {
    const result = procFcn ? procFcn({ data: val }): val;
    console.log(msg, result);
  };
}
exports.createCmdResponse = createCmdResponse;

const procPromise = (promiseFcn) => {
  return function() {
    const lastArgIdx = arguments.length - 1;
    const CBFcn = arguments[lastArgIdx];
    const fcnArgs = [...arguments];
    fcnArgs.splice(lastArgIdx, 1);
    promiseFcn(...fcnArgs)
      .then((result) => CBFcn(null, result))
      .catch((err) => CBFcn(err));
  }
}
exports.procPromise = procPromise;

const JsonStringify = (val) => JSON.stringify(val, null, 1);
exports.JsonStringify = JsonStringify;

function createJsonResponse(msg) {
  return (doc) => {
    console.log(msg);
    logDoc(doc);
  }
}
exports.createJsonResponse = createJsonResponse;

function logErr(err) {
  console.log("Error:", err);
}
exports.logErr = logErr;

function logSuccess() {
  console.log("Success");
}
exports.logSuccess = logSuccess;

function logDoc(doc) {
  console.log(JSON.stringify(doc, null, 1));
}
exports.logDoc = logDoc;

function exitFcn(cmds, resolve) {
  resolve(true);
}
exports.exitFcn = exitFcn;

function runCli(cmds, exitCB) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter command or ? for help> '
  });

  function procLine(line) {
    return new Promise((resolve,reject) => {
      const parms = line.split(' ');
      if (parms[0] == '?') {
        if (parms.length < 2) {
          allHelp(cmds, resolve);
        }
        else {
          cmdHelp(cmds, resolve, parms[1]);
        }
      }
      else {
        const cmd = cmds[parms[0]];
        if (cmd !== undefined) {
              cmd.proc(cmds, resolve, parms);
        }
        else {
          cmdHelp(cmds, resolve, "");
        }
      }
    });
  };

  rl.prompt();

  rl.on('line', (line) => {
      procLine(line)
      .then((exiting) => {
        if (exiting) {
          rl.close();
        }
        else {
          rl.prompt();
        }
      });
    })
    .on('close', () => {
      console.log('Exiting');
      if (exitCB) {
        exitCB();
      }
    });
};
exports.runCli = runCli;
