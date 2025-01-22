declare module 'better-sqlite3' {
    export interface Database {
        exec(sql: string): void;
        prepare<T = unknown>(sql: string): Statement<T>;
        transaction<T extends Function>(fn: T): T;
        close(): void;
    }

    export interface Statement<T> {
        run(...params: any[]): any;
        get(...params: any[]): T;
        all(...params: any[]): T[];
    }

    interface DatabaseConstructor {
        new(path: string): Database;
        (path: string): Database;
    }

    const Database: DatabaseConstructor;
    export default Database;
}