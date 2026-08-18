'use client';

import { useState, type ReactNode } from 'react';
import {
  Description,
  FieldError,
  Input,
  Label,
  TextField,
} from '@heroui/react';

function EyeIcon({ isCrossedOut }: { isCrossedOut: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
      {isCrossedOut ? <path d="M4 20 20 4" strokeLinecap="round" /> : null}
    </svg>
  );
}

interface PasswordFieldProps {
  /** `new-password` on sign-up, `current-password` on sign-in. */
  autoComplete: 'current-password' | 'new-password';
  description?: ReactNode;
  label?: string;
  maxLength?: number;
  minLength?: number;
  name?: string;
  validate?: (value: string) => string | null;
}

/**
 * Password input with a show/hide toggle, shared by the sign-in and sign-up
 * forms. The toggle is a plain `<button>` rather than a HeroUI `Button` so it
 * can be absolutely positioned inside the input without inheriting button
 * padding; it is sized to the 44px minimum touch target.
 */
export function PasswordField({
  autoComplete,
  description,
  label = 'Password',
  maxLength,
  minLength,
  name = 'password',
  validate,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      isRequired
      fullWidth
      maxLength={maxLength}
      minLength={minLength}
      name={name}
      type={isVisible ? 'text' : 'password'}
      validate={validate}
    >
      <Label>{label}</Label>
      <div className="relative">
        <Input autoComplete={autoComplete} className="h-12 pe-14" />
        <button
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          className="absolute end-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
          onClick={() => setIsVisible((visible) => !visible)}
          type="button"
        >
          <EyeIcon isCrossedOut={isVisible} />
        </button>
      </div>
      {description ? <Description>{description}</Description> : null}
      <FieldError />
    </TextField>
  );
}
