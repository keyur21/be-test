import { APIGatewayProxyEvent } from 'aws-lambda';

import { handler } from '../src/createPayment';
import * as payments from '../src/lib/payments';

// Mock randomUUID to return predictable values in tests
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-12345'),
}));

describe('When the user creates a new payment', () => {
  it('Generates a unique ID and returns it to the user', async () => {
    const mockPayment = {
      paymentId: 'test-uuid-12345',
      amount: 1000,
      currency: 'USD',
    };

    const createPaymentMock = jest.spyOn(payments, 'createPayment').mockResolvedValueOnce();
    const getPaymentMock = jest.spyOn(payments, 'getPayment').mockResolvedValueOnce(mockPayment);

    const result = await handler({
      body: JSON.stringify({
        amount: 1000,
        currency: 'USD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.paymentId).toBe('test-uuid-12345');
    expect(body.amount).toBe(1000);
    expect(body.currency).toBe('USD');

    // Verify createPayment was called with generated ID
    expect(createPaymentMock).toHaveBeenCalledWith({
      paymentId: 'test-uuid-12345',
      amount: 1000,
      currency: 'USD',
    });

    // Verify getPayment was called to fetch the stored payment
    expect(getPaymentMock).toHaveBeenCalledWith('test-uuid-12345');
  });

  it('Ignores user-provided ID and generates its own', async () => {
    const mockPayment = {
      paymentId: 'test-uuid-12345',
      amount: 500,
      currency: 'EUR',
    };

    const createPaymentMock = jest.spyOn(payments, 'createPayment').mockResolvedValueOnce();
    const getPaymentMock = jest.spyOn(payments, 'getPayment').mockResolvedValueOnce(mockPayment);

    const result = await handler({
      body: JSON.stringify({
        id: 'user-provided-id',
        amount: 500,
        currency: 'EUR',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    // Should use generated ID, not user-provided
    expect(body.paymentId).toBe('test-uuid-12345');
    expect(body.paymentId).not.toBe('user-provided-id');

    expect(createPaymentMock).toHaveBeenCalledWith({
      paymentId: 'test-uuid-12345',
      amount: 500,
      currency: 'EUR',
    });

    expect(getPaymentMock).toHaveBeenCalledWith('test-uuid-12345');
  });

  it('Returns 422 when amount is missing', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        currency: 'GBP',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('Amount is required');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when amount is not a number', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: 'invalid',
        currency: 'AUD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('Amount must be a number');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when amount is zero', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: 0,
        currency: 'USD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('greater than zero');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when amount is negative', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: -100,
        currency: 'USD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('greater than zero');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when amount is not finite (NaN)', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: '{"amount": NaN, "currency": "USD"}',
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    // NaN will be parsed as undefined/null, so it will fail the "required" check
    expect(body.message).toContain('Amount');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when currency is missing', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: 2000,
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('Currency is required');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when currency is not a string', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: 1500,
        currency: 123,
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('Currency must be a string');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when currency format is invalid (lowercase)', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: 1000,
        currency: 'usd',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('3-letter uppercase ISO code');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when currency format is invalid (too short)', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: 1000,
        currency: 'US',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('3-letter uppercase ISO code');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when currency is not supported', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: JSON.stringify({
        amount: 1000,
        currency: 'XYZ',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');
    expect(body.message).toContain('not supported');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when body is empty', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: '',
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Returns 422 when body is null', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment');

    const result = await handler({
      body: null,
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(422);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Unprocessable Entity');

    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('Handles different currency codes correctly', async () => {
    const createPaymentMock = jest.spyOn(payments, 'createPayment').mockResolvedValue();

    const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'SGD', 'JPY', 'CAD'];

    for (const currency of currencies) {
      const mockPayment = {
        paymentId: 'test-uuid-12345',
        amount: 1000,
        currency,
      };
      jest.spyOn(payments, 'getPayment').mockResolvedValueOnce(mockPayment);

      const result = await handler({
        body: JSON.stringify({
          amount: 1000,
          currency,
        }),
      } as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body) as Record<string, unknown>;
      expect(body.currency).toBe(currency);
    }

    expect(createPaymentMock).toHaveBeenCalledTimes(currencies.length);
  });

  it('Handles decimal amounts correctly', async () => {
    const mockPayment = {
      paymentId: 'test-uuid-12345',
      amount: 99.99,
      currency: 'USD',
    };

    const createPaymentMock = jest.spyOn(payments, 'createPayment').mockResolvedValueOnce();
    jest.spyOn(payments, 'getPayment').mockResolvedValueOnce(mockPayment);

    const result = await handler({
      body: JSON.stringify({
        amount: 99.99,
        currency: 'USD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.amount).toBe(99.99);

    expect(createPaymentMock).toHaveBeenCalledWith({
      paymentId: 'test-uuid-12345',
      amount: 99.99,
      currency: 'USD',
    });
  });

  it('Returns 500 when database operation fails', async () => {
    const createPaymentMock = jest
      .spyOn(payments, 'createPayment')
      .mockRejectedValueOnce(new Error('Database connection failed'));

    const result = await handler({
      body: JSON.stringify({
        amount: 1000,
        currency: 'USD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toContain('error occurred');

    expect(createPaymentMock).toHaveBeenCalled();
  });

  it('Returns correct CORS headers', async () => {
    const mockPayment = {
      paymentId: 'test-uuid-12345',
      amount: 1000,
      currency: 'USD',
    };

    jest.spyOn(payments, 'createPayment').mockResolvedValueOnce();
    jest.spyOn(payments, 'getPayment').mockResolvedValueOnce(mockPayment);

    const result = await handler({
      body: JSON.stringify({
        amount: 1000,
        currency: 'USD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    expect(result.headers).toHaveProperty('Access-Control-Allow-Credentials', true);
  });

  it('Returns 500 when payment is not found after creation', async () => {
    jest.spyOn(payments, 'createPayment').mockResolvedValueOnce();
    jest.spyOn(payments, 'getPayment').mockResolvedValueOnce(null);

    const result = await handler({
      body: JSON.stringify({
        amount: 1000,
        currency: 'USD',
      }),
    } as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toContain('verification failed');
  });
});

afterEach(() => {
  jest.clearAllMocks();
});
