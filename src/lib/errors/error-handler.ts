import { ZodError } from "zod";
import { APIError, ValidationError, DatabaseError, ConnectionError, NotFoundError } from "./api-errors";

export function handleAPIError(error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as ZodError;
        return new ValidationError(zodError.message, zodError.errors);
    }

    if (error instanceof APIError) {
        return error; // Already a structured APIError
    }   

    if (error instanceof Error && error.name === "NOT_FOUND") {
        return new NotFoundError("Resource not found");
    }

    if (error instanceof Error && 'code' in error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return new ConnectionError("Database connection refused");
        }
    }

    if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === '23502') { 
            return new DatabaseError("Missing required field", 400);
        }
        if (error.code === '23503' || error.code === '23504') {
            return new DatabaseError("Foreign key constraint violation", 409);
        }
        if (error.code === '23505') {
            return new DatabaseError("Duplicate entry", 409);
        }
    }

    return new APIError('INTERNAL_ERROR', 'Internal server error occurred', 500, error);
}