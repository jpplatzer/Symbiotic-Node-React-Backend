// AWS s3 storage operations
// Copyright 2018 Jeff Platzer. All rights reserved.

const AWS = require('aws-sdk');
const fs = require('fs');

// Create S3 service object
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

function putStoredFile(loc, filePath, storePath) {
  const fstream = fs.createReadStream(filePath);
  const params = { Bucket: loc, Key: storePath, Body: fstream };
  return s3.upload(params).promise();
}
exports.putStoredFile = putStoredFile;

function sendStoredFile(loc, storePath, res) {
  const fileStream = s3.getObject({
    Bucket: loc,
    Key: storePath,
  }).createReadStream();
  res.status(200);
  res.type('application/binary');
  fileStream.pipe(res);
}
exports.sendStoredFile = sendStoredFile;

