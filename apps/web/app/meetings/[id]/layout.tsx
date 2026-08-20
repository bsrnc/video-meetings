import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meeting',
  description: 'Meeting details and its recording.',
};

export default function MeetingLayout({
  children,
}: LayoutProps<'/meetings/[id]'>) {
  return children;
}
