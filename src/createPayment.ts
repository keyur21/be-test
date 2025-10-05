import { randomUUID } from 'crypto';

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { buildResponse, parseInput } from './lib/apigateway';
import { createPayment, CreatePaymentPayload, getPayment, Payment } from './lib/payments';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const input = parseInput(event.body ?? '{}') as CreatePaymentPayload;

    if (!input.amount || typeof input.amount !== 'number') {
      console.warn('Invalid or missing amount in createPayment request');

      return buildResponse(400, {
        error: 'Bad Request',
        message: 'Amount is required and must be a number',
      });
    }

    if (!input.currency || typeof input.currency !== 'string') {
      console.warn('Invalid or missing currency in createPayment request');
      return buildResponse(400, {
        error: 'Bad Request',
        message: 'Currency is required and must be a string',
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

    // Fetch the payment from DB to ensure it was stored correctly
    // This provides read-after-write consistency and confirms the actual stored data
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
