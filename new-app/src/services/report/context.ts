import { Report } from '@/types';

interface TimeWindow {
    start: Date;
    end: Date;
}

export interface ReportContext {
    primary: Report | null;
    supporting: Report[];
    coverage: TimeWindow[];
}

interface TimeframeRule {
    type: '1h' | '4h' | '24h';
    maxAge: number;
    outsideCurrentWindow?: boolean;
}

interface TimeframeRules {
    primary: TimeframeRule;
    supporting: TimeframeRule[];
}

type TimeframeType = '1h' | '4h' | '24h';
type ChannelReports = Record<TimeframeType, Report[]>;

export class ReportContextManager {
    private indexes: {
        byChannel: Record<string, ChannelReports>;
    } = { byChannel: {} };

    // Initialize indexes from reports
    initialize(reports: Report[]) {
        console.log(`[ReportContextManager] Initializing with ${reports.length} reports`);
        this.indexes = { byChannel: {} };

        for (const report of reports) {
            if (!this.indexes.byChannel[report.channelId]) {
                this.indexes.byChannel[report.channelId] = {
                    '1h': [],
                    '4h': [],
                    '24h': []
                };
            }

            const channelReports = this.indexes.byChannel[report.channelId];
            channelReports[report.timeframe.type].push(report);
        }

        // Sort all report arrays by timestamp (newest first)
        Object.values(this.indexes.byChannel).forEach((channelReports) => {
            (['1h', '4h', '24h'] as TimeframeType[]).forEach((timeframe) => {
                channelReports[timeframe].sort(
                    (a: Report, b: Report) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
            });
        });

        console.log(`[ReportContextManager] Indexed reports for ${Object.keys(this.indexes.byChannel).length} channels`);
    }

    // Core method to find context reports
    findContextReports(channelId: string, timeframe: TimeframeType): ReportContext {
        console.log(`[ReportContextManager] Finding context for channel ${channelId}, timeframe ${timeframe}`);
        const rules = this.getTimeframeRules(timeframe);
        const candidates = this.findCandidateReports(channelId, rules);
        const context = this.validateAndOrderReports(candidates);
        console.log(`[ReportContextManager] Found ${context.supporting.length + (context.primary ? 1 : 0)} relevant reports`);
        return context;
    }

    private getTimeframeRules(timeframe: TimeframeType): TimeframeRules {
        const rules: Record<TimeframeType, TimeframeRules> = {
            '1h': {
                primary: { type: '1h', maxAge: 24 },
                supporting: [
                    { type: '4h', maxAge: 24 },
                    { type: '24h', maxAge: 48 }
                ]
            },
            '4h': {
                primary: { type: '4h', maxAge: 24 },
                supporting: [
                    { type: '1h', maxAge: 24, outsideCurrentWindow: true },
                    { type: '4h', maxAge: 24, outsideCurrentWindow: true },
                    { type: '24h', maxAge: 48 }
                ]
            },
            '24h': {
                primary: { type: '24h', maxAge: 72 },
                supporting: [
                    { type: '1h', maxAge: 48, outsideCurrentWindow: true },
                    { type: '4h', maxAge: 48, outsideCurrentWindow: true }
                ]
            }
        };
        return rules[timeframe];
    }

    private findCandidateReports(channelId: string, rules: TimeframeRules): Report[] {
        const channelReports = this.indexes.byChannel[channelId];
        if (!channelReports) {
            console.log(`[ReportContextManager] No reports found for channel ${channelId}`);
            return [];
        }

        const now = new Date();
        const candidates: Report[] = [];

        // Helper to check if a report is within maxAge hours
        const isWithinAge = (report: Report, maxAge: number): boolean => {
            const reportTime = new Date(report.timestamp);
            const ageInHours = (now.getTime() - reportTime.getTime()) / (1000 * 60 * 60);
            return ageInHours <= maxAge;
        };

        // Helper to check if a report's window overlaps with another
        const isOutsideWindow = (report: Report, referenceReport: Report): boolean => {
            const reportStart = new Date(report.timeframe.start);
            const reportEnd = new Date(report.timeframe.end);
            const referenceStart = new Date(referenceReport.timeframe.start);
            const referenceEnd = new Date(referenceReport.timeframe.end);

            return reportEnd.getTime() <= referenceStart.getTime() ||
                reportStart.getTime() >= referenceEnd.getTime();
        };

        // Find primary report
        const primaryReports = channelReports[rules.primary.type];
        console.log(`[ReportContextManager] Searching for primary ${rules.primary.type} report within ${rules.primary.maxAge}h`, {
            availableReports: primaryReports.length
        });

        const primary = primaryReports.find(report => isWithinAge(report, rules.primary.maxAge));
        if (primary) {
            console.log(`[ReportContextManager] Found primary report:`, {
                id: primary.id,
                timeframe: primary.timeframe,
                timestamp: primary.timestamp
            });
            candidates.push(primary);
        }

        // Find supporting reports
        for (const rule of rules.supporting) {
            const supportingReports = channelReports[rule.type];
            console.log(`[ReportContextManager] Searching for supporting ${rule.type} reports within ${rule.maxAge}h`, {
                availableReports: supportingReports.length,
                requireOutsideWindow: rule.outsideCurrentWindow
            });

            const validSupporting = supportingReports
                .filter(report => {
                    const withinAge = isWithinAge(report, rule.maxAge);
                    const outsideWindow = !rule.outsideCurrentWindow ||
                        (primary && isOutsideWindow(report, primary));

                    if (withinAge && !outsideWindow) {
                        console.log(`[ReportContextManager] Skipping overlapping report:`, {
                            id: report.id,
                            timeframe: report.timeframe
                        });
                    }

                    return withinAge && outsideWindow;
                })
                .slice(0, 1); // Take only the most recent matching report

            if (validSupporting.length) {
                console.log(`[ReportContextManager] Found supporting report:`, {
                    id: validSupporting[0].id,
                    timeframe: validSupporting[0].timeframe,
                    timestamp: validSupporting[0].timestamp
                });
            }

            candidates.push(...validSupporting);
        }

        return candidates;
    }

    private validateAndOrderReports(candidates: Report[]): ReportContext {
        if (!candidates.length) {
            console.log(`[ReportContextManager] No valid candidates found`);
            return { primary: null, supporting: [], coverage: [] };
        }

        // Sort reports by start time
        const sortedReports = [...candidates].sort(
            (a, b) => new Date(a.timeframe.start).getTime() - new Date(b.timeframe.start).getTime()
        );

        // Extract primary report (should be the first one from findCandidateReports)
        const primary = sortedReports[0];
        const supporting = sortedReports.slice(1);

        // Analyze coverage periods
        const coverage: TimeWindow[] = sortedReports.map(report => ({
            start: new Date(report.timeframe.start),
            end: new Date(report.timeframe.end)
        }));

        // Merge overlapping coverage periods
        const mergedCoverage = this.mergeCoveragePeriods(coverage);

        console.log(`[ReportContextManager] Final context:`, {
            primary: primary ? {
                id: primary.id,
                timeframe: primary.timeframe,
                timestamp: primary.timestamp
            } : null,
            supporting: supporting.map(r => ({
                id: r.id,
                timeframe: r.timeframe,
                timestamp: r.timestamp
            })),
            coverage: mergedCoverage.map(c => ({
                start: c.start.toISOString(),
                end: c.end.toISOString()
            }))
        });

        return {
            primary,
            supporting,
            coverage: mergedCoverage
        };
    }

    private mergeCoveragePeriods(periods: TimeWindow[]): TimeWindow[] {
        if (periods.length <= 1) return periods;

        // Sort by start time
        const sorted = [...periods].sort((a, b) => a.start.getTime() - b.start.getTime());
        const merged: TimeWindow[] = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const previous = merged[merged.length - 1];

            // If current period overlaps with previous, extend previous
            if (current.start.getTime() <= previous.end.getTime()) {
                previous.end = new Date(
                    Math.max(previous.end.getTime(), current.end.getTime())
                );
            } else {
                // No overlap, add as new period
                merged.push(current);
            }
        }

        return merged;
    }
}