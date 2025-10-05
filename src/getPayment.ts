import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { buildResponse } from "./lib/apigateway";
import { getPayment } from "./lib/payments";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const paymentId = event.pathParameters?.id;

    if (!paymentId) {
      console.warn("Payment ID missing in the GetPayment request");
      return buildResponse(400, {
        error: "Bad Request",
        message: "Payment ID not provided",
      });
    }

    console.log(`Fetching payment for ID: ${paymentId}`);
    // get payment from db
    const payment = await getPayment(paymentId);

    if (!payment) {
      console.warn(`Payment not found for ID: ${paymentId}`);

      return buildResponse(404, {
        error: "Not Found",
        message: `Payment not found for ID: ${paymentId}`,
      });
    }

    console.log(`Successfully retrieved payment for ID: ${paymentId}`);

    return buildResponse(200, payment);
  } catch (err) {
    console.error(`Error retrieving payment: ${err}`);

    return buildResponse(500, {
      error: "Internal Server Error",
      message: "An error occurred while retrieving payment.",
    });
  }
};
