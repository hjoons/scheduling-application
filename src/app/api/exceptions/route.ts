import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { exceptions, coreBlocks } from "~/server/db/schemas";
import { CreateExceptionRequestSchema } from "~/lib/requests/exceptions";
import { ValidationError } from "~/lib/errors";
import { handleAPIError } from "~/lib/errors/error-handler";
import type { APIError } from "~/lib/errors";
import { eq } from "drizzle-orm";

// POST /api/exceptions - Create a new exception
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

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

    // Get the created exception with core block data
    const exceptionWithCoreBlock = await db
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
      .innerJoin(coreBlocks, eq(exceptions.coreId, coreBlocks.id))
      .where(eq(exceptions.id, newException[0]!.id));

    return Response.json(
      {
        success: true,
        message: "Exception created successfully",
        exception: exceptionWithCoreBlock[0],
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to create exception",
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
