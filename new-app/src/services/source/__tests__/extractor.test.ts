import { SourceExtractorMessage } from '@/types';
import { DatabaseService } from '../../db';
import { SourceExtractor } from '../extractor';

// Create minimal mock with only the methods we need
const mockDb = {
    getSourceByHandle: jest.fn().mockReturnValue(undefined),
    insertSource: jest.fn()
} as unknown as DatabaseService;

// Type assertion for mocked functions
const mockedGetSourceByHandle = mockDb.getSourceByHandle as jest.Mock;
const mockedInsertSource = mockDb.insertSource as jest.Mock;

describe('SourceExtractor', () => {
    let extractor: SourceExtractor;

    beforeEach(() => {
        extractor = new SourceExtractor(mockDb);
        jest.clearAllMocks();
    });

    // Mock messages
    const createMockMessage = (title: string): SourceExtractorMessage => ({
        id: '123',
        content: 'Test content',
        timestamp: '2024-01-21T10:00:00Z',
        author: {
            username: 'FaytuksBot',
            discriminator: '7032'
        },
        embeds: [{
            title,
            description: 'Test description',
            fields: []
        }]
    });

    describe('Platform Detection', () => {
        it('should detect Telegram sources', () => {
            const message = createMockMessage('Telegram: @test_channel');
            const result = extractor.extractFromMessage(message);

            expect(result).not.toBeNull();
            expect(result?.platform).toBe('telegram');
        });

        it('should detect X/Twitter sources', () => {
            const message = createMockMessage('Twitter: @test_user');
            const result = extractor.extractFromMessage(message);

            expect(result).not.toBeNull();
            expect(result?.platform).toBe('x');
        });

        it('should return null for unknown platforms', () => {
            const message = createMockMessage('Unknown: @test');
            const result = extractor.extractFromMessage(message);

            expect(result).toBeNull();
        });
    });

    describe('Handle Extraction', () => {
        it('should extract Telegram handles', () => {
            const message = createMockMessage('Telegram: @test_channel');
            const result = extractor.extractFromMessage(message);

            expect(result?.handle).toBe('test_channel');
        });

        it('should extract X handles', () => {
            const message = createMockMessage('X: @test_user');
            const result = extractor.extractFromMessage(message);

            expect(result?.handle).toBe('test_user');
        });

        it('should handle missing @ symbol', () => {
            const message = createMockMessage('Telegram: test_channel');
            const result = extractor.extractFromMessage(message);

            expect(result?.handle).toBe('test_channel');
        });
    });

    describe('Source Management', () => {
        it('should reuse existing source ID', () => {
            const existingSource = {
                id: 'existing-id',
                platform: 'telegram' as const,
                handle: 'test_channel',
                first_seen_at: '2024-01-20T10:00:00Z',
                last_seen_at: '2024-01-20T10:00:00Z'
            };

            mockedGetSourceByHandle.mockReturnValue(existingSource);

            const message = createMockMessage('Telegram: @test_channel');
            const result = extractor.extractFromMessage(message);

            expect(result?.id).toBe(existingSource.id);
        });

        it('should update last_seen_at for newer messages', () => {
            const existingSource = {
                id: 'existing-id',
                platform: 'telegram' as const,
                handle: 'test_channel',
                first_seen_at: '2024-01-20T10:00:00Z',
                last_seen_at: '2024-01-20T10:00:00Z'
            };

            mockedGetSourceByHandle.mockReturnValue(existingSource);

            const message = createMockMessage('Telegram: @test_channel');
            extractor.extractFromMessage(message);

            expect(mockedInsertSource).toHaveBeenCalledWith(expect.objectContaining({
                id: existingSource.id,
                last_seen_at: message.timestamp
            }));
        });
    });

    describe('Edge Cases', () => {
        it('should handle messages without embeds', () => {
            const message = { ...createMockMessage(''), embeds: [] };
            const result = extractor.extractFromMessage(message);

            expect(result).toBeNull();
        });

        it('should handle messages with empty titles', () => {
            const message = createMockMessage('');
            const result = extractor.extractFromMessage(message);

            expect(result).toBeNull();
        });

        it('should handle malformed handles', () => {
            const message = createMockMessage('Telegram: @');
            const result = extractor.extractFromMessage(message);

            expect(result).toBeNull();
        });
    });
}); 