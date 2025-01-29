import { Report, ReportGroup } from '@/types';
import { redisClient } from './client';

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

    // Add a new report
    static async addReport(report: Report): Promise<void> {
        const date = new Date(report.timestamp).toISOString().split('T')[0];
        const pipeline = redisClient.redis.pipeline();

        // Store the report
        pipeline.set(REPORT_KEY(report.id), JSON.stringify(report));

        // Add to sorted set of all reports
        pipeline.zadd(`${REPORT_PREFIX}:all`, new Date(report.timestamp).getTime(), report.id);

        // Add to channel set
        pipeline.zadd(REPORT_CHANNEL_KEY(report.channelId), new Date(report.timestamp).getTime(), report.id);

        // Add to date set
        pipeline.zadd(REPORT_DATE_KEY(date), new Date(report.timestamp).getTime(), report.id);

        await pipeline.exec();
    }

    // Update an existing report
    static async updateReport(report: Report): Promise<void> {
        await redisClient.redis.set(REPORT_KEY(report.id), JSON.stringify(report));
    }

    // Delete a report
    static async deleteReport(reportId: string): Promise<void> {
        const report = await this.getReport(reportId);
        if (!report) return;

        const date = new Date(report.timestamp).toISOString().split('T')[0];
        const pipeline = redisClient.redis.pipeline();

        // Remove the report
        pipeline.del(REPORT_KEY(reportId));

        // Remove from all sets
        pipeline.zrem(`${REPORT_PREFIX}:all`, reportId);
        pipeline.zrem(REPORT_CHANNEL_KEY(report.channelId), reportId);
        pipeline.zrem(REPORT_DATE_KEY(date), reportId);

        await pipeline.exec();
    }

    // Get reports by channel and timeframe
    static async getReportsByChannel(channelId: string, timeframe: string): Promise<Report[]> {
        const reportIds: string[] = await redisClient.redis.zrange(REPORT_CHANNEL_KEY(channelId), 0, -1);
        const reports = await Promise.all(
            reportIds.map(id => this.getReport(id))
        );
        return reports.filter((report): report is Report => report !== null);
    }

    // Delete all reports for a specific date
    static async deleteReportsByDate(date: string): Promise<void> {
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

            // Remove the report
            pipeline.del(REPORT_KEY(report.id));

            // Remove from all sets
            pipeline.zrem(`${REPORT_PREFIX}:all`, report.id);
            pipeline.zrem(REPORT_CHANNEL_KEY(report.channelId), report.id);
            pipeline.zrem(REPORT_DATE_KEY(date), report.id);
        }

        await pipeline.exec();
    }
} 
