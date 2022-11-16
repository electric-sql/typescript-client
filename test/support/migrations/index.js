export const data = {
  "migrations": [
    {
      "body": [
        "-- The ops log table\nCREATE TABLE IF NOT EXISTS _electric_oplog (\n  rowid INTEGER PRIMARY KEY AUTOINCREMENT,\n  namespace String NOT NULL,\n  tablename String NOT NULL,\n  optype String NOT NULL,\n  primaryKey String NOT NULL,\n  newRow String,\n  oldRow String,\n  timestamp TEXT\n);",
        "-- Somewhere to keep our metadata\nCREATE TABLE IF NOT EXISTS _electric_meta (\n  key TEXT PRIMARY KEY,\n  value BLOB\n);",
        "-- Somewhere to track migrations\nCREATE TABLE IF NOT EXISTS _electric_migrations (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL UNIQUE,\n  sha256 TEXT NOT NULL,\n  applied_at TEXT NOT NULL\n);",
        "-- Initialisation of the metadata table\nINSERT INTO _electric_meta (key, value) VALUES ('compensations', 0), ('lastAckdRowId','0'), ('lastSentRowId', '0'), ('lsn', 'AAAAAA=='), ('clientId', '');",
        "-- These are toggles for turning the triggers on and off\nDROP TABLE IF EXISTS _electric_trigger_settings;",
        "CREATE TABLE _electric_trigger_settings(tablename STRING PRIMARY KEY, flag INTEGER);"
      ],
      "encoding": "escaped",
      "name": "1666287419_init",
      "sha256": "882b55049d6579c1c66fab25605429a153f9e1af39c634d60041c1afd4696fab",
      "title": "init"
    },
    {
      "body": [
        "CREATE TABLE IF NOT EXISTS main.items (\n  value TEXT PRIMARY KEY\n);",
        "CREATE TABLE IF NOT EXISTS main.parent (\n  id INTEGER PRIMARY KEY,\n  value TEXT,\n  otherValue INTEGER DEFAULT 0\n);",
        "CREATE TABLE IF NOT EXISTS main.child (\n  id INTEGER PRIMARY KEY,\n  parent INTEGER NOT NULL,\n  FOREIGN KEY(parent) REFERENCES parent(id)\n);",
        "-- These are toggles for turning the triggers on and off\nDROP TABLE IF EXISTS _electric_trigger_settings;",
        "CREATE TABLE _electric_trigger_settings(tablename STRING PRIMARY KEY, flag INTEGER);",
        "INSERT INTO _electric_trigger_settings(tablename,flag) VALUES ('main.child', 1);",
        "INSERT INTO _electric_trigger_settings(tablename,flag) VALUES ('main.items', 1);",
        "INSERT INTO _electric_trigger_settings(tablename,flag) VALUES ('main.parent', 1);",
        "-- Ensures primary key is immutable\nDROP TRIGGER IF EXISTS update_ensure_main_child_primarykey;",
        "CREATE TRIGGER update_ensure_main_child_primarykey\n   BEFORE UPDATE ON main.child\nBEGIN\n  SELECT\n    CASE\n      WHEN old.id != new.id THEN\n        RAISE (ABORT,'cannot change the value of column id as it belongs to the primary key')\n    END;\nEND;",
        "-- Triggers that add INSERT, UPDATE, DELETE operation to the _opslog table\n\nDROP TRIGGER IF EXISTS insert_main_child_into_oplog;",
        "CREATE TRIGGER insert_main_child_into_oplog\n   AFTER INSERT ON main.child\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.child')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'child', 'INSERT', json_object('id', new.id), json_object('id', new.id, 'parent', new.parent), NULL, NULL);\nEND;",
        "DROP TRIGGER IF EXISTS update_main_child_into_oplog;",
        "CREATE TRIGGER update_main_child_into_oplog\n   AFTER UPDATE ON main.child\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.child')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'child', 'UPDATE', json_object('id', new.id), json_object('id', new.id, 'parent', new.parent), json_object('id', old.id, 'parent', old.parent), NULL);\nEND;",
        "DROP TRIGGER IF EXISTS delete_main_child_into_oplog;",
        "CREATE TRIGGER delete_main_child_into_oplog\n   AFTER DELETE ON main.child\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.child')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'child', 'DELETE', json_object('id', old.id), NULL, json_object('id', old.id, 'parent', old.parent), NULL);\nEND;",
        "-- Triggers for foreign key compensations\n\nDROP TRIGGER IF EXISTS compensation_insert_main_child_parent_into_oplog;",
        "CREATE TRIGGER compensation_insert_main_child_parent_into_oplog\n   AFTER INSERT ON main.child\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.parent') AND\n        1 == (SELECT value from _electric_meta WHERE key == 'compensations')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  SELECT 'main', 'parent', 'UPDATE', json_object('id', id), json_object('id', id, 'value', value, 'otherValue', otherValue), NULL, NULL\n  FROM main.parent WHERE id = new.parent;\nEND;",
        "DROP TRIGGER IF EXISTS compensation_update_main_child_parent_into_oplog;",
        "CREATE TRIGGER compensation_update_main_child_parent_into_oplog\n   AFTER UPDATE ON main.child\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.parent') AND\n        1 == (SELECT value from _electric_meta WHERE key == 'compensations')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  SELECT 'main', 'parent', 'UPDATE', json_object('id', id), json_object('id', id, 'value', value, 'otherValue', otherValue), NULL, NULL\n  FROM main.parent WHERE id = new.parent;\nEND;",
        "-- Ensures primary key is immutable\nDROP TRIGGER IF EXISTS update_ensure_main_items_primarykey;",
        "CREATE TRIGGER update_ensure_main_items_primarykey\n   BEFORE UPDATE ON main.items\nBEGIN\n  SELECT\n    CASE\n      WHEN old.value != new.value THEN\n        RAISE (ABORT,'cannot change the value of column value as it belongs to the primary key')\n    END;\nEND;",
        "-- Triggers that add INSERT, UPDATE, DELETE operation to the _opslog table\n\nDROP TRIGGER IF EXISTS insert_main_items_into_oplog;",
        "CREATE TRIGGER insert_main_items_into_oplog\n   AFTER INSERT ON main.items\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.items')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'items', 'INSERT', json_object('value', new.value), json_object('value', new.value), NULL, NULL);\nEND;",
        "DROP TRIGGER IF EXISTS update_main_items_into_oplog;",
        "CREATE TRIGGER update_main_items_into_oplog\n   AFTER UPDATE ON main.items\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.items')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'items', 'UPDATE', json_object('value', new.value), json_object('value', new.value), json_object('value', old.value), NULL);\nEND;",
        "DROP TRIGGER IF EXISTS delete_main_items_into_oplog;",
        "CREATE TRIGGER delete_main_items_into_oplog\n   AFTER DELETE ON main.items\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.items')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'items', 'DELETE', json_object('value', old.value), NULL, json_object('value', old.value), NULL);\nEND;",
        "-- Ensures primary key is immutable\nDROP TRIGGER IF EXISTS update_ensure_main_parent_primarykey;",
        "CREATE TRIGGER update_ensure_main_parent_primarykey\n   BEFORE UPDATE ON main.parent\nBEGIN\n  SELECT\n    CASE\n      WHEN old.id != new.id THEN\n        RAISE (ABORT,'cannot change the value of column id as it belongs to the primary key')\n    END;\nEND;",
        "-- Triggers that add INSERT, UPDATE, DELETE operation to the _opslog table\n\nDROP TRIGGER IF EXISTS insert_main_parent_into_oplog;",
        "CREATE TRIGGER insert_main_parent_into_oplog\n   AFTER INSERT ON main.parent\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.parent')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'parent', 'INSERT', json_object('id', new.id), json_object('id', new.id, 'value', new.value, 'otherValue', new.otherValue), NULL, NULL);\nEND;",
        "DROP TRIGGER IF EXISTS update_main_parent_into_oplog;",
        "CREATE TRIGGER update_main_parent_into_oplog\n   AFTER UPDATE ON main.parent\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.parent')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'parent', 'UPDATE', json_object('id', new.id), json_object('id', new.id, 'value', new.value, 'otherValue', new.otherValue), json_object('id', old.id, 'value', old.value, 'otherValue', old.otherValue), NULL);\nEND;",
        "DROP TRIGGER IF EXISTS delete_main_parent_into_oplog;",
        "CREATE TRIGGER delete_main_parent_into_oplog\n   AFTER DELETE ON main.parent\n   WHEN 1 == (SELECT flag from _electric_trigger_settings WHERE tablename == 'main.parent')\nBEGIN\n  INSERT INTO _electric_oplog (namespace, tablename, optype, primaryKey, newRow, oldRow, timestamp)\n  VALUES ('main', 'parent', 'DELETE', json_object('id', old.id), NULL, json_object('id', old.id, 'value', old.value, 'otherValue', old.otherValue), NULL);\nEND;"
      ],
      "encoding": "escaped",
      "name": "1666287449_test_schema",
      "sha256": "1f92fe49241a0f270bf61bfcbbe0e1b84f3727011d743ede4e7802c3c3289d81",
      "title": "test_schema"
    }
  ]
}
