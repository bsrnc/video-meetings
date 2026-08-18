'use client';

import { useState } from 'react';
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Spinner,
  TextField,
  type UseOverlayStateReturn,
} from '@heroui/react';
import { FormErrorAlert } from '@/components/form-error-alert';
import { API_URL, NETWORK_ERROR_MESSAGE, parseErrorMessage } from '@/lib/api';
import type { Meeting } from '@/lib/meetings';

interface CreateMeetingDialogProps {
  onCreated: (meeting: Meeting) => void;
  /** Called when the API rejects the token, so the page can sign the user out. */
  onUnauthorized: () => void;
  state: UseOverlayStateReturn;
  token: string;
}

export function CreateMeetingDialog({
  onCreated,
  onUnauthorized,
  state,
  token,
}: CreateMeetingDialogProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const close = () => {
    setTitle('');
    setServerError(null);
    state.close();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      if (!response.ok) {
        setServerError(await parseErrorMessage(response));
        return;
      }

      onCreated((await response.json()) as Meeting);
      close();
    } catch {
      setServerError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={state.isOpen}
      onOpenChange={(isOpen) => (isOpen ? state.open() : close())}
    >
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Heading>New meeting</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>

              <Modal.Body className="gap-5">
                <FormErrorAlert message={serverError} />

                <TextField
                  isRequired
                  autoFocus
                  fullWidth
                  name="title"
                  onChange={setTitle}
                  value={title}
                  validate={(value) =>
                    value.trim() === '' ? 'Enter a meeting title' : null
                  }
                >
                  <Label>Title</Label>
                  <Input className="h-12" placeholder="Weekly sync" />
                  <FieldError />
                </TextField>
              </Modal.Body>

              <Modal.Footer className="gap-3">
                <Button
                  className="h-12"
                  onPress={close}
                  size="lg"
                  type="button"
                  variant="tertiary"
                >
                  Cancel
                </Button>
                <Button
                  className="h-12"
                  isPending={isSubmitting}
                  size="lg"
                  type="submit"
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? 'Creating…' : 'Create meeting'}
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
