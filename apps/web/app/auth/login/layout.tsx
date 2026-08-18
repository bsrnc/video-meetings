import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to reach your meetings.',
};

export default function LoginLayout({ children }: LayoutProps<'/auth/login'>) {
  return children;
}
