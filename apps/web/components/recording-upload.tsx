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
  RECORDING_SAVE_FAILED_MESSAGE,
} from '@/lib/recording';

const FILE_INPUT_ID = 'recording-file';

const NO_FILE_MESSAGE = 'Choose a recording file to upload.';

interface RecordingUploadProps {
  meeting: Meeting;
  token: string;
  /** Receives the meeting as the API returned it after a successful upload. */
  onUploaded: (meeting: Meeting) => void;
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
  onUploaded,
  onUnauthorized,
}: RecordingUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUploadFailed, setHasUploadFailed] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const isSaved = meeting.recordingStatus === 'READY';
  // A meeting whose last upload failed server-side still needs the picker, so
  // only a saved recording hides it — until "Replace recording" asks for it.
  const isPickerVisible = !isSaved || isReplacing;

  const clearPicker = () => {
    setFile(null);
    setError(null);
    setHasUploadFailed(false);
    // The input keeps its own value; clearing state alone would leave the
    // previous file name showing under a fresh picker.
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setHasUploadFailed(false);
    // Validate on pick, not only on submit: a 2 GB upload is a long way to go
    // before being told the file was never eligible.
    setError(selected ? validateRecordingFile(selected) : null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError(NO_FILE_MESSAGE);
      return;
    }
    const rejection = validateRecordingFile(file);
    if (rejection) {
      setError(rejection);
      return;
    }

    setError(null);
    setIsUploading(true);

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
        setHasUploadFailed(true);
        setError(
          recordingUploadErrorMessage(response.status) ??
            RECORDING_SAVE_FAILED_MESSAGE,
        );
        return;
      }

      onUploaded((await response.json()) as Meeting);
      setIsReplacing(false);
      clearPicker();
    } catch {
      setHasUploadFailed(true);
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
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

      {meeting.recordingStatus === 'ERROR' && !isSaved ? (
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
          <FormErrorAlert message={error} />

          <div className="flex flex-col gap-2">
            {/* The native file input is hidden rather than styled: its button
                text comes from the browser locale, which lands a Russian
                "Выберите файл" in the middle of this English UI. The label is
                the visible control; `peer-focus-visible` puts the focus ring
                on it, since the input that actually holds focus is invisible. */}
            <input
              accept={RECORDING_FILE_ACCEPT}
              aria-describedby={`${FILE_INPUT_ID}-hint`}
              aria-invalid={error !== null}
              className="peer sr-only"
              disabled={isUploading}
              id={FILE_INPUT_ID}
              name="file"
              onChange={handleFileChange}
              ref={inputRef}
              type="file"
            />
            <div className="flex flex-wrap items-center gap-3">
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
            <p className="text-xs text-muted" id={`${FILE_INPUT_ID}-hint`}>
              MP4, WebM, MOV, MP3, WAV, M4A or OGG, up to 2 GB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-12"
              isPending={isUploading}
              size="lg"
              type="submit"
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  {isPending
                    ? 'Uploading…'
                    : hasUploadFailed
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
