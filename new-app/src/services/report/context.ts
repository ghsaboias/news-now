import { Report } from '@/types/report';
import { ChannelReports, ReportContext, TimeframeRules, TimeframeType, TimeWindow } from '@/types/reportContext';

// Validation error types
export class ContextValidationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'ContextValidationError';
    }
}

export class ReportContextManager {
    private indexes: {
        byChannel: Record<string, ChannelReports>;
    } = { byChannel: {} };

    // Initialize indexes from reports with validation
    initialize(reports: Report[]) {
        console.log(`[ReportContextManager] Initializing with ${reports.length} reports`);
        this.indexes = { byChannel: {} };

        // Validate reports before indexing
        const validatedReports = reports.filter(report => {
            try {
                this.validateReport(report);
                return true;
            } catch (error) {
                console.warn(`[ReportContextManager] Skipping invalid report:`, {
                    id: report.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                return false;
            }
        });

        for (const report of validatedReports) {
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

    // Core method to find context reports with enhanced validation
    findContextReports(channelId: string, timeframe: TimeframeType): ReportContext {
        console.log(`[ReportContextManager] Finding context for channel ${channelId}, timeframe ${timeframe}`);

        // Validate input parameters
        this.validateChannelId(channelId);
        this.validateTimeframeType(timeframe);

        const rules = this.getTimeframeRules(timeframe);
        const candidates = this.findCandidateReports(channelId, rules);
        return this.validateAndOrderReports(candidates, channelId, timeframe);
    }

    private validateReport(report: Report): void {
        if (!report.id) {
            throw new ContextValidationError('Report ID is required', 'INVALID_REPORT_ID');
        }
        if (!report.channelId) {
            throw new ContextValidationError('Channel ID is required', 'INVALID_CHANNEL_ID');
        }
        if (!report.timeframe || !report.timeframe.type || !report.timeframe.start || !report.timeframe.end) {
            throw new ContextValidationError('Invalid timeframe structure', 'INVALID_TIMEFRAME');
        }
        if (!report.timestamp) {
            throw new ContextValidationError('Report timestamp is required', 'INVALID_TIMESTAMP');
        }

        // Validate timeframe boundaries
        const start = new Date(report.timeframe.start);
        const end = new Date(report.timeframe.end);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ContextValidationError('Invalid timeframe dates', 'INVALID_TIMEFRAME_DATES');
        }
        if (end.getTime() <= start.getTime()) {
            throw new ContextValidationError('Timeframe end must be after start', 'INVALID_TIMEFRAME_ORDER');
        }
    }

    private validateChannelId(channelId: string): void {
        if (!channelId || !/^\d+$/.test(channelId)) {
            throw new ContextValidationError('Invalid channel ID format', 'INVALID_CHANNEL_ID_FORMAT');
        }
    }

    private validateTimeframeType(timeframe: string): void {
        if (!['1h', '4h', '24h'].includes(timeframe)) {
            throw new ContextValidationError('Invalid timeframe type', 'INVALID_TIMEFRAME_TYPE');
        }
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
        const MAX_CHAIN_LENGTH = 3; // Increased to allow for more context
        let chainLength = 0;
        const validationWarnings: string[] = [];

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

        // Find primary report with validation
        const primaryReports = channelReports[rules.primary.type];
        const primary = primaryReports.find(report => {
            try {
                this.validateReport(report);
                if (chainLength >= MAX_CHAIN_LENGTH) {
                    validationWarnings.push('Chain length limit reached for primary report');
                    return false;
                }
                const isValid = isWithinAge(report, rules.primary.maxAge);
                if (isValid) chainLength++;
                return isValid;
            } catch (error) {
                console.warn(`[ReportContextManager] Invalid primary report:`, {
                    id: report.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                return false;
            }
        });

        if (primary) {
            candidates.push(primary);
        }

        // Find supporting reports with validation
        if (chainLength < MAX_CHAIN_LENGTH) {
            for (const rule of rules.supporting) {
                const supportingReports = channelReports[rule.type];
                const validSupporting = supportingReports
                    .filter(report => {
                        try {
                            this.validateReport(report);
                            const withinAge = isWithinAge(report, rule.maxAge);
                            const outsideWindow = !rule.outsideCurrentWindow ||
                                (primary && isOutsideWindow(report, primary));

                            if (withinAge && !outsideWindow) {
                                validationWarnings.push(`Skipping overlapping report: ${report.id}`);
                            }

                            return withinAge && outsideWindow;
                        } catch (error) {
                            console.warn(`[ReportContextManager] Invalid supporting report:`, {
                                id: report.id,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                            return false;
                        }
                    })
                    .slice(0, MAX_CHAIN_LENGTH - chainLength);

                candidates.push(...validSupporting);
                chainLength += validSupporting.length;
            }
        }

        return candidates;
    }

    private validateAndOrderReports(candidates: Report[], channelId: string, timeframe: TimeframeType): ReportContext {
        if (!candidates.length) {
            return { primary: null, supporting: [], coverage: [], validationWarnings: ['No valid candidates found'] };
        }

        const validationWarnings: string[] = [];

        // Validate channel consistency
        candidates.forEach(report => {
            if (report.channelId !== channelId) {
                validationWarnings.push(`Report ${report.id} has mismatched channel ID`);
            }
        });

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

        // Validate coverage gaps
        const gaps = this.findCoverageGaps(mergedCoverage);
        if (gaps.length > 0) {
            validationWarnings.push(`Found ${gaps.length} coverage gaps in the timeline`);
        }

        return {
            primary,
            supporting,
            coverage: mergedCoverage,
            validationWarnings
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

    private findCoverageGaps(coverage: TimeWindow[]): TimeWindow[] {
        const gaps: TimeWindow[] = [];
        for (let i = 1; i < coverage.length; i++) {
            const current = coverage[i];
            const previous = coverage[i - 1];

            if (current.start.getTime() > previous.end.getTime()) {
                gaps.push({
                    start: previous.end,
                    end: current.start
                });
            }
        }
        return gaps;
    }
}