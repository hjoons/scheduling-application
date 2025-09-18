import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, user_shifts } from "~/server/db/schemas";
import { CreateShiftRequestSchema, GetShiftsQuerySchema } from "~/lib/requests";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError } from "~/lib/errors/";
import type { APIError } from "~/lib/errors";
import {
  getShiftWithDetails,
  getShiftWithCoreBlocks,
  formatShiftWithDetailsResponse,
  formatSingleShiftWithCoreBlocksResponse,
} from "~/lib/database/shift";

// GET /api/shifts - List shifts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const rawParams = {
      userId: searchParams.get("userId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      date: searchParams.get("date"),
    };

    // Validate query parameters
    const queryParams = GetShiftsQuerySchema.parse(rawParams);

    // Validate date range logic
    if (
      (queryParams.startDate && !queryParams.endDate) ||
      (!queryParams.startDate && queryParams.endDate)
    ) {
      throw new ValidationError(
        "Both startDate and endDate must be provided together, or neither",
      );
    }

    if (queryParams.date && (queryParams.startDate || queryParams.endDate)) {
      throw new ValidationError(
        "Cannot combine date filter with startDate/endDate range",
      );
    }

    // Build base query conditions
    const conditions = [];

    if (queryParams.date) {
      conditions.push(eq(shifts.date, queryParams.date));
    }

    if (queryParams.startDate && queryParams.endDate) {
      conditions.push(gte(shifts.date, queryParams.startDate));
      conditions.push(lte(shifts.date, queryParams.endDate));
    }

    // If filtering by userId, first find shifts that include this user
    if (queryParams.userId) {
      const shiftsForUser = await db
        .select({ shiftId: user_shifts.shiftId })
        .from(user_shifts)
        .innerJoin(shifts, eq(user_shifts.shiftId, shifts.id))
        .where(and(eq(user_shifts.userId, queryParams.userId), ...conditions));

      const shiftIdsWithUser = shiftsForUser
        .map((row) => row.shiftId)
        .filter((id): id is number => id !== null);

      // If no shifts found for this user, return empty result
      if (shiftIdsWithUser.length === 0) {
        return Response.json(
          {
            success: true,
            message: `No shifts found for user ID ${queryParams.userId}`,
            shifts: [],
            error: null,
          },
          { status: 200 },
        );
      }

      // Update conditions to include only shifts with this user
      conditions.push(inArray(shifts.id, shiftIdsWithUser));
    }

    const shiftsList = await getShiftWithDetails(conditions);
    const shiftsWithUsers = formatShiftWithDetailsResponse(shiftsList) ?? [];

    const dateRangeMessage =
      queryParams.startDate && queryParams.endDate
        ? ` between ${queryParams.startDate} and ${queryParams.endDate}`
        : "";

    const userMessage = queryParams.userId
      ? ` for user ID ${queryParams.userId}`
      : "";

    // Always return success for collection queries, even if empty
    return Response.json(
      {
        success: true,
        message:
          shiftsWithUsers.length > 0
            ? `Shifts retrieved successfully${userMessage}${dateRangeMessage}`
            : `No shifts found${userMessage}${dateRangeMessage}`,
        shifts: shiftsWithUsers,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to retrieve shifts",
        shifts: null,
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

// POST /api/shifts - Create new shift
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Validate request body
    const shiftData = CreateShiftRequestSchema.parse(body);

    // Insert new shift into the database
    const newShift = await db.insert(shifts).values(shiftData).returning();

    if (!newShift[0]) {
      throw new Error("Failed to create shift");
    }

    const shiftWithCoreBlocks = await getShiftWithCoreBlocks([
      eq(shifts.id, newShift[0].id),
    ]);

    const formattedShift =
      formatSingleShiftWithCoreBlocksResponse(shiftWithCoreBlocks);

    return Response.json(
      {
        success: true,
        message: "Shift created successfully",
        shift: formattedShift,
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to create shift",
        shift: null,
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
