import {
  ArgumentsHost,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { MulterExceptionFilter } from './multer-exception.filter';

interface JsonErrorBody {
  statusCode: number;
  message: string;
}

function fakeHost(): {
  host: ArgumentsHost;
  json: jest.Mock<void, [JsonErrorBody]>;
  status: jest.Mock;
} {
  const json = jest.fn<void, [JsonErrorBody]>();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('MulterExceptionFilter', () => {
  it('maps PayloadTooLargeException (what FileInterceptor throws for LIMIT_FILE_SIZE) to 413 with a clear message', () => {
    const filter = new MulterExceptionFilter();
    const { host, json, status } = fakeHost();

    filter.catch(new PayloadTooLargeException('File too large'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(typeof body.message).toBe('string');
    expect(body.message).not.toBe('File too large');
  });
});
