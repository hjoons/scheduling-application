import { db } from "~/server/db";
import { exceptions, coreBlocks } from "~/server/db/schemas";
import type { NextRequest } from "next/server";
import { ValidationError, NotFoundError } from "~/lib/errors";
import { UpdateExceptionRequestSchema } from "~/lib/requests/exceptions";
import { handleAPIError } from "~/lib/errors/error-handler";
import { eq } from "drizzle-orm";

// GET /api/exceptions/[id] - Get a single exception by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const exceptionId = parseInt(id);

    if (isNaN(exceptionId) || exceptionId <= 0) {
      throw new ValidationError("Invalid exception ID format");
    }

    const exception = await db
      .select({
        id: exceptions.id,
        coreId: exceptions.coreId,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
        numberOfEmployees: coreBlocks.numberOfEmployees,
        date: exceptions.date,
        description: exceptions.description,
      })
      .from(exceptions)
      .leftJoin(coreBlocks, eq(exceptions.coreId, coreBlocks.id))
      .where(eq(exceptions.id, exceptionId));

    if (exception.length === 0) {
      throw new NotFoundError(`Exception with ID ${exceptionId} not found`);
    }

    return Response.json(
      {
        success: true,
        message: "Exception retrieved successfully",
        exception: exception[0],
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);
    return Response.json(
      {
        success: false,
        message: "Failed to retrieve exception",
        exception: null,
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

// PUT /api/exceptions/[id] - Update an existing exception
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const exceptionId = parseInt(id);

    if (isNaN(exceptionId) || exceptionId <= 0) {
      throw new ValidationError("Invalid exception ID format");
    }

    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Validate the request body
    const parsedBody = UpdateExceptionRequestSchema.parse(body);

    // Update the exception in the database
    const updatedException = await db
      .update(exceptions)
      .set(parsedBody)
      .where(eq(exceptions.id, exceptionId))
      .returning();

    // Check if exception was found and updated
    if (updatedException.length === 0) {
      throw new NotFoundError(`Exception with ID ${exceptionId} not found`);
    }

    return Response.json(
      {
        success: true,
        message: "Exception updated successfully",
        exception: updatedException[0],
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Exception update failed",
        exception: null,
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

// DELETE /api/exceptions/[id] - Delete an exception by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const exceptionId = Number(id);

    if (isNaN(exceptionId) || exceptionId <= 0) {
      throw new ValidationError("Invalid exception ID format");
    }

    const deletedException = await db
      .delete(exceptions)
      .where(eq(exceptions.id, exceptionId))
      .returning();

    if (deletedException.length === 0) {
      throw new NotFoundError(`Exception with ID ${exceptionId} not found`);
    }

    return Response.json(
      {
        success: true,
        message: "Exception deleted successfully",
        exception: deletedException[0],
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Exception deletion failed",
        exception: null,
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
