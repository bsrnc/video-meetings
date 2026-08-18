import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Sign up with your email to start scheduling meetings.',
};

export default function RegisterLayout({ children }: LayoutProps<'/register'>) {
  return children;
}
