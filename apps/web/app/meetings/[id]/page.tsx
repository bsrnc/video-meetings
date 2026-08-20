'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Card, Spinner } from '@heroui/react';
import { AppHeader } from '@/components/app-header';
import { RecordingUpload } from '@/components/recording-upload';
import { useSession } from '@/hooks/use-session';
import { API_URL, NETWORK_ERROR_MESSAGE, parseErrorMessage } from '@/lib/api';
import type { Meeting } from '@/lib/meetings';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const NOT_FOUND_MESSAGE = 'This meeting does not exist, or it was deleted.';

export default function MeetingPage({ params }: PageProps<'/meetings/[id]'>) {
  const { id } = use(params);
  const { token, email, signOut } = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) {
      return;
    }

    let isStale = false;
    void (async () => {
      try {
        const response = await fetch(`${API_URL}/meetings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          signOut();
          return;
        }
        if (!response.ok) {
          // The API answers 404 in English already, but its copy ("Meeting not
          // found") reads like a failure rather than an explanation.
          const message =
            response.status === 404
              ? NOT_FOUND_MESSAGE
              : await parseErrorMessage(response);
          if (!isStale) {
            setLoadError(message);
          }
          return;
        }

        const data = (await response.json()) as Meeting;
        if (!isStale) {
          setMeeting(data);
        }
      } catch {
        if (!isStale) {
          setLoadError(NETWORK_ERROR_MESSAGE);
        }
      }
    })();

    return () => {
      isStale = true;
    };
  }, [email, id, signOut, token]);

  // Nothing is rendered until the gate has run, so a signed-out visitor never
  // sees the page contents flash before the redirect.
  if (!token || !email) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Spinner aria-label="Checking your session" size="lg" />
      </main>
    );
  }

  return (
    <>
      <AppHeader onSignOut={signOut} />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        <Link className="link self-start text-sm underline" href="/">
          ← All meetings
        </Link>

        {loadError ? (
          <div role="alert">
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{loadError}</Alert.Title>
              </Alert.Content>
            </Alert>
          </div>
        ) : null}

        {meeting === null && loadError === null ? (
          <div className="flex justify-center py-10">
            <Spinner aria-label="Loading meeting" size="lg" />
          </div>
        ) : null}

        {meeting ? (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl leading-8 font-semibold text-foreground">
                {meeting.title}
              </h1>
              <p className="text-sm text-muted">
                Created{' '}
                <time dateTime={meeting.createdAt}>
                  {dateFormatter.format(new Date(meeting.createdAt))}
                </time>
              </p>
            </div>

            <Card className="gap-4 p-6">
              <Card.Header className="gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  Recording
                </h2>
                <Card.Description>
                  The meeting recording, stored for transcription and analysis.
                </Card.Description>
              </Card.Header>

              <Card.Content>
                <RecordingUpload
                  meeting={meeting}
                  onUnauthorized={signOut}
                  onUploaded={setMeeting}
                  token={token}
                />
              </Card.Content>
            </Card>
          </>
        ) : null}
      </main>
    </>
  );
}
