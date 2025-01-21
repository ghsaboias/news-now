import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SplitView } from '../SplitView';

describe('SplitView', () => {
  it('renders sidebar and main content', () => {
    render(
      <SplitView
        sidebar={<div>Sidebar Content</div>}
        main={<div>Main Content</div>}
      />
    );

    expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('has correct layout classes', () => {
    const { container } = render(
      <SplitView
        sidebar={<div>Sidebar</div>}
        main={<div>Main</div>}
      />
    );

    const root = container.firstChild as HTMLElement;
    const aside = root.querySelector('aside');
    const main = root.querySelector('main');

    expect(root).toHaveClass('flex', 'flex-col', 'md:flex-row');
    expect(aside).toHaveClass('w-full', 'md:w-[30%]');
    expect(main).toHaveClass('flex-1');
  });
});