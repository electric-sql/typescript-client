import {
  Database as AbsurdSQLDatabase,
  ElectricDatabase as AbsurdSQLElectricDatabase,
} from './absurd-sql/database'

import { Database as BetterSQLite3Database } from './better-sqlite3/database'

import { Database as CordovaSQLiteStorageDatabase } from './cordova-sqlite-storage/database'

import { Database as ExpoSQLiteDatabase } from './expo-sqlite/database'

import { Database as WASQLiteDatabase } from './wa-sqlite/database'

import { Database as ReactNativeSQLiteStorageDatabase } from './react-native-sqlite-storage/database'

export type AnyDatabase =
  | AbsurdSQLDatabase
  | BetterSQLite3Database
  | CordovaSQLiteStorageDatabase
  | ExpoSQLiteDatabase
  | ReactNativeSQLiteStorageDatabase
  | WASQLiteDatabase

export type AnyWorkerThreadElectricDatabase = AbsurdSQLElectricDatabase
