import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../index';

describe('DatabaseService', () => {
    let db: DatabaseService;
    const TEST_DB_PATH = path.join(process.cwd(), 'data/test.db');

    beforeEach(() => {
        // Remove test database if it exists
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
        db = new DatabaseService(TEST_DB_PATH);
        db.initialize();
    });

    afterEach(() => {
        db.close();
        // Clean up test database
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    describe('Topic Management', () => {
        it('should insert and retrieve a topic', () => {
            const topic = {
                id: uuidv4(),
                name: 'test-topic'
            };

            db.insertTopic(topic);
            const retrieved = db.getTopicById(topic.id);

            expect(retrieved?.id).toBe(topic.id);
            expect(retrieved?.name).toBe(topic.name);
        });

        it('should retrieve topic by name', () => {
            const topic = {
                id: uuidv4(),
                name: 'test-topic'
            };

            db.insertTopic(topic);
            const retrieved = db.getTopicByName(topic.name);

            expect(retrieved?.id).toBe(topic.id);
        });

        it('should list all topics', () => {
            const topics = [
                { id: uuidv4(), name: 'topic-1' },
                { id: uuidv4(), name: 'topic-2' },
                { id: uuidv4(), name: 'topic-3' }
            ];

            topics.forEach(topic => db.insertTopic(topic));
            const retrieved = db.getAllTopics();

            expect(retrieved.length).toBe(topics.length);
            topics.forEach(topic => {
                expect(retrieved.some(t => t.id === topic.id)).toBe(true);
            });
        });

        it('should update existing topic', () => {
            const topic = {
                id: uuidv4(),
                name: 'old-name'
            };

            const updated = {
                ...topic,
                name: 'new-name'
            };

            db.insertTopic(topic);
            db.insertTopic(updated);

            const retrieved = db.getTopicById(topic.id);
            expect(retrieved?.name).toBe(updated.name);
        });
    });

    describe('Source Management', () => {
        it('should insert and retrieve a source', () => {
            const source = {
                id: uuidv4(),
                platform: 'telegram' as const,
                handle: 'test_channel',
                first_seen_at: '2024-01-20T10:00:00Z',
                last_seen_at: '2024-01-20T10:00:00Z'
            };

            db.insertSource(source);
            const retrieved = db.getSourceByHandle('telegram', 'test_channel');

            expect(retrieved).toEqual(source);
        });

        it('should update existing source', () => {
            const sourceId = uuidv4();
            const initialSource = {
                id: sourceId,
                platform: 'telegram' as const,
                handle: 'test_channel',
                first_seen_at: '2024-01-20T10:00:00Z',
                last_seen_at: '2024-01-20T10:00:00Z'
            };

            const updatedSource = {
                ...initialSource,
                last_seen_at: '2024-01-21T10:00:00Z'
            };

            db.insertSource(initialSource);
            db.insertSource(updatedSource);

            const retrieved = db.getSourceByHandle('telegram', 'test_channel');
            expect(retrieved?.last_seen_at).toBe(updatedSource.last_seen_at);
        });

        it('should handle non-existent sources', () => {
            const result = db.getSourceByHandle('telegram', 'non_existent');
            expect(result).toBeUndefined();
        });

        it('should maintain first_seen_at on updates', () => {
            const sourceId = uuidv4();
            const initialSource = {
                id: sourceId,
                platform: 'telegram' as const,
                handle: 'test_channel',
                first_seen_at: '2024-01-20T10:00:00Z',
                last_seen_at: '2024-01-20T10:00:00Z'
            };

            const updatedSource = {
                ...initialSource,
                last_seen_at: '2024-01-21T10:00:00Z'
            };

            db.insertSource(initialSource);
            db.insertSource(updatedSource);

            const retrieved = db.getSourceByHandle('telegram', 'test_channel');
            expect(retrieved?.first_seen_at).toBe(initialSource.first_seen_at);
        });
    });

    describe('Message Management', () => {
        let topicId: string;
        let sourceId: string;

        beforeEach(() => {
            // Set up a topic and source for message tests
            topicId = uuidv4();
            sourceId = uuidv4();

            db.insertTopic({
                id: topicId,
                name: 'test-topic'
            });

            db.insertSource({
                id: sourceId,
                platform: 'telegram',
                handle: 'test_channel',
                first_seen_at: '2024-01-20T10:00:00Z',
                last_seen_at: '2024-01-20T10:00:00Z'
            });
        });

        it('should insert and retrieve a message', () => {
            const message = {
                id: uuidv4(),
                topic_id: topicId,
                source_id: sourceId,
                content: 'Test content',
                embed_title: 'Test title',
                embed_description: 'Test description',
                timestamp: '2024-01-20T10:00:00Z'
            };

            const fields = [
                { message_id: message.id, name: 'field1', value: 'value1' },
                { message_id: message.id, name: 'field2', value: 'value2' }
            ];

            db.insertMessage(message, fields);

            const messages = db.getMessagesByTopic(topicId);
            expect(messages.length).toBe(1);
            const { created_at, ...messageWithoutCreatedAt } = messages[0];
            expect(messageWithoutCreatedAt).toEqual(message);

            const retrievedFields = db.getMessageFields(message.id);
            expect(retrievedFields).toEqual(fields);
        });

        it('should handle messages without fields', () => {
            const message = {
                id: uuidv4(),
                topic_id: topicId,
                source_id: sourceId,
                content: 'Test content',
                embed_title: '',
                embed_description: '',
                timestamp: '2024-01-20T10:00:00Z'
            };

            db.insertMessage(message);

            const messages = db.getMessagesByTopic(topicId);
            expect(messages.length).toBe(1);
            const { created_at, ...messageWithoutCreatedAt } = messages[0];
            expect(messageWithoutCreatedAt).toEqual(message);

            const fields = db.getMessageFields(message.id);
            expect(fields.length).toBe(0);
        });

        it('should respect message limit in queries', () => {
            const messages = Array.from({ length: 5 }, (_, i) => ({
                id: uuidv4(),
                topic_id: topicId,
                source_id: sourceId,
                content: `Content ${i}`,
                embed_title: '',
                embed_description: '',
                timestamp: `2024-01-20T10:0${i}:00Z`
            }));

            messages.forEach(msg => db.insertMessage(msg));

            const limit = 3;
            const retrieved = db.getMessagesByTopic(topicId, limit);
            expect(retrieved.length).toBe(limit);
        });

        it('should order messages by timestamp desc', () => {
            const timestamps = [
                '2024-01-20T10:01:00Z',
                '2024-01-20T10:02:00Z',
                '2024-01-20T10:03:00Z'
            ];

            const messages = timestamps.map(timestamp => ({
                id: uuidv4(),
                topic_id: topicId,
                source_id: sourceId,
                content: 'Test content',
                embed_title: '',
                embed_description: '',
                timestamp
            }));

            messages.forEach(msg => db.insertMessage(msg));

            const retrieved = db.getMessagesByTopic(topicId);
            expect(retrieved[0].timestamp).toBe(timestamps[2]); // Latest first
            expect(retrieved[2].timestamp).toBe(timestamps[0]); // Oldest last
        });
    });
}); 