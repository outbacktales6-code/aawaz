import SQLite from 'react-native-sqlite-storage';
const CryptoJS = require('crypto-js');

const SECRET_KEY = 'awaaz_mesh_secure_vault_2026_x!92';

const encrypt = (text) => CryptoJS.AES.encrypt(text || '', SECRET_KEY).toString();
const decrypt = (cipher) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher || '', SECRET_KEY);
    if (!bytes) return '*** Encrypted ***';
    const text = bytes.toString(CryptoJS.enc.Utf8);
    return text || '*** Encrypted ***';
  } catch (e) {
    return '*** Encrypted ***';
  }
};

export const getDBConnection = async () => {
  SQLite.enablePromise(true);
  return SQLite.openDatabase({name: 'awaaz-mesh.db', location: 'default'});
};

export const deleteOldMessages = async (db) => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const query = `DELETE FROM messages WHERE timestamp < ?`;
  await db.executeSql(query, [oneDayAgo]);
};

export const createTables = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        sender_name TEXT,
        content TEXT,
        timestamp INTEGER,
        is_sos INTEGER DEFAULT 0,
        reactions TEXT,
        reply_to_id TEXT
    );
  `;
  await db.executeSql(query);
  await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);`);
  await deleteOldMessages(db);
};

export const wipeDatabase = async (db) => {
  await db.executeSql(`DROP TABLE IF EXISTS messages;`);
  await createTables(db);
};

export const saveMessage = async (db, message) => {
  const insertQuery = `
    INSERT OR IGNORE INTO messages 
    (id, sender_id, sender_name, content, timestamp, is_sos, reactions, reply_to_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    message.id,
    message.sender_id,
    encrypt(message.sender_name),
    encrypt(message.content),
    message.timestamp,
    message.is_sos ? 1 : 0,
    JSON.stringify(message.reactions || {}),
    message.reply_to_id || null
  ];
  const [results] = await db.executeSql(insertQuery, params);
  return results.rowsAffected > 0; // true if new message (not duplicate)
};

export const getMessages = async (db, limit = 50, offset = 0) => {
  const query = `SELECT * FROM messages ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
  const [results] = await db.executeSql(query, [limit, offset]);
  let messages = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    row.sender_name = decrypt(row.sender_name);
    row.content = decrypt(row.content);
    row.reactions = JSON.parse(row.reactions || '{}');
    row.is_sos = row.is_sos === 1;
    messages.push(row);
  }
  return messages;
};

