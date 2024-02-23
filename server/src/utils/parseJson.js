const fs = require("fs");

const fileContent = fs.readFileSync(process.argv[2]);
const jsonDoc = JSON.parse(fileContent);
const stringDoc = JSON.stringify(jsonDoc, null, 1);
console.log("Parsed Json doc:", stringDoc);