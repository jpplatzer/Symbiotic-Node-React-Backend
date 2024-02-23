// Commnon functionality shared between the client and server
// Copyright 2018 Jeff Platzer. All rights reserved.

exports.deviceIdFields(deviceId) {
  const entities = deviceId.split('|');
  return entities == 3 ? {
    group: entities[0],
    subgroup: entities[1],
    id: entities[2],
  } : null;
}