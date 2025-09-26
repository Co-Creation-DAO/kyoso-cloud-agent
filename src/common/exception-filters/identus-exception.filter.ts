import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class IdentusExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(IdentusExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle Axios errors from Identus Cloud Agent
    if (this.isAxiosError(exception)) {
      const axiosError = exception;

      // If Identus returned a structured error response, use it as-is
      if (axiosError.response?.data) {
        const status =
          axiosError.response.status || HttpStatus.INTERNAL_SERVER_ERROR;

        this.logger.error(
          `Identus API Error: ${status} - ${JSON.stringify(axiosError.response.data)}`,
          axiosError.stack,
        );

        // Return Identus error response as-is
        return response.status(status).json(axiosError.response.data);
      }

      // If no response data, create a standard error response
      const status =
        axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorResponse = this.createErrorResponse(
        status,
        'Identus API Error',
        axiosError.message,
        request.url,
      );

      return response.status(status).json(errorResponse);
    }

    // Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // If it's already in the correct format, return as-is
      if (
        typeof exceptionResponse === 'object' &&
        'type' in exceptionResponse
      ) {
        return response.status(status).json(exceptionResponse);
      }

      // Otherwise, create a standard error response
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'An error occurred';

      const errorResponse = this.createErrorResponse(
        status,
        this.getErrorTitle(status),
        message,
        request.url,
      );

      return response.status(status).json(errorResponse);
    }

    // Handle all other errors
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse = this.createErrorResponse(
      status,
      'Internal Server Error',
      'An unexpected error occurred',
      request.url,
    );

    this.logger.error(
      `Unhandled exception: ${exception}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return response.status(status).json(errorResponse);
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (
      error instanceof Error &&
      'isAxiosError' in error &&
      (error as any).isAxiosError === true
    );
  }

  private createErrorResponse(
    status: number,
    title: string,
    detail: string,
    instance: string,
  ) {
    return {
      status,
      type: `/errors/${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      detail,
      instance: `urn:uuid:${uuidv4()}`,
    };
  }

  private getErrorTitle(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return 'Error';
    }
  }
}
