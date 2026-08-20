'use client';

import Link from 'next/link';
import { Button } from '@heroui/react';

/** The bar every signed-in page carries: brand home link plus sign-out. */
export function AppHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-separator px-4 py-3 sm:px-6">
      <Link
        className="text-base font-semibold text-foreground no-underline hover:underline"
        href="/"
      >
        Video Meetings
      </Link>
      <Button className="h-11" onPress={onSignOut} variant="tertiary">
        Sign out
      </Button>
    </header>
  );
}
