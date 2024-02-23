
function repeatFunction() {
  console.log("Minute tick");
  setTimeout(repeatFunction, 60000);
}


repeatFunction();