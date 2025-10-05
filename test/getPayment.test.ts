import * as payments from "../src/lib/payments";
import { randomUUID } from "crypto";
import { handler } from "../src/getPayment";
import { APIGatewayProxyEvent } from "aws-lambda";

describe("When the user requests the records for a specific payment", () => {
  it("Returns the payment matching their input parameter.", async () => {
    const paymentId = randomUUID();
    const mockPayment = {
      id: paymentId,
      currency: "AUD",
      amount: 2000,
    };
    const getPaymentMock = jest
      .spyOn(payments, "getPayment")
      .mockResolvedValueOnce(mockPayment);

    const result = await handler({
      pathParameters: {
        id: paymentId,
      },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(mockPayment);

    expect(getPaymentMock).toHaveBeenCalledWith(paymentId);
  });

  it("Returns 404 when payment not found in db", async () => {
    const paymentId = randomUUID();
    const getPaymentMock = jest
      .spyOn(payments, "getPayment")
      .mockResolvedValueOnce(null);

    const result = await handler({
      pathParameters: {
        id: paymentId,
      },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("Not Found");
    expect(body.message).toContain(paymentId);

    expect(getPaymentMock).toHaveBeenCalledWith(paymentId);
  });

  it("Returns 400 error when payment ID is not provided", async () => {
    const getPaymentMock = jest.spyOn(payments, "getPayment");

    // Test with missing pathParameters
    const result1 = await handler({
      pathParameters: null,
    } as unknown as APIGatewayProxyEvent);

    expect(result1.statusCode).toBe(400);
    const body1 = JSON.parse(result1.body);
    expect(body1.error).toBe("Bad Request");
    expect(body1.message).toContain("Payment ID");

    // Test with empty pathParameters
    const result2 = await handler({
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent);

    expect(result2.statusCode).toBe(400);
    const body2 = JSON.parse(result2.body);
    expect(body2.error).toBe("Bad Request");
    expect(body2.message).toContain("Payment ID");

    // Should not call getPayment when ID is missing
    expect(getPaymentMock).not.toHaveBeenCalled();
  });

  it("Returns 500 when something went wrong while fetching payment", async () => {
    const paymentId = randomUUID();
    const getPaymentMock = jest
      .spyOn(payments, "getPayment")
      .mockRejectedValueOnce(new Error("Database connection failed"));

    const result = await handler({
      pathParameters: {
        id: paymentId,
      },
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe("Internal Server Error");
    expect(body.message).toContain("error occurred");

    expect(getPaymentMock).toHaveBeenCalledWith(paymentId);
  });
});

afterEach(() => {
  jest.resetAllMocks();
});
