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
            const content = await fs.promises.readFile(path.join(DATA_DIR, file), 'utf-8');
            reports.push(JSON.parse(content));
        }

        // Group by date
        const groupedReports = reports.reduce((groups: { [key: string]: Report[] }, report) => {
            const date = report.timestamp.split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(report);
            return groups;
        }, {});

        // Sort reports within each group by timestamp (newest first)
        return Object.entries(groupedReports)
            .map(([date, reports]) => ({
                date,
                reports: reports.sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                )
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    static async deleteReport(id: string): Promise<void> {
        const files = await fs.promises.readdir(DATA_DIR);
        const reportFile = files.find(file => file.includes(id));
        if (reportFile) {
            await fs.promises.unlink(path.join(DATA_DIR, reportFile));
        }
    }

    static async updateReport(report: Report): Promise<void> {
        // First delete the old report file
        await this.deleteReport(report.id);
        // Then save the updated report
        await this.saveReport(report);
    }
} 