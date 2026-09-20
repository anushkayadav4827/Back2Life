import { APIGatewayProxyResultV2 } from 'aws-lambda';

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*', // locked to CloudFront domain in prod
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export function ok<T>(data: T, statusCode = 200): APIGatewayProxyResultV2 {
  const body: SuccessResponse<T> = { success: true, data };
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export function err(
  code: string,
  message: string,
  statusCode = 400,
): APIGatewayProxyResultV2 {
  const body: ErrorResponse = { success: false, error: { code, message } };
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export function notFound(resource: string): APIGatewayProxyResultV2 {
  return err('NOT_FOUND', `${resource} not found`, 404);
}

export function internalError(context: string): APIGatewayProxyResultV2 {
  return err('INTERNAL_ERROR', `An unexpected error occurred while ${context}`, 500);
}

export function validationError(detail: string): APIGatewayProxyResultV2 {
  return err('VALIDATION_ERROR', detail, 400);
}

export function unauthorized(): APIGatewayProxyResultV2 {
  return err('UNAUTHORIZED', 'Unauthorized', 401);
}
