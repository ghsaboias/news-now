import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { SplitView } from '../SplitView';

describe('SplitView', () => {
  it('has correct layout classes', () => {
    const { container } = render(
      <SplitView sidebarContent="Sidebar Content" mainContent="Main Content" />
    );

    const root = container.firstChild as HTMLElement;
    const layout = root.querySelector('.flex');
    const sidebar = layout?.querySelector('.w-full');
    const mainWrapper = layout?.querySelector('.flex-1');
    const mainInner = mainWrapper?.querySelector('div');

    expect(layout).toHaveClass('flex', 'flex-col', 'lg:flex-row', 'min-h-screen');
    expect(sidebar).toHaveClass('w-full', 'lg:w-[400px]', 'lg:min-w-[400px]', 'overflow-y-auto', 'bg-gray-900/50', 'backdrop-blur-sm');
    expect(mainWrapper).toHaveClass('flex-1', 'overflow-y-auto', 'bg-gray-900/30', 'backdrop-blur-sm');
    expect(mainInner).toHaveClass('p-4', 'lg:p-6', 'space-y-4');
  });

  it('renders sidebar and main content', () => {
    const { getByText } = render(
      <SplitView
        sidebarContent={<div>Sidebar Content</div>}
        mainContent={<div>Main Content</div>}
      />
    );

    expect(getByText('Sidebar Content')).toBeInTheDocument();
    expect(getByText('Main Content')).toBeInTheDocument();
  });
});