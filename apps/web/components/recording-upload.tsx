'use client';

import { useRef, useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { FormErrorAlert } from '@/components/form-error-alert';
import { API_URL, NETWORK_ERROR_MESSAGE } from '@/lib/api';
import type { Meeting } from '@/lib/meetings';
import {
  formatFileSize,
  recordingUploadErrorMessage,
  validateRecordingFile,
  RECORDING_FILE_ACCEPT,
  RECORDING_NO_FILE_MESSAGE,
} from '@/lib/recording';

const FILE_INPUT_ID = 'recording-file';
const HINT_ID = `${FILE_INPUT_ID}-hint`;
const FILE_ERROR_ID = `${FILE_INPUT_ID}-error`;

interface RecordingUploadProps {
  meeting: Meeting;
  token: string;
  /**
   * Called right as the upload request is sent, so the page can reflect
   * `recordingStatus: 'UPLOADING'` immediately — the API sets that status at
   * the same moment, before it starts moving the file to storage.
   */
  onUploadStarted: () => void;
  /** Receives the meeting as the API returned it after a successful upload. */
  onUploaded: (meeting: Meeting) => void;
  /**
   * Called when the upload request itself fails (the API rejected it, or the
   * request never reached it) — not when the file was rejected before ever
   * being sent. Lets the page re-fetch the meeting's authoritative status.
   */
  onUploadFailed: () => void;
  /** Called when the API rejects the token, so the page can sign the user out. */
  onUnauthorized: () => void;
}

/**
 * The recording area of the meeting page: it shows the saved recording when
 * there is one, and otherwise a picker that uploads the chosen video/audio
 * file to `POST /meetings/:id/recording`. A rejected upload keeps the picker
 * in place with its message, so retrying is one click away.
 */
export function RecordingUpload({
  meeting,
  token,
  onUploadStarted,
  onUploaded,
  onUploadFailed,
  onUnauthorized,
}: RecordingUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Two kinds of failure, told apart by where they belong: a file this app
  // rejected before sending it is a problem with the field, and stays next to
  // the field; a rejection that came back from the API is a problem with the
  // submit, and goes to the alert that takes focus.
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const isSaved = meeting.recordingStatus === 'READY';
  // A meeting whose last upload failed server-side still needs the picker, so
  // only a saved recording hides it — until "Replace recording" asks for it.
  const isPickerVisible = !isSaved || isReplacing;
  // `recordingStatus: 'UPLOADING'` can be this tab's own request, or one the
  // status poll picked up from elsewhere — either way, a second upload for
  // the same meeting would only race the first at the same storage key.
  const isBusy = isUploading || meeting.recordingStatus === 'UPLOADING';

  const clearPicker = () => {
    setFile(null);
    setFileError(null);
    setUploadError(null);
    // The input keeps its own value; clearing state alone would leave the
    // previous file name showing under a fresh picker.
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setUploadError(null);
    // Validate on pick, not only on submit: 2 GiB is a long way to travel
    // before being told the file was never eligible.
    setFileError(selected ? validateRecordingFile(selected) : null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setFileError(RECORDING_NO_FILE_MESSAGE);
      return;
    }
    const rejection = validateRecordingFile(file);
    if (rejection) {
      setFileError(rejection);
      return;
    }

    setFileError(null);
    setUploadError(null);
    setIsUploading(true);
    onUploadStarted();

    try {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch(
        `${API_URL}/meetings/${meeting.id}/recording`,
        {
          method: 'POST',
          // No explicit Content-Type: the browser has to set the multipart
          // boundary itself.
          headers: { Authorization: `Bearer ${token}` },
          body,
        },
      );

      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) {
        setUploadError(recordingUploadErrorMessage(response.status));
        onUploadFailed();
        return;
      }

      onUploaded((await response.json()) as Meeting);
      setIsReplacing(false);
      clearPicker();
    } catch {
      setUploadError(NETWORK_ERROR_MESSAGE);
      onUploadFailed();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* One live region for all three status alerts: recordingStatus can
          change from a poll picking up someone else's upload, not just this
          tab's own submit, so the transition needs to reach a screen reader
          without depending on focus already being here. */}
      <div aria-atomic="true" aria-live="polite">
        {meeting.recordingStatus === 'UPLOADING' ? (
          <Alert status="accent">
            <Alert.Indicator>
              <Spinner color="current" size="sm" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Uploading recording…</Alert.Title>
              <Alert.Description>
                This can take a while for a large file. This page updates on its
                own once it finishes.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {isSaved ? (
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Recording saved</Alert.Title>
              <Alert.Description>
                This meeting has a recording stored and ready.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {meeting.recordingStatus === 'ERROR' ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>The last upload did not finish</Alert.Title>
              <Alert.Description>
                Nothing is stored for this meeting yet. Upload the recording
                again.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </div>

      {isSaved && !isReplacing ? (
        <Button
          className="h-12 self-start"
          onPress={() => setIsReplacing(true)}
          size="lg"
          variant="tertiary"
        >
          Replace recording
        </Button>
      ) : null}

      {isPickerVisible ? (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FormErrorAlert message={uploadError} />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              {/* The native file input is hidden rather than styled: its own
                  button text comes from the browser locale, which lands a
                  Russian "Выберите файл" in the middle of this English UI. The
                  label is the visible control, and it has to stay a sibling of
                  the input — `peer-*` compiles to a sibling combinator, so
                  nesting it one level deeper silently drops the focus ring
                  from the only thing the user can see. */}
              <input
                accept={RECORDING_FILE_ACCEPT}
                aria-describedby={
                  fileError ? `${FILE_ERROR_ID} ${HINT_ID}` : HINT_ID
                }
                aria-invalid={fileError !== null}
                className="peer sr-only"
                disabled={isBusy}
                id={FILE_INPUT_ID}
                name="file"
                onChange={handleFileChange}
                ref={inputRef}
                type="file"
              />
              <label
                className="inline-flex h-12 cursor-pointer items-center rounded-full border border-field-border px-5 text-sm font-medium text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                htmlFor={FILE_INPUT_ID}
              >
                Choose recording file
              </label>
              <span className="text-sm text-foreground">
                {file
                  ? `${file.name} · ${formatFileSize(file.size)}`
                  : 'No file chosen'}
              </span>
            </div>

            {fileError ? (
              // Announced where it happened, and without pulling focus off the
              // picker the way the submit-failure alert does — the user is
              // still in the middle of choosing a file.
              <p
                className="text-sm text-danger-soft-foreground"
                id={FILE_ERROR_ID}
                role="alert"
              >
                {fileError}
              </p>
            ) : null}

            <p className="text-xs text-muted" id={HINT_ID}>
              MP4, WebM, MOV, MP3, WAV, M4A or OGG, up to 2 GiB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-12"
              isDisabled={isBusy}
              isPending={isUploading}
              size="lg"
              type="submit"
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  {isPending
                    ? 'Uploading…'
                    : uploadError
                      ? 'Try again'
                      : 'Upload recording'}
                </>
              )}
            </Button>

            {isSaved && isReplacing && !isUploading ? (
              <Button
                className="h-12"
                onPress={() => {
                  setIsReplacing(false);
                  clearPicker();
                }}
                size="lg"
                type="button"
                variant="tertiary"
              >
                Cancel
              </Button>
            ) : null}
          </div>

          {/* Announced rather than only drawn, so the upload state reaches a
              screen reader as it changes. */}
          <p aria-live="polite" className="text-sm text-muted">
            {isUploading ? 'Uploading the recording…' : ''}
          </p>
        </form>
      ) : null}
    </div>
  );
}
