import { Source } from '@/types/source';
import { SourceService } from '../../redis/sources';
import { SourceExtractor } from '../extractor';

describe('SourceExtractor', () => {
    let extractor: SourceExtractor;
    let sourceService: SourceService;

    beforeEach(() => {
        sourceService = new SourceService();
        extractor = new SourceExtractor(sourceService);
    });

    it('should extract source from message', async () => {
        const source: Source = {
            id: 'test_id',
            platform: 'telegram',
            handle: 'test_channel',
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString()
        };

        jest.spyOn(sourceService, 'getByHandle').mockResolvedValue(null);
        jest.spyOn(sourceService, 'create').mockResolvedValue();

        const result = await extractor.extractFromMessage({
            id: 'test_id',
            content: 'Test content',
            timestamp: new Date().toISOString(),
            author: {
                username: 'test_bot',
                discriminator: '1234'
            },
            embeds: [{
                title: 'Telegram: @test_channel',
                description: 'Test description',
                fields: []
            }]
        });

        expect(result).toBeDefined();
        expect(result?.platform).toBe('telegram');
        expect(result?.handle).toBe('test_channel');
        expect(sourceService.create).toHaveBeenCalled();
    });

    it('should return existing source if found', async () => {
        const existingSource: Source = {
            id: 'test_id',
            platform: 'telegram',
            handle: 'test_channel',
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString()
        };

        jest.spyOn(sourceService, 'getByHandle').mockResolvedValue(existingSource);
        jest.spyOn(sourceService, 'create').mockResolvedValue();

        const result = await extractor.extractFromMessage({
            id: 'test_id',
            content: 'Test content',
            timestamp: new Date().toISOString(),
            author: {
                username: 'test_bot',
                discriminator: '1234'
            },
            embeds: [{
                title: 'Telegram: @test_channel',
                description: 'Test description',
                fields: []
            }]
        });

        expect(result).toEqual(existingSource);
        expect(sourceService.create).not.toHaveBeenCalled();
    });

    it('should return null for invalid input', async () => {
        const result = await extractor.extractFromMessage({
            id: 'test_id',
            content: 'Test content',
            timestamp: new Date().toISOString(),
            author: {
                username: 'test_bot',
                discriminator: '1234'
            },
            embeds: [{
                title: 'Invalid: @',
                description: 'Test description',
                fields: []
            }]
        });

        expect(result).toBeNull();
        expect(sourceService.create).not.toHaveBeenCalled();
    });
}); 