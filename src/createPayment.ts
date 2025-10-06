import { randomUUID } from 'crypto';

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { buildResponse, parseInput } from './lib/apigateway';
import { createPayment, CreatePaymentPayload, getPayment, Payment } from './lib/payments';

// selecting few currencies for test purpose, this can be replaced by either an API or improved by another requirement.
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'NZD', 'CHF'];

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const input = parseInput(event.body ?? '{}') as CreatePaymentPayload;

    // Validate amount exists and is a number
    if (input.amount === undefined || input.amount === null) {
      console.warn('Missing amount in createPayment request');
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: 'Amount is required',
      });
    }

    if (typeof input.amount !== 'number') {
      console.warn('Invalid amount type in createPayment request');
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: 'Amount must be a number',
      });
    }

    if (!Number.isFinite(input.amount)) {
      console.warn(`Invalid amount: not finite`);
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: 'Amount must be a finite number',
      });
    }

    if (input.amount <= 0) {
      console.warn(`Invalid amount value: ${input.amount}`);
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: 'Amount must be greater than zero',
      });
    }

    if (!input.currency) {
      console.warn('Missing currency in createPayment request');
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: 'Currency is required',
      });
    }

    if (typeof input.currency !== 'string') {
      console.warn('Invalid currency type in createPayment request');
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: 'Currency must be a string',
      });
    }

    // Validate currency format (3 uppercase letters)
    if (!/^[A-Z]{3}$/.test(input.currency)) {
      console.warn(`Invalid currency format: ${input.currency}`);
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: 'Currency must be a 3-letter uppercase ISO code (e.g., USD, EUR)',
      });
    }

    if (!VALID_CURRENCIES.includes(input.currency)) {
      console.warn(`Unsupported currency: ${input.currency}`);
      return buildResponse(422, {
        error: 'Unprocessable Entity',
        message: `Currency ${input.currency} is not supported. Supported currencies: ${VALID_CURRENCIES.join(', ')}`,
      });
    }

    const paymentId = randomUUID();

    console.log(`Creating payment with generated ID: ${paymentId}`);

    const payment: Payment = {
      paymentId,
      amount: input.amount,
      currency: input.currency,
    };

    await createPayment(payment);

    const storedPayment = await getPayment(paymentId);

    if (!storedPayment) {
      console.error(`Payment ${paymentId} was not found after creation`);
      return buildResponse(500, {
        error: 'Internal Server Error',
        message: 'Payment creation verification failed',
      });
    }

    console.log(`Successfully created and verified payment: ${paymentId}`);

    return buildResponse(201, storedPayment);
  } catch (err) {
    console.error('Error creating payment:', err);

    return buildResponse(500, {
      error: 'Internal Server Error',
      message: 'An error occurred while creating the payment',
    });
  }
};
