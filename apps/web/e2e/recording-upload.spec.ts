import { expect, test, type Page, type Route } from '@playwright/test';
import { API_URL } from '../playwright.config';

const MEETING_ID = '11111111-2222-3333-4444-555555555555';
const MEETING_URL = `${API_URL}/meetings/${MEETING_ID}`;
const RECORDING_URL = `${MEETING_URL}/recording`;

const UNSUPPORTED_TYPE_MESSAGE =
  'That file is not a supported recording. Choose an MP4, WebM, MOV, MP3, WAV, M4A or OGG file.';

const TOO_LARGE_MESSAGE =
  'That file is larger than the 2 GiB limit. Choose a smaller recording.';

interface MeetingResponse {
  id: string;
  title: string;
  createdAt: string;
  recordingKey: string | null;
  recordingStatus: 'UPLOADING' | 'READY' | 'ERROR' | null;
  recordingError: string | null;
}

const meetingWithoutRecording: MeetingResponse = {
  id: MEETING_ID,
  title: 'Weekly sync',
  createdAt: '2026-08-20T09:00:00.000Z',
  recordingKey: null,
  recordingStatus: null,
  recordingError: null,
};

const meetingWithRecording: MeetingResponse = {
  ...meetingWithoutRecording,
  recordingKey: `meetings/${MEETING_ID}/recording`,
  recordingStatus: 'READY',
};

/**
 * The app decodes the JWT payload without verifying the signature, so a token
 * that merely looks the part is enough to get past the client-side gate. The
 * API is mocked here, so nothing ever checks it.
 */
function fakeAccessToken(): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({
      sub: 'e2e-user',
      email: 'e2e@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    'not-a-real-signature',
  ].join('.');
}

/** A real 8-bit mono WAV — small, and valid down to its magic bytes. */
function wavFile() {
  const samples = Buffer.alloc(256, 0x80);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples.length, 40);
  return {
    name: 'weekly-sync.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.concat([header, samples]),
  };
}

// Passes the browser's own type check and the app's, so only the API's
// magic-byte check can reject it — the "spoofed extension" path.
const spoofedVideoFile = {
  name: 'weekly-sync.mp4',
  mimeType: 'video/mp4',
  buffer: Buffer.from('this is not an mp4 at all'),
};

const textFile = {
  name: 'notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('these are just notes'),
};

// Every mocked response is cross-origin to the page, so it needs the CORS
// headers the real API sends via `app.enableCors()`.
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  });
}

/** Answers the preflight the browser sends before the multipart POST. */
async function fulfillPreflight(route: Route) {
  await route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
}

async function signIn(page: Page) {
  await page.addInitScript((token: string) => {
    window.localStorage.setItem('accessToken', token);
  }, fakeAccessToken());
}

test.describe('meeting recording upload', () => {
  test('uploads a valid recording and shows the saved state', async ({
    page,
  }) => {
    await signIn(page);

    let stored = meetingWithoutRecording;
    const uploadedFileNames: string[] = [];

    await page.route(MEETING_URL, (route) => fulfillJson(route, 200, stored));
    await page.route(RECORDING_URL, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillPreflight(route);
        return;
      }
      // The file has to actually reach the request as multipart form data.
      uploadedFileNames.push(
        route.request().postDataBuffer()?.includes('weekly-sync.wav')
          ? 'weekly-sync.wav'
          : 'unknown',
      );
      stored = meetingWithRecording;
      await fulfillJson(route, 201, stored);
    });

    await page.goto(`/meetings/${MEETING_ID}`);
    await expect(
      page.getByRole('heading', { name: 'Weekly sync' }),
    ).toBeVisible();

    await page.locator('#recording-file').setInputFiles(wavFile());
    await expect(page.getByText('weekly-sync.wav ·')).toBeVisible();

    await page.getByRole('button', { name: 'Upload recording' }).click();

    await expect(page.getByText('Recording saved')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Replace recording' }),
    ).toBeVisible();
    expect(uploadedFileNames).toEqual(['weekly-sync.wav']);
  });

  test('reports a rejected file and lets the upload be retried', async ({
    page,
  }) => {
    await signIn(page);

    let stored = meetingWithoutRecording;
    let isFileSupported = false;

    await page.route(MEETING_URL, (route) => fulfillJson(route, 200, stored));
    await page.route(RECORDING_URL, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillPreflight(route);
        return;
      }
      if (!isFileSupported) {
        // What the API answers when its magic-byte check fails.
        await fulfillJson(route, 415, {
          statusCode: 415,
          message: 'Недопустимый тип файла: text/plain',
        });
        return;
      }
      stored = meetingWithRecording;
      await fulfillJson(route, 201, stored);
    });

    await page.goto(`/meetings/${MEETING_ID}`);

    await page.locator('#recording-file').setInputFiles(spoofedVideoFile);
    await page.getByRole('button', { name: 'Upload recording' }).click();

    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      UNSUPPORTED_TYPE_MESSAGE,
    );
    await expect(page.getByText('Recording saved')).toBeHidden();

    // The picker is still there, so a second attempt is one click away.
    isFileSupported = true;
    await page.locator('#recording-file').setInputFiles(wavFile());
    await page.getByRole('button', { name: 'Upload recording' }).click();

    await expect(page.getByText('Recording saved')).toBeVisible();
  });

  test('rejects a file the API could never accept without uploading it', async ({
    page,
  }) => {
    await signIn(page);

    let uploadAttempts = 0;

    await page.route(MEETING_URL, (route) =>
      fulfillJson(route, 200, meetingWithoutRecording),
    );
    await page.route(RECORDING_URL, async (route) => {
      uploadAttempts += 1;
      await fulfillJson(route, 201, meetingWithRecording);
    });

    await page.goto(`/meetings/${MEETING_ID}`);

    await page.locator('#recording-file').setInputFiles(textFile);

    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      UNSUPPORTED_TYPE_MESSAGE,
    );

    // Submitting anyway must not send it either — the pick-time check and the
    // submit-time check are separate guards, and only this proves the second.
    await page.getByRole('button', { name: 'Upload recording' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      UNSUPPORTED_TYPE_MESSAGE,
    );
    expect(uploadAttempts).toBe(0);
  });

  test('reports a file the API rejects as too large', async ({ page }) => {
    await signIn(page);

    await page.route(MEETING_URL, (route) =>
      fulfillJson(route, 200, meetingWithoutRecording),
    );
    await page.route(RECORDING_URL, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillPreflight(route);
        return;
      }
      // The API's own 413 body, message and all.
      await fulfillJson(route, 413, {
        statusCode: 413,
        message: 'Файл записи превышает допустимый размер',
      });
    });

    await page.goto(`/meetings/${MEETING_ID}`);

    // The limit itself is not exercised here: it takes 2 GiB to cross, and
    // what needs covering is that a 413 is reported in this app's own words.
    await page.locator('#recording-file').setInputFiles(wavFile());
    await page.getByRole('button', { name: 'Upload recording' }).click();

    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      TOO_LARGE_MESSAGE,
    );
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
