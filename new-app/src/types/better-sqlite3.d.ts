declare module 'better-sqlite3' {
    export interface RunResult {
        changes: number;
        lastInsertRowid: number | bigint;
    }

    export type SqliteValue = string | number | Buffer | null | bigint;
    export type ParamsObject = Record<string, SqliteValue>;
    export type ParamsArray = SqliteValue[];

    export interface Database {
        exec(sql: string): void;
        prepare<T = unknown>(sql: string): Statement<T>;
        transaction<T extends (...args: unknown[]) => unknown>(fn: T): T;
        close(): void;
    }

    export interface Statement<T> {
        run(...params: ParamsArray | [ParamsObject]): RunResult;
        get(...params: ParamsArray | [ParamsObject]): T;
        all(...params: ParamsArray | [ParamsObject]): T[];
    }

    interface DatabaseConstructor {
        new(path: string): Database;
        (path: string): Database;
    }

    const Database: DatabaseConstructor;
    export default Database;
}