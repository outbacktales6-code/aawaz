import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export const getDBConnection = async () => {
  return SQLite.openDatabase({name: 'awaaz-mesh.db', location: 'default'});
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
    message.sender_name,
    message.content,
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
    row.reactions = JSON.parse(row.reactions || '{}');
    row.is_sos = row.is_sos === 1;
    messages.push(row);
  }
  return messages;
};

export const deleteOldMessages = async (db) => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const query = `DELETE FROM messages WHERE timestamp < ?`;
  await db.executeSql(query, [oneDayAgo]);
};
