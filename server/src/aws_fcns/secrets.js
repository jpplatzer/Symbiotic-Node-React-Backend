// AWS Secrets Manager functions
// Copyright 2018 Jeff Platzer. All rights reserved.

var AWS = require('aws-sdk');

function createSecretsManager(config) {
  const client = new AWS.SecretsManager({ region: config.app.region });
  const getSecret = (name) =>
    client.getSecretValue({ SecretId: name }).promise()
      .then((obj) => {
        const secretSting = obj.SecretString;
        const secretObj = JSON.parse(secretSting);
        const secretValue = secretObj.secret;
        // console.log("getSecret", secretSting, secretObj, secretValue);
        return Promise.resolve(secretValue);
      });
  const secretsManager = {
    client,
    getSecret,
  };
  return secretsManager;
};
exports.createSecretsManager = createSecretsManager;