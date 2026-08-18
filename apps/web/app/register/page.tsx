'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const MIN_PASSWORD_LENGTH = 8;
// bcrypt silently truncates anything past 72 bytes, so reject it up front.
const MAX_PASSWORD_LENGTH = 72;

function validateEmail(value: string) {
  if (value.trim() === '') {
    return 'Enter your email address';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address, for example you@example.com';
  }
  return null;
}

function validatePassword(value: string) {
  if (value === '') {
    return 'Enter a password';
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`;
  }
  return null;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    // response had no JSON body
  }
  return 'Something went wrong. Please try again.';
}

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

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const serverErrorRef = useRef<HTMLDivElement>(null);

  // Move focus to the alert so the failure is announced and reachable, instead
  // of leaving focus on the body after a failed submit.
  useEffect(() => {
    if (serverError) {
      serverErrorRef.current?.focus();
    }
  }, [serverError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setServerError(await parseErrorMessage(response));
        return;
      }

      const { accessToken } = (await response.json()) as {
        accessToken: string;
      };
      localStorage.setItem('accessToken', accessToken);
      router.push('/');
    } catch {
      setServerError('Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-sm gap-6 p-6">
        <Card.Header className="gap-2">
          <h1 className="text-xl leading-7 font-semibold text-foreground">
            Create your account
          </h1>
          <Card.Description>
            Sign up with your email to start scheduling meetings.
          </Card.Description>
        </Card.Header>

        <Card.Content className="gap-0">
          <Form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {serverError ? (
              <div ref={serverErrorRef} role="alert" tabIndex={-1}>
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{serverError}</Alert.Title>
                  </Alert.Content>
                </Alert>
              </div>
            ) : null}

            <TextField
              isRequired
              fullWidth
              name="email"
              type="email"
              validate={validateEmail}
            >
              <Label>Email</Label>
              <Input
                autoComplete="email"
                className="h-12"
                placeholder="you@example.com"
              />
              <FieldError />
            </TextField>

            <TextField
              isRequired
              fullWidth
              maxLength={MAX_PASSWORD_LENGTH}
              minLength={MIN_PASSWORD_LENGTH}
              name="password"
              type={isPasswordVisible ? 'text' : 'password'}
              validate={validatePassword}
            >
              <Label>Password</Label>
              <div className="relative">
                <Input autoComplete="new-password" className="h-12 pe-14" />
                <button
                  aria-label={
                    isPasswordVisible ? 'Hide password' : 'Show password'
                  }
                  aria-pressed={isPasswordVisible}
                  className="absolute end-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  <EyeIcon isCrossedOut={isPasswordVisible} />
                </button>
              </div>
              <Description>
                Must be at least {MIN_PASSWORD_LENGTH} characters.
              </Description>
              <FieldError />
            </TextField>

            {/* `size="lg"` resolves to 40px in @heroui/styles 3.2.4, under the
                44px minimum touch target, so the height is set explicitly. */}
            <Button
              fullWidth
              className="h-12"
              isPending={isSubmitting}
              size="lg"
              type="submit"
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  {isPending ? 'Creating account…' : 'Create account'}
                </>
              )}
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </main>
  );
}
