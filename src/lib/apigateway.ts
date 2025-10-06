import { APIGatewayProxyResult } from 'aws-lambda';

export const buildResponse = (
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyResult => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
});

export const parseInput = (body: string): Record<string, unknown> => {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch (err) {
    console.error(err);
    return {};
  }
};
