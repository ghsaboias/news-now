import { Report, ReportGroup } from '@/types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'reports');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class ReportStorage {
    static async saveReport(report: Report): Promise<void> {
        const fileName = `${report.timestamp.split('T')[0]}_${report.channelName.replace(/[^a-z0-9]/gi, '-')}_${report.id}.json`;
        const filePath = path.join(DATA_DIR, fileName);
        await fs.promises.writeFile(filePath, JSON.stringify(report, null, 2));
    }

    static async getAllReports(): Promise<ReportGroup[]> {
        const files = await fs.promises.readdir(DATA_DIR);
        const reports: Report[] = [];

        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.promises.readFile(path.join(DATA_DIR, file), 'utf-8');
                const report = JSON.parse(content);

                // Validate report has required fields
                if (!report || !report.timestamp) {
                    console.error(`Invalid report in file ${file}, missing timestamp`);
                    continue;
                }

                reports.push(report);
            } catch (error) {
                console.error(`Error reading report file ${file}:`, error);
                continue;
            }
        }

        // Group by date, with validation
        const groupedReports = reports.reduce((groups: { [key: string]: Report[] }, report) => {
            try {
                const date = report.timestamp?.split('T')?.[0];
                if (!date) {
                    console.error('Invalid timestamp in report:', report.id);
                    return groups;
                }

                if (!groups[date]) groups[date] = [];
                groups[date].push(report);
            } catch (error) {
                console.error('Error processing report for grouping:', error);
            }
            return groups;
        }, {});

        // Sort reports within each group by timestamp (newest first)
        return Object.entries(groupedReports)
            .map(([date, reports]) => ({
                date,
                reports: reports.sort((a, b) => {
                    try {
                        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                    } catch {
                        return 0; // Keep order unchanged if dates are invalid
                    }
                })
            }))
            .sort((a, b) => {
                try {
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                } catch {
                    return 0; // Keep order unchanged if dates are invalid
                }
            });
    }

    static async deleteReport(id: string): Promise<void> {
        const files = await fs.promises.readdir(DATA_DIR);
        const reportFile = files.find(file => file.includes(id));
        if (reportFile) {
            await fs.promises.unlink(path.join(DATA_DIR, reportFile));
        }
    }

    static async deleteReportsByDate(date: string): Promise<void> {
        const files = await fs.promises.readdir(DATA_DIR);
        const reportsToDelete = files.filter(file => file.startsWith(date));

        await Promise.all(
            reportsToDelete.map(file =>
                fs.promises.unlink(path.join(DATA_DIR, file))
            )
        );
    }

    static async updateReport(report: Report): Promise<void> {
        // First delete the old report file
        await this.deleteReport(report.id);
        // Then save the updated report
        await this.saveReport(report);
    }
} 