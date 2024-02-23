// Symbiotic web simple, stupid key manager.
// Simple and stupic because that's what I'm looking for and I couldn't find one I like
// Copyright 2017 Jeff Platzer. All rights reserved.

const crypto = require('crypto');
const fs = require('fs');

const cipherType = 'aes256';
const textCoding = 'base64';
const padKeyName = 'sskm_pad';

const load = function(masterKey, keyFilepath) {
  const encText = fs.readFileSync(keyFilepath);
  // console.log('Loaded enc text:', encText.toString());
  const decipher = crypto.createDecipher(cipherType, masterKey);
  let decrypted = decipher.update(encText.toString(), textCoding, 'utf8');
  decrypted += decipher.final('utf8');
  let obj = JSON.parse(decrypted.toString());
  delete obj[padKeyName];
  return obj;
};
exports.load = load;

const save = function(masterKey, keyFilepath, keys) {
  keys[padKeyName] = crypto.randomBytes(32).toString('hex')
  const clearText = JSON.stringify(keys);
  delete keys[padKeyName];
  const cipher = crypto.createCipher(cipherType, masterKey);
  let encrypted = cipher.update(clearText, 'utf8', textCoding);
  encrypted += cipher.final(textCoding);
  // console.log('Saving enc text:', encrypted.toString());
  fs.writeFileSync(keyFilepath, encrypted.toString());
};
exports.save = save;

function createSecretsManager(config) {
  const keys = load(config.secrets.masterKey, config.secrets.keyFilepath);
  const secretsManager = {
    keys,
    getSecret: (name) => keys[name]
      ? Promise.resolve(keys[name])
      : Promise.reject("InvalidKey"),
  };
  return secretsManager;
}
exports.createSecretsManager = createSecretsManager;
