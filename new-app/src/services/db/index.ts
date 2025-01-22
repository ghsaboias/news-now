import Database, { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

interface DBTopic {
    id: string;
    name: string;
    created_at?: string;  // Optional as it's auto-generated
}

interface DBSource {
    id: string;
    platform: 'telegram' | 'x';
    handle: string;
    first_seen_at: string;
    last_seen_at: string;
}

interface DBMessage {
    id: string;
    topic_id: string;
    source_id: string;
    content: string;
    embed_title?: string;
    embed_description?: string;
    timestamp: string;
    created_at?: string;  // Optional as it's auto-generated
}

interface DBMessageField {
    message_id: string;
    name: string;
    value: string;
}

export class DatabaseService {
    private db: DatabaseType;

    constructor(dbPath?: string) {
        const finalPath = dbPath || path.join(
            process.env.DATA_DIR || process.cwd(),
            'news.db'
        );

        // Create directory if it doesn't exist
        const dir = path.dirname(finalPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(finalPath);
    }

    initialize(): void {
        // Create tables if they don't exist
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sources (
                id TEXT PRIMARY KEY,
                platform TEXT CHECK(platform IN ('telegram', 'x')) NOT NULL,
                handle TEXT NOT NULL,
                first_seen_at TIMESTAMP NOT NULL,
                last_seen_at TIMESTAMP NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                source_id TEXT NOT NULL,
                content TEXT NOT NULL,
                embed_title TEXT,
                embed_description TEXT,
                timestamp TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (topic_id) REFERENCES topics(id),
                FOREIGN KEY (source_id) REFERENCES sources(id)
            );

            CREATE TABLE IF NOT EXISTS message_fields (
                message_id TEXT NOT NULL,
                name TEXT NOT NULL,
                value TEXT NOT NULL,
                FOREIGN KEY (message_id) REFERENCES messages(id)
            );
        `);
    }

    // Topic operations
    insertTopic(topic: DBTopic): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO topics (id, name)
            VALUES (@id, @name)
        `);
        stmt.run(topic);
    }

    getTopicById(id: string): DBTopic | undefined {
        const stmt = this.db.prepare('SELECT * FROM topics WHERE id = ?');
        return stmt.get(id) as DBTopic | undefined;
    }

    getTopicByName(name: string): DBTopic | undefined {
        const stmt = this.db.prepare('SELECT * FROM topics WHERE name = ?');
        return stmt.get(name) as DBTopic | undefined;
    }

    getAllTopics(): DBTopic[] {
        const stmt = this.db.prepare('SELECT * FROM topics ORDER BY created_at DESC');
        return stmt.all() as DBTopic[];
    }

    // Source operations
    insertSource(source: DBSource): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO sources (id, platform, handle, first_seen_at, last_seen_at)
            VALUES (@id, @platform, @handle, @first_seen_at, @last_seen_at)
        `);
        stmt.run(source);
    }

    getSourceByHandle(platform: 'telegram' | 'x', handle: string): DBSource | undefined {
        const stmt = this.db.prepare('SELECT * FROM sources WHERE platform = ? AND handle = ?');
        return stmt.get(platform, handle) as DBSource | undefined;
    }

    // Message operations
    insertMessage(message: DBMessage, fields: DBMessageField[] = []): void {
        const insertMessage = this.db.prepare(`
            INSERT INTO messages (id, topic_id, source_id, content, embed_title, embed_description, timestamp)
            VALUES (@id, @topic_id, @source_id, @content, @embed_title, @embed_description, @timestamp)
        `);

        const insertField = this.db.prepare(`
            INSERT INTO message_fields (message_id, name, value)
            VALUES (@message_id, @name, @value)
        `);

        // Use a transaction to ensure all inserts succeed or none do
        const transaction = this.db.transaction((message: DBMessage, fields: DBMessageField[]) => {
            insertMessage.run(message);
            for (const field of fields) {
                insertField.run(field);
            }
        });

        transaction(message, fields);
    }

    getMessagesByTopic(topicId: string, limit = 100): DBMessage[] {
        const stmt = this.db.prepare(`
            SELECT * FROM messages 
            WHERE topic_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `);
        return stmt.all(topicId, limit) as DBMessage[];
    }

    getMessageFields(messageId: string): DBMessageField[] {
        const stmt = this.db.prepare('SELECT * FROM message_fields WHERE message_id = ?');
        return stmt.all(messageId) as DBMessageField[];
    }

    close(): void {
        this.db.close();
    }
} 