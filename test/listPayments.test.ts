import { APIGatewayProxyEvent } from 'aws-lambda';

import * as payments from '../src/lib/payments';
import { handler } from '../src/listPayments';

describe('When the user lists payments', () => {
  it('Returns all payments when no filter is provided', async () => {
    const mockPayments = [
      { paymentId: 'id-1', amount: 1000, currency: 'USD' },
      { paymentId: 'id-2', amount: 2000, currency: 'EUR' },
      { paymentId: 'id-3', amount: 3000, currency: 'GBP' },
    ];

    const listPaymentsMock = jest
      .spyOn(payments, 'listPayments')
      .mockResolvedValueOnce(mockPayments);

    const result = await handler({
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.data).toEqual(mockPayments);

    expect(listPaymentsMock).toHaveBeenCalledWith(undefined);
  });

  it('Returns empty array when no payments exist', async () => {
    const listPaymentsMock = jest.spyOn(payments, 'listPayments').mockResolvedValueOnce([]);

    const result = await handler({
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.data).toEqual([]);

    expect(listPaymentsMock).toHaveBeenCalledWith(undefined);
  });

  it('Filters payments by currency when currency parameter is provided', async () => {
    const mockPayments = [
      { paymentId: 'id-1', amount: 1000, currency: 'USD' },
      { paymentId: 'id-2', amount: 1500, currency: 'USD' },
    ];

    const listPaymentsMock = jest
      .spyOn(payments, 'listPayments')
      .mockResolvedValueOnce(mockPayments);

    const result = await handler({
      queryStringParameters: {
        currency: 'USD',
      },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.data).toEqual(mockPayments);

    expect(listPaymentsMock).toHaveBeenCalledWith('USD');
  });

  it('Returns empty array when no payments match the currency filter', async () => {
    const listPaymentsMock = jest.spyOn(payments, 'listPayments').mockResolvedValueOnce([]);

    const result = await handler({
      queryStringParameters: {
        currency: 'JPY',
      },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.data).toEqual([]);

    expect(listPaymentsMock).toHaveBeenCalledWith('JPY');
  });

  it('Handles different currency codes correctly', async () => {
    const listPaymentsMock = jest.spyOn(payments, 'listPayments').mockResolvedValue([]);

    const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'SGD', 'JPY', 'CAD'];

    for (const currency of currencies) {
      await handler({
        queryStringParameters: { currency },
      } as unknown as APIGatewayProxyEvent);
    }

    expect(listPaymentsMock).toHaveBeenCalledTimes(currencies.length);
    currencies.forEach((currency) => {
      expect(listPaymentsMock).toHaveBeenCalledWith(currency);
    });
  });

  it('Handles case-sensitive currency filtering', async () => {
    const listPaymentsMock = jest.spyOn(payments, 'listPayments').mockResolvedValueOnce([]);

    const result = await handler({
      queryStringParameters: {
        currency: 'usd',
      },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);

    // Should pass lowercase to the function (no validation at handler level)
    expect(listPaymentsMock).toHaveBeenCalledWith('usd');
  });

  it('Ignores other query parameters', async () => {
    const mockPayments = [{ paymentId: 'id-1', amount: 1000, currency: 'USD' }];

    const listPaymentsMock = jest
      .spyOn(payments, 'listPayments')
      .mockResolvedValueOnce(mockPayments);

    const result = await handler({
      queryStringParameters: {
        currency: 'USD',
        limit: '10',
        offset: '0',
      },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.data).toEqual(mockPayments);

    // Should only use currency parameter
    expect(listPaymentsMock).toHaveBeenCalledWith('USD');
  });

  it('Returns 500 when database operation fails', async () => {
    const listPaymentsMock = jest
      .spyOn(payments, 'listPayments')
      .mockRejectedValueOnce(new Error('Database connection failed'));

    const result = await handler({
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toContain('error occurred');

    expect(listPaymentsMock).toHaveBeenCalled();
  });

  it('Returns correct CORS headers', async () => {
    jest.spyOn(payments, 'listPayments').mockResolvedValueOnce([]);

    const result = await handler({
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent);

    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
    expect(result.headers).toHaveProperty('Access-Control-Allow-Credentials', true);
  });

  it('Handles empty queryStringParameters object', async () => {
    const mockPayments = [{ paymentId: 'id-1', amount: 1000, currency: 'USD' }];

    const listPaymentsMock = jest
      .spyOn(payments, 'listPayments')
      .mockResolvedValueOnce(mockPayments);

    const result = await handler({
      queryStringParameters: {},
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body) as Record<string, unknown>;
    expect(body.data).toEqual(mockPayments);

    expect(listPaymentsMock).toHaveBeenCalledWith(undefined);
  });
});

afterEach(() => {
  jest.clearAllMocks();
});
