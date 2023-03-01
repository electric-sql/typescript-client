declare module 'wa-sqlite/dist/wa-sqlite-async.mjs' {
  function ModuleFactory(config?: object): Promise<any>
  export = ModuleFactory
}

declare interface VFSOptions {
  durability: 'default' | 'strict' | 'relaxed'
  purge: 'deferred' | 'manual'
  purgeAtLeast: number
}

declare module 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js' {
  interface IDBBatchAtomicVFS extends SQLiteVFS {
    // dummy field needed to avoid that ESLint complains about:
    //   An interface declaring no members is equivalent to its supertype.(@typescript-eslint/no-empty-interface)
    _shutup_ts: never
  }
  export class IDBBatchAtomicVFS {
    constructor(idbDatabaseName: string, options?: VFSOptions)
  }
}
