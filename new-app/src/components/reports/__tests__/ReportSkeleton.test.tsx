import { render } from '@testing-library/react';
import { ReportSkeleton } from '../ReportSkeleton';

describe('ReportSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<ReportSkeleton />);
    
    // Should have animation class
    expect(container.firstChild).toHaveClass('animate-pulse');
    
    // Should render date skeleton
    expect(container.querySelector('.h-4.w-24')).toBeInTheDocument();
    
    // Should render 3 report skeletons
    const reportSkeletons = container.querySelectorAll('.bg-gray-800');
    expect(reportSkeletons).toHaveLength(3);
    
    // Each report should have headline and metadata skeletons
    const headlineSkeletons = container.querySelectorAll('.h-5.w-3\\/4');
    const metadataSkeletons = container.querySelectorAll('.h-4.w-1\\/2');
    expect(headlineSkeletons).toHaveLength(3);
    expect(metadataSkeletons).toHaveLength(3);
    
    // Each report should have 3 action button skeletons
    const actionSkeletons = container.querySelectorAll('.h-9.w-9');
    expect(actionSkeletons).toHaveLength(9); // 3 reports × 3 buttons
  });
}); 