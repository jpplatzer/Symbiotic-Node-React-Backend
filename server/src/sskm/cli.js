const sskm = require('./index');
const readline = require('readline');

function runCli() {
  let exiting = false;
  let modified = false;
  let keys = {};
  const cmds = {
    load: {proc: loadFcn, help: loadHelp},
    save: {proc: saveFcn, help: saveHelp},
    show: {proc: showFcn, help: showHelp},
    set: {proc: setFcn, help: setHelp},
    rm: {proc: rmFcn, help: rmHelp},
    exit: {proc: exitFcn, help: exitHelp}
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter command or ? for help> '
  });

  function loadFcn(parms) {
    if (parms.length == 3) {
      keys = sskm.load(parms[1], parms[2]);
      console.log("Keys loaded");
    }
    else {
      cmdHelp(parms[0]);
    }
  }

  function loadHelp() {
    console.log("load <masterKey> <keyFilepath>");
  }

  function saveFcn(parms) {
    if (parms.length == 3) {
      sskm.save(parms[1], parms[2], keys);
      modified = false;
      console.log("Keys saved");
    }
    else {
      cmdHelp(parms[0]);
    }
  }

  function saveHelp() {
    console.log("save <masterKey> <keyFilepath>");
  }

  function showFcn(parms) {
    console.log("Keys:\n", keys);
  }

  function showHelp() {
    console.log("show");
  }

  function setFcn(parms) {
    if (parms.length == 3) {
      keys[parms[1]] = parms[2];
      modified = true;
      console.log("Keys set");
    }
    else {
      cmdHelp(parms[0]);
    }
  }

  function setHelp() {
    console.log("set <keyName> <value>");
  }

  function rmFcn(parms) {
    if (parms.length == 2) {
      delete keys[parms[1]];
      modified = true;
      console.log("Keys removed");
    }
    else {
      cmdHelp(parms[0]);
    }
  }

  function rmHelp() {
    console.log("rm <keyName>");
  }

  function exitFcn(parms) {
    exiting = !modified;
    if (modified) {
      if (parms[1] == "force") {
        exiting = true;
      }
      else {
        console.log('Keys modified. Either save or use "exit force" to force exit');
      }
    }
  }

  function exitHelp() {
    console.log("exit [force]");
  }

  function allHelp() {
    Object.keys(cmds).forEach(cmd => cmds[cmd].help());
  }

  function cmdHelp(parm, invalidParm = false) {
    const cmd = cmds[parm];
    if (cmd === undefined) {
      console.log("Undefined command");
      allHelp();
    }
    else {
      if (invalidParm) {
        console.log("Invalid command parameters")
      }
      cmd.help();
    }
  };

  rl.prompt();

  rl.on('line', (line) => {
    const parms = line.split(' ');
    if (parms[0] == '?') {
      if (parms.length < 2) {
        allHelp();
      }
      else {
        cmdHelp(parms[1]);
      }
    }
    else {
      const cmd = cmds[parms[0]];
      if (cmd !== undefined) {
        cmd.proc(parms);
      }
      else {
        cmdHelp("");
      }
    }
    if (exiting) {
      rl.close();
    }
    else {
      rl.prompt();
    }
  }).on('close', () => {
    console.log('Exiting');
  });
}

runCli();


