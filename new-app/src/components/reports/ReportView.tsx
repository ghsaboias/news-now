import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Report as ReportType } from '@/types/report';
import { useEffect, useMemo, useState } from 'react';
import { Report as ReportComponent } from './Report';


function ReportViewContent({ report }: { report: ReportType }) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Get current content based on selected language and force update
  const currentTranslation = useMemo(() => {
    if (!report?.summary?.translations) return null;
    if (!selectedLanguage) return null;
    return report.summary.translations.find(t => t.language === selectedLanguage);
  }, [selectedLanguage, report?.summary?.translations]);

  const content = currentTranslation || report?.summary || {
    headline: '',
    body: '',
    location: '',
    sources: []
  };

  // Force content update when translations change
  useEffect(() => {
    if (report?.summary?.translations) {
      setForceUpdate(prev => prev + 1);
    }
  }, [report?.summary?.translations]);

  // Update selected language when translations change
  useEffect(() => {
    if (selectedLanguage && currentTranslation) {
      console.log('Translation available for:', selectedLanguage);
    }
  }, [selectedLanguage, currentTranslation]);

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-medium text-gray-400 leading-snug">No Report Selected</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500 leading-normal">Select a channel and generate a report to view it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full bg-gray-900 mt-4">
      <ReportComponent
        report={report}
        content={content}
        currentTranslation={currentTranslation}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />
    </div>
  );
}

export function ReportView({ report }: { report: ReportType | null }) {
  if (!report) return null;
  return (
    <ErrorBoundary>
      <ReportViewContent report={report} />
    </ErrorBoundary>
  );
} 