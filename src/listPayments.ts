import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { buildResponse } from './lib/apigateway';
import { listPayments } from './lib/payments';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const currency = event.queryStringParameters?.currency;

    if (currency) {
      console.log(`Filtering payments by currency: ${currency}`);
    } else {
      console.log('Fetching all payments');
    }

    const payments = await listPayments(currency);

    return buildResponse(200, { data: payments });
  } catch (err) {
    console.error('Error listing payments:', err);

    return buildResponse(500, {
      error: 'Internal Server Error',
      message: 'An error occurred while listing payments',
    });
  }
};
