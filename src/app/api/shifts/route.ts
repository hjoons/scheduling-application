import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, users, coreBlocks, user_shifts } from "~/server/db/schemas";
import { CreateShiftRequestSchema, GetShiftsQuerySchema } from "~/lib/requests";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError, NotFoundError } from "~/lib/errors/";

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
    let shiftIdsWithUser: number[] = [];
    if (queryParams.userId) {
      const shiftsForUser = await db
        .select({ shiftId: user_shifts.shiftId })
        .from(user_shifts)
        .innerJoin(shifts, eq(user_shifts.shiftId, shifts.id))
        .where(and(eq(user_shifts.userId, queryParams.userId), ...conditions));

      shiftIdsWithUser = shiftsForUser
        .map((row) => row.shiftId)
        .filter((id): id is number => id !== null);

      // If no shifts found for this user, return empty result early
      if (shiftIdsWithUser.length === 0) {
        return Response.json(
          {
            success: true,
            message: `No shifts found for user ID ${queryParams.userId}`,
            shifts: [],
            filters: {
              userId: queryParams.userId,
              startDate: queryParams.startDate ?? null,
              endDate: queryParams.endDate ?? null,
            },
            error: null,
          },
          { status: 200 },
        );
      }

      // Update conditions to include only shifts with this user
      conditions.push(inArray(shifts.id, shiftIdsWithUser));
    }

    // Get all shift data for the filtered shifts (including ALL users assigned to each shift)
    const shiftsList = await db
      .select({
        // Shift data
        shiftId: shifts.id,
        coreId: shifts.coreId,
        date: shifts.date,
        tipsEarned: shifts.tipsEarned,

        // Core block data
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        numberOfEmployees: coreBlocks.numberOfEmployees,

        // User data (from junction table) - ALL users for qualifying shifts
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(shifts)
      .leftJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
      .leftJoin(user_shifts, eq(shifts.id, user_shifts.shiftId))
      .leftJoin(users, eq(user_shifts.userId, users.id))
      .where(and(...conditions));

    // Group results by shift to handle multiple users per shift
    const shiftsMap = new Map();

    shiftsList.forEach((row) => {
      // Initialize shift if not exists
      if (!shiftsMap.has(row.shiftId)) {
        shiftsMap.set(row.shiftId, {
          id: row.shiftId,
          coreId: row.coreId,
          date: row.date,
          tipsEarned: row.tipsEarned,
          timeStart: row.timeStart,
          timeEnd: row.timeEnd,
          dayOfWeek: row.dayOfWeek,
          shiftOfDay: row.shiftOfDay,
          numberOfemployees: row.numberOfEmployees,
          users: [],
          totalAssignedUsers: 0,
        });
      }

      // Add user to the shift if user data exists (some shifts might have no assigned users)
      if (row.userId) {
        const shift = shiftsMap.get(row.shiftId);
        shift.users.push({
          id: row.userId,
          firstName: row.firstName,
          lastName: row.lastName,
          role: row.role,
        });
        shift.totalAssignedUsers = shift.users.length;
      }
    });

    const shiftsWithUsers = Array.from(shiftsMap.values());

    const dateRangeMessage =
      queryParams.startDate && queryParams.endDate
        ? ` between ${queryParams.startDate} and ${queryParams.endDate}`
        : "";

    const userMessage = queryParams.userId
      ? ` for user ID ${queryParams.userId}`
      : "";

    if (shiftsWithUsers.length === 0) {
      throw new NotFoundError(
        `No shifts found${userMessage}${dateRangeMessage}`,
      );
    }

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
    const apiError = handleAPIError(error);

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
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Validate request body
    const shiftData = CreateShiftRequestSchema.parse(body);

    // Insert new shift into the database
    const newShift = await db.insert(shifts).values(shiftData).returning();

    return Response.json(
      {
        success: true,
        message: "Shift created successfully",
        shift: newShift[0],
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Shift creation failed",
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
