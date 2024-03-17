import DB from './DB.js';
const db = new DB('word-types.db');

async function insertRow(payload) {
  await db.insert(payload);
}

const payload = {"word":"villians","types":["Darth Vader","Hitler"]}

insertRow(payload);

const currentRows = await db.find({});
console.log(currentRows);


