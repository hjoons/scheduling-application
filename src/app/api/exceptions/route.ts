import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { exceptions } from "~/server/db/schemas";
import { CreateExceptionRequestSchema } from "~/lib/requests/exceptions";
import { ValidationError } from "~/lib/errors";
import { handleAPIError } from "~/lib/errors/error-handler";

// POST /api/exceptions - Create a new exception
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Validate request body
    const exceptionData = CreateExceptionRequestSchema.parse(body);

    // Insert new exception into the database
    const newException = await db
      .insert(exceptions)
      .values(exceptionData)
      .returning();

    return Response.json(
      {
        success: true,
        message: "Exception created successfully",
        exceptions: newException[0],
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Exception creation failed",
        exceptions: null,
        error: {
          type: apiError.type,
          message: apiError.message,
          details: apiError.details,
        },
      },
      { status: apiError.statusCode },
    );
  }
}
