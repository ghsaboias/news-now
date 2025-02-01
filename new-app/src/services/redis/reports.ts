import { ValidationResult } from '@/types/redisValidation';
import { Report, ReportGroup } from '@/types/report';
import { redisClient } from './client';
import { ReportValidationError, ReportValidator } from './validation';

const REPORT_PREFIX = 'reports';
const REPORT_KEY = (id: string) => `${REPORT_PREFIX}:${id}`;
const REPORT_DATE_KEY = (date: string) => `${REPORT_PREFIX}:date:${date}`;
const REPORT_CHANNEL_KEY = (channelId: string) => `${REPORT_PREFIX}:channel:${channelId}`;

export class ReportService {
    // Get all reports grouped by date
    static async getAllReports(): Promise<ReportGroup[]> {
        const reports: string[] = await redisClient.redis.zrange(`${REPORT_PREFIX}:all`, 0, -1);
        const groupedReports: { [date: string]: Report[] } = {};

        for (const reportId of reports) {
            const report = await this.getReport(reportId);
            if (report) {
                const date = new Date(report.timestamp).toISOString().split('T')[0];
                groupedReports[date] = groupedReports[date] || [];
                groupedReports[date].push(report);
            }
        }

        return Object.entries(groupedReports)
            .map(([date, reports]) => ({ date, reports }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }

    // Get a single report
    static async getReport(reportId: string): Promise<Report | null> {
        const report = await redisClient.redis.get(REPORT_KEY(reportId));
        return report ? JSON.parse(report) : null;
    }

    // Add a new report with validation
    static async addReport(report: Report): Promise<ValidationResult> {
        // Validate report
        const validation = ReportValidator.validateReport(report);
        if (!validation.isValid) {
            throw new ReportValidationError(
                `Invalid report: ${validation.errors.join(', ')}`,
                'INVALID_REPORT'
            );
        }

        // Check for overlapping timeframes
        const existingReports = await this.getReportsByChannel(report.channelId, report.timeframe.type);
        const timeframes = existingReports.map(r => ReportValidator.validateTimeframe(r.timeframe));
        timeframes.push(ReportValidator.validateTimeframe(report.timeframe));

        const overlapWarnings = ReportValidator.validateTimeframeOverlap(timeframes);
        const coverageWarnings = ReportValidator.validateTimeframeCoverage(timeframes);

        validation.warnings.push(...overlapWarnings, ...coverageWarnings);

        const date = new Date(report.timestamp).toISOString().split('T')[0];

        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                // Ensure Redis connection is ready
                await redisClient.redis.ping();

                // Start a new transaction
                const transaction = redisClient.redis.multi();

                // Store the report
                transaction.set(REPORT_KEY(report.id), JSON.stringify(report));

                // Add to sorted set of all reports
                transaction.zadd(`${REPORT_PREFIX}:all`, new Date(report.timestamp).getTime(), report.id);

                // Add to channel set
                transaction.zadd(REPORT_CHANNEL_KEY(report.channelId), new Date(report.timestamp).getTime(), report.id);

                // Add to date set
                transaction.zadd(REPORT_DATE_KEY(date), new Date(report.timestamp).getTime(), report.id);

                // Execute transaction with a timeout
                const results = await Promise.race([
                    transaction.exec(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Transaction timeout')), 5000)
                    )
                ]) as [Error | null, any][] | null;

                // Verify all operations succeeded
                if (!results || results.some(([err]) => err !== null)) {
                    throw new Error('Transaction failed: Some operations were not successful');
                }

                return validation;
            } catch (error) {
                retryCount++;
                console.error(`[ReportService] Transaction attempt ${retryCount} failed:`, error);

                if (retryCount === maxRetries) {
                    console.error('[ReportService] All retry attempts failed');
                    throw new ReportValidationError(
                        error instanceof Error ? error.message : 'Failed to store report',
                        'STORAGE_ERROR'
                    );
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

        // This should never be reached due to the throw in the last retry
        throw new ReportValidationError('Failed to store report', 'STORAGE_ERROR');
    }

    // Update an existing report with validation
    static async updateReport(report: Report): Promise<ValidationResult> {
        // Validate report
        const validation = ReportValidator.validateReport(report);
        if (!validation.isValid) {
            throw new ReportValidationError(
                `Invalid report: ${validation.errors.join(', ')}`,
                'INVALID_REPORT'
            );
        }

        // Get existing report
        const existingReport = await this.getReport(report.id);
        if (!existingReport) {
            throw new ReportValidationError(
                'Report not found',
                'REPORT_NOT_FOUND'
            );
        }

        // Check for timeframe changes
        if (existingReport.timeframe.type !== report.timeframe.type ||
            existingReport.timeframe.start !== report.timeframe.start ||
            existingReport.timeframe.end !== report.timeframe.end) {

            // Validate new timeframe against other reports
            const otherReports = (await this.getReportsByChannel(report.channelId, report.timeframe.type))
                .filter(r => r.id !== report.id);

            const timeframes = otherReports.map(r => ReportValidator.validateTimeframe(r.timeframe));
            timeframes.push(ReportValidator.validateTimeframe(report.timeframe));

            const overlapWarnings = ReportValidator.validateTimeframeOverlap(timeframes);
            const coverageWarnings = ReportValidator.validateTimeframeCoverage(timeframes);

            validation.warnings.push(...overlapWarnings, ...coverageWarnings);
        }

        try {
            await redisClient.redis.set(REPORT_KEY(report.id), JSON.stringify(report));
            return validation;
        } catch (error) {
            throw new ReportValidationError(
                'Failed to update report',
                'STORAGE_ERROR'
            );
        }
    }

    // Delete a report with validation
    static async deleteReport(reportId: string): Promise<void> {
        const report = await this.getReport(reportId);
        if (!report) {
            throw new ReportValidationError(
                'Report not found',
                'REPORT_NOT_FOUND'
            );
        }

        const date = new Date(report.timestamp).toISOString().split('T')[0];
        const pipeline = redisClient.redis.pipeline();

        // Remove the report
        pipeline.del(REPORT_KEY(reportId));

        // Remove from all sets
        pipeline.zrem(`${REPORT_PREFIX}:all`, reportId);
        pipeline.zrem(REPORT_CHANNEL_KEY(report.channelId), reportId);
        pipeline.zrem(REPORT_DATE_KEY(date), reportId);

        try {
            await pipeline.exec();
        } catch (error) {
            throw new ReportValidationError(
                'Failed to delete report',
                'STORAGE_ERROR'
            );
        }
    }

    // Get reports by channel and timeframe with validation
    static async getReportsByChannel(channelId: string, timeframe: string): Promise<Report[]> {
        // Validate timeframe
        if (!['1h', '4h', '24h'].includes(timeframe)) {
            throw new ReportValidationError(
                'Invalid timeframe type',
                'INVALID_TIMEFRAME_TYPE'
            );
        }

        // Validate channel ID
        if (!channelId || !/^\d+$/.test(channelId)) {
            throw new ReportValidationError(
                'Invalid channel ID',
                'INVALID_CHANNEL_ID'
            );
        }

        const reportIds: string[] = await redisClient.redis.zrange(REPORT_CHANNEL_KEY(channelId), 0, -1);
        const reports = await Promise.all(
            reportIds.map(id => this.getReport(id))
        );

        // Filter and validate reports
        const validReports = reports
            .filter((report): report is Report => report !== null)
            .filter(report => {
                try {
                    ReportValidator.validateReport(report);
                    return true;
                } catch (error) {
                    console.warn(`[ReportService] Skipping invalid report:`, {
                        id: report.id,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    return false;
                }
            });

        return validReports;
    }

    // Delete all reports for a specific date with validation
    static async deleteReportsByDate(date: string): Promise<void> {
        // Validate date format
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            throw new ReportValidationError(
                'Invalid date format',
                'INVALID_DATE'
            );
        }

        // Get all report IDs for the date
        const reportIds: string[] = await redisClient.redis.zrange(REPORT_DATE_KEY(date), 0, -1);

        if (reportIds.length === 0) return;

        // Get all reports to find their channel IDs
        const reports = await Promise.all(
            reportIds.map(id => this.getReport(id))
        );

        const pipeline = redisClient.redis.pipeline();

        // Delete each report and its references
        for (const report of reports) {
            if (!report) continue;

            try {
                ReportValidator.validateReport(report);
            } catch (error) {
                console.warn(`[ReportService] Skipping invalid report during deletion:`, {
                    id: report.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                continue;
            }

            // Remove the report
            pipeline.del(REPORT_KEY(report.id));

            // Remove from all sets
            pipeline.zrem(`${REPORT_PREFIX}:all`, report.id);
            pipeline.zrem(REPORT_CHANNEL_KEY(report.channelId), report.id);
            pipeline.zrem(REPORT_DATE_KEY(date), report.id);
        }

        try {
            await pipeline.exec();
        } catch (error) {
            throw new ReportValidationError(
                'Failed to delete reports',
                'STORAGE_ERROR'
            );
        }
    }
} 
