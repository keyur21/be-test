import { DocumentClient } from '../src/lib/dynamodb';
import { createPayment, getPayment, listPayments, Payment } from '../src/lib/payments';

// Mock the entire dynamodb module
jest.mock('../src/lib/dynamodb', () => ({
  DocumentClient: {
    send: jest.fn(),
  },
}));

// Get the mocked send function with proper typing
const mockSend = (DocumentClient as unknown as { send: jest.Mock }).send;

describe('payments.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPayment', () => {
    it('returns the payment when found', async () => {
      const payment: Payment = { paymentId: 'p-1', amount: 1000, currency: 'USD' };
      mockSend.mockResolvedValueOnce({ Item: payment });

      const result = await getPayment('p-1');
      expect(result).toEqual(payment);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('returns null when not found', async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await getPayment('missing');
      expect(result).toBeNull();
    });

    it('propagates underlying errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('DDB error'));
      await expect(getPayment('p-err')).rejects.toThrow('DDB error');
    });
  });

  describe('listPayments', () => {
    it('returns all payments when no currency is provided', async () => {
      const payments: Payment[] = [
        { paymentId: 'p-1', amount: 100, currency: 'USD' },
        { paymentId: 'p-2', amount: 200, currency: 'EUR' },
      ];
      mockSend.mockResolvedValueOnce({ Items: payments });

      const result = await listPayments();
      expect(result).toEqual(payments);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('returns empty list when no items', async () => {
      mockSend.mockResolvedValueOnce({ Items: undefined });
      const result = await listPayments();
      expect(result).toEqual([]);
    });

    it('returns filtered payments when currency is provided', async () => {
      const payments: Payment[] = [
        { paymentId: 'u-1', amount: 150, currency: 'USD' },
        { paymentId: 'u-2', amount: 250, currency: 'USD' },
      ];
      mockSend.mockResolvedValueOnce({ Items: payments });

      const result = await listPayments('USD');
      expect(result).toEqual(payments);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('propagates errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Scan error'));
      await expect(listPayments()).rejects.toThrow('Scan error');
    });
  });

  describe('createPayment', () => {
    it('sends the payment to be created', async () => {
      const payment: Payment = { paymentId: 'new-1', amount: 999, currency: 'EUR' };
      mockSend.mockResolvedValueOnce({});

      await createPayment(payment);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('handles decimals and large amounts', async () => {
      mockSend.mockResolvedValue({});

      await createPayment({ paymentId: 'd-1', amount: 99.99, currency: 'USD' });
      await createPayment({ paymentId: 'l-1', amount: 999999999, currency: 'USD' });

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('propagates errors on write', async () => {
      mockSend.mockRejectedValueOnce(new Error('Write error'));
      await expect(
        createPayment({ paymentId: 'e-1', amount: 10, currency: 'USD' })
      ).rejects.toThrow('Write error');
    });
  });
});
