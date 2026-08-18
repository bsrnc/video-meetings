export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Nest's exception filter puts the human-readable reason in `message`, which is
 * a string for thrown exceptions and an array of strings for ValidationPipe
 * failures.
 */
export async function parseErrorMessage(response: Response): Promise<string> {
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

export const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Please try again.';
