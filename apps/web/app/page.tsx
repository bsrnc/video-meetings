'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Spinner, useOverlayState } from '@heroui/react';
import { AppHeader } from '@/components/app-header';
import { CreateMeetingDialog } from '@/components/create-meeting-dialog';
import { useSession } from '@/hooks/use-session';
import { API_URL, NETWORK_ERROR_MESSAGE, parseErrorMessage } from '@/lib/api';
import { sortByNewest, type Meeting } from '@/lib/meetings';

const RECENT_MEETINGS_COUNT = 3;

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function HomePage() {
  const createDialog = useOverlayState();
  const { token, email, signOut } = useSession();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) {
      return;
    }

    let isStale = false;
    void (async () => {
      try {
        const response = await fetch(`${API_URL}/meetings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          signOut();
          return;
        }
        if (!response.ok) {
          if (!isStale) {
            setLoadError(await parseErrorMessage(response));
          }
          return;
        }

        const data = (await response.json()) as Meeting[];
        if (!isStale) {
          setMeetings(sortByNewest(data));
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
  }, [email, signOut, token]);

  // Nothing is rendered until the gate has run, so a signed-out visitor never
  // sees the page contents flash before the redirect.
  if (!token || !email) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Spinner aria-label="Checking your session" size="lg" />
      </main>
    );
  }

  const recentMeetings = meetings?.slice(0, RECENT_MEETINGS_COUNT) ?? [];

  return (
    <>
      <AppHeader onSignOut={signOut} />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl leading-8 font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-muted">
            Signed in as <span className="text-foreground">{email}</span>
          </p>
        </div>

        {loadError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{loadError}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}

        <Card className="gap-4 p-6">
          <Card.Header className="gap-1">
            <h2 className="text-sm font-medium text-muted">Meetings</h2>
            <p
              aria-busy={meetings === null && loadError === null}
              className="text-3xl leading-9 font-semibold text-foreground"
            >
              {meetings === null ? '—' : meetings.length}
            </p>
          </Card.Header>
          <Card.Footer>
            <Button className="h-12" onPress={createDialog.open} size="lg">
              Create meeting
            </Button>
          </Card.Footer>
        </Card>

        <Card className="gap-4 p-6">
          <Card.Header className="gap-1">
            <h2 className="text-base font-semibold text-foreground">
              Recent meetings
            </h2>
            <Card.Description>
              The {RECENT_MEETINGS_COUNT} most recently created meetings.
            </Card.Description>
          </Card.Header>

          <Card.Content>
            {meetings === null && loadError === null ? (
              <div className="flex justify-center py-4">
                <Spinner aria-label="Loading meetings" />
              </div>
            ) : recentMeetings.length === 0 ? (
              <p className="py-2 text-sm text-muted">
                No meetings yet. Create your first one.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-separator">
                {recentMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <Link
                      className="flex flex-col gap-0.5 py-3 no-underline hover:underline"
                      href={`/meetings/${meeting.id}`}
                    >
                      <span className="text-sm font-medium text-foreground">
                        {meeting.title}
                      </span>
                      <time
                        className="text-xs text-muted no-underline"
                        dateTime={meeting.createdAt}
                      >
                        {dateFormatter.format(new Date(meeting.createdAt))}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card>
      </main>

      <CreateMeetingDialog
        onCreated={(meeting) =>
          setMeetings((current) => sortByNewest([...(current ?? []), meeting]))
        }
        onUnauthorized={signOut}
        state={createDialog}
        token={token}
      />
    </>
  );
}
