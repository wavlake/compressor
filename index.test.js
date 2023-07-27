const index = require("./index");
const fs = require("fs");

test("Runs function handler", async () => {
  let eventFile = fs.readFileSync("event.json");
  let event = JSON.parse(eventFile);
  let response = await index.handler(event, "");
  expect(JSON.stringify(response)).toEqual('"compressor success"');
});
