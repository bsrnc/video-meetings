'use client';

import { Alert } from '@heroui/react';

/**
 * A page-level load failure. It is announced (`role="alert"`) but does not take
 * focus the way `FormErrorAlert` does: nothing the user did caused it, and
 * there is no submit for focus to be stranded on.
 */
export function PageErrorAlert({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div role="alert">
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{message}</Alert.Title>
        </Alert.Content>
      </Alert>
    </div>
  );
}
