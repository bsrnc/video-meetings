'use client';

import { useEffect, useRef } from 'react';
import { Alert } from '@heroui/react';

/**
 * Server-side form failure. Focus moves to it on appearance so screen readers
 * announce it and keyboard users land on it, instead of focus staying on the
 * body after a failed submit.
 */
export function FormErrorAlert({ message }: { message: string | null }) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) {
      alertRef.current?.focus();
    }
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div ref={alertRef} role="alert" tabIndex={-1}>
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{message}</Alert.Title>
        </Alert.Content>
      </Alert>
    </div>
  );
}
