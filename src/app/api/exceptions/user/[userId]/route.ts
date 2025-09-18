import { db } from "~/server/db";
import { coreBlocks, exceptions, users } from "~/server/db/schemas";
import { ExceptionDateRequestSchema } from "~/lib/requests";
import type { NextRequest } from "next/server";
import { NotFoundError, ValidationError } from "~/lib/errors";
import { handleAPIError } from "~/lib/errors/error-handler";
import type { APIError } from "~/lib/errors";
import { lte, gte, eq, and } from "drizzle-orm";

// GET /api/exceptions/[userId] - Get exceptions for a user
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt) || userIdInt <= 0) {
      throw new ValidationError("Invalid user ID");
    }

    const { searchParams } = new URL(request.url);
    const validatedParams = ExceptionDateRequestSchema.parse({
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    // Validate user exists
    const userValidation = await db
      .select()
      .from(users)
      .where(eq(users.id, userIdInt));

    if (userValidation.length === 0) {
      throw new NotFoundError(`User with ID ${userIdInt} not found`);
    }

    const conditions = [];
    conditions.push(eq(exceptions.userId, userIdInt));
    if (validatedParams.startDate && validatedParams.endDate) {
      conditions.push(gte(exceptions.date, validatedParams.startDate));
      conditions.push(lte(exceptions.date, validatedParams.endDate));
    }

    const exceptionsList = await db
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
      .where(and(...conditions));

    const dateRangeMessage =
      validatedParams.startDate && validatedParams.endDate
        ? ` between ${validatedParams.startDate} and ${validatedParams.endDate}`
        : "";

    return Response.json(
      {
        success: true,
        message:
          exceptionsList.length === 0
            ? `No exceptions found for user${dateRangeMessage}`
            : `Exceptions retrieved successfully${dateRangeMessage}`,
        exceptions: exceptionsList,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to retrieve exceptions",
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
