import { db } from "~/server/db";
import { coreBlocks, exceptions } from "~/server/db/schemas";
import type { NextRequest } from "next/server";
import { NotFoundError, ValidationError } from "~/lib/errors";
import { handleAPIError } from "~/lib/errors/error-handler";
import { lte, gte, eq, and } from "drizzle-orm";

// GET /api/exceptions/[userId] - Get exceptions for a user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const userId = await params.userId;
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt) || userIdInt <= 0) {
      throw new ValidationError("Invalid user ID");
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new ValidationError(
        "Both startDate and endDate must be provided together, or neither",
      );
    }

    const conditions = [];
    conditions.push(eq(exceptions.userId, userIdInt));
    if (startDate && endDate) {
      conditions.push(gte(exceptions.date, startDate));
      conditions.push(lte(exceptions.date, endDate));
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
      .fullJoin(coreBlocks, eq(exceptions.coreId, coreBlocks.id))
      .where(and(...conditions));

    if (exceptionsList.length === 0) {
      throw new NotFoundError("Invalid user ID or no exceptions found");
    }

    const dateRangeMessage =
      startDate && endDate ? ` between ${startDate} and ${endDate}` : "";

    return Response.json(
      {
        success: true,
        message: `Exceptions retrieved successfully${dateRangeMessage}`,
        exceptions: exceptionsList,
        dateRange: {
          startDate: startDate ?? null,
          endDate: endDate ?? null,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to retrieve exceptions",
        exceptions: null,
        dateRange: {
          startDate: null,
          endDate: null,
        },
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
