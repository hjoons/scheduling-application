import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { availabilities, coreBlocks } from "~/server/db/schemas";
import {
  GetUserAvailabilityQuerySchema,
  CreateAvailabilityRequestSchema,
} from "~/lib/requests/availability";
import { handleAPIError } from "~/lib/errors/error-handler";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ValidationError } from "~/lib/errors";
import { number } from "zod/v4";

// GET /api/availability/user/[userId] - Query user availability
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const rawParams = {
      dayOfWeek: searchParams.get("dayOfWeek"),
      shiftOfDay: searchParams.get("shiftOfDay"),
    };

    // Validate all parameters
    const queryParams = GetUserAvailabilityQuerySchema.parse(rawParams);
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt) || userIdInt <= 0) {
      throw new ValidationError("Invalid user ID");
    }

    // Build dynamic WHERE conditions
    const conditions = [];

    if (queryParams.dayOfWeek) {
      conditions.push(eq(coreBlocks.dayOfWeek, queryParams.dayOfWeek));
    }

    if (queryParams.shiftOfDay) {
      conditions.push(eq(coreBlocks.shiftOfDay, queryParams.shiftOfDay));
    }

    const availabilitiesList = await db
      .select({
        coreId: coreBlocks.id,
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
        numberOfEmployees: coreBlocks.numberOfEmployees,
      })
      .from(availabilities)
      .fullJoin(coreBlocks, eq(availabilities.coreId, coreBlocks.id))
      .where(and(eq(availabilities.userId, userIdInt), ...conditions));

    if (availabilitiesList.length === 0) {
      throw new NotFoundError(`Invalid user ID or no availability found`);
    }

    return Response.json(
      {
        success: true,
        message: "User availability retrieved successfully",
        availabilities: availabilitiesList,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to retrieve user availability",
        availabilities: null,
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

// POST /api/availability/user/[userId] - Set availability for a user using a list of availability entries
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    if (
      !body ||
      Object.keys(body).length === 0 ||
      body.availability.length === 0
    ) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Insert new availability entries into the database
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt) || userIdInt <= 0) {
      throw new ValidationError("Invalid user ID");
    }

    // Add userId to each availability entry before validation
    const bodyWithUserIds = {
      availability: body.availability.map((entry: any) => ({
        ...entry,
        userId: userIdInt,
      })),
    };

    // Validate request body with userId included
    const availabilityData =
      CreateAvailabilityRequestSchema.parse(bodyWithUserIds);

    // Handle duplicates by using ON_CONFLICT
    const newAvailabilities = await db
      .insert(availabilities)
      .values(availabilityData.availability)
      .onConflictDoNothing() // Skip duplicates
      .returning();

    const insertedCoreIds = new Set(
      newAvailabilities.map((entry) => entry.coreId),
    );
    const skippedEntries = availabilityData.availability.filter(
      (entry) => !insertedCoreIds.has(entry.coreId),
    );

    const isPartialSuccess =
      newAvailabilities.length > 0 && skippedEntries.length > 0;
    const isCompleteSuccess =
      newAvailabilities.length > 0 && skippedEntries.length === 0;
    const isCompleteFailure = newAvailabilities.length === 0;

    return Response.json(
      {
        success: isCompleteSuccess || isPartialSuccess,
        message: isCompleteSuccess
          ? "All availability created successfully"
          : isPartialSuccess
            ? `Partial success: ${newAvailabilities.length} created, ${skippedEntries.length} skipped (duplicates)`
            : "No availability could be created (all duplicates or invalid)",
        availabilities: newAvailabilities,
        skipped: skippedEntries,
        error: null,
      },
      {
        status: isCompleteFailure ? 400 : isPartialSuccess ? 207 : 201,
      },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Availability creation failed",
        availabilities: null,
        skipped: null,
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

// PUT /api/availability/user/[userId] - Update availability for a user using a list of availability entries
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt) || userIdInt <= 0) {
      throw new ValidationError("Invalid user ID");
    }

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Add userId to each availability entry before validation
    const bodyWithUserIds = {
      availability: body.availability.map((entry: any) => ({
        ...entry,
        userId: userIdInt,
      })),
    };

    // Validate request body - expecting { coreId: number } per entry
    const availabilityData =
      CreateAvailabilityRequestSchema.parse(bodyWithUserIds);

    // Delete existing availability for the user
    await db.delete(availabilities).where(eq(availabilities.userId, userIdInt));
    const updatedAvailabilities = await db
      .insert(availabilities)
      .values(availabilityData.availability)
      .returning();

    return Response.json(
      {
        success: true,
        message: `Successfully updated ${updatedAvailabilities.length} availability records for user `,
        availabilities: updatedAvailabilities,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Availability update failed",
        availabilities: null,
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

// DELETE /api/availability/user/[userId] - Remove all availability from a user (reset)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = await params;
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt) || userIdInt <= 0) {
      throw new ValidationError("Invalid user ID");
    }

    // Delete all availability entries for the user
    const deletedCount = await db
      .delete(availabilities)
      .where(eq(availabilities.userId, userIdInt))
      .returning();

    return Response.json(
      {
        success: true,
        message: `Deleted ${deletedCount.length} availability records successfully`,
        availabilities: deletedCount,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Availability deletion failed",
        availabilities: null,
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
