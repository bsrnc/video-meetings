'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import { FormErrorAlert } from '@/components/form-error-alert';
import { PasswordField } from '@/components/password-field';
import { API_URL, NETWORK_ERROR_MESSAGE, parseErrorMessage } from '@/lib/api';
import { storeToken } from '@/lib/auth';
import { validateEmail, validateExistingPassword } from '@/lib/validation';

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
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
      storeToken(accessToken);
      router.push('/');
    } catch {
      setServerError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-sm gap-6 p-6">
        <Card.Header className="gap-2">
          <h1 className="text-xl leading-7 font-semibold text-foreground">
            Sign in
          </h1>
          <Card.Description>
            Enter your email and password to reach your meetings.
          </Card.Description>
        </Card.Header>

        <Card.Content className="gap-0">
          <Form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <FormErrorAlert message={serverError} />

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

            <PasswordField
              autoComplete="current-password"
              validate={validateExistingPassword}
            />

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
                  {isPending ? 'Signing in…' : 'Sign in'}
                </>
              )}
            </Button>
          </Form>
        </Card.Content>

        <Card.Footer className="justify-center">
          <p className="text-sm text-muted">
            No account yet?{' '}
            <Link className="link underline" href="/register">
              Create one
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </main>
  );
}
