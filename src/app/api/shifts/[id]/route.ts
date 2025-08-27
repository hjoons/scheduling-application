import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, users, coreBlocks, user_shifts } from "~/server/db/schemas";
import { UpdateShiftRequestSchema } from "~/lib/requests";
import { eq } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError, NotFoundError } from "~/lib/errors/";

// GET /api/shifts/[id] - Get shift information with assigned users by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const shiftId = parseInt(id);

    if (isNaN(shiftId) || shiftId <= 0) {
      throw new ValidationError("Invalid shift ID");
    }

    // Get shift with core block data and assigned users
    const shiftWithDetails = await db
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
      .where(eq(shifts.id, shiftId));

    if (shiftWithDetails.length === 0) {
      throw new NotFoundError(`Shift with ID ${shiftId} not found`);
    }

    // Structure the response data
    const shiftData = shiftWithDetails[0]!;
    const assignedUsers = shiftWithDetails
      .filter((row) => row.userId !== null)
      .map((row) => ({
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
      }));

    const formattedShift = {
      id: shiftData.shiftId,
      coreId: shiftData.coreId,
      date: shiftData.date,
      tipsEarned: shiftData.tipsEarned,
      timeStart: shiftData.timeStart,
      timeEnd: shiftData.timeEnd,
      dayOfWeek: shiftData.dayOfWeek,
      shiftOfDay: shiftData.shiftOfDay,
      numberOfEmployees: shiftData.numberOfEmployees,
      users: assignedUsers,
      totalAssignedUsers: assignedUsers.length,
    };

    return Response.json(
      {
        success: true,
        message: "Shift retrieved successfully",
        shift: formattedShift,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to retrieve shift",
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

// PUT /api/shifts/[id] - Update shift details (not user assignments)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const shiftId = parseInt(id);

    if (isNaN(shiftId) || shiftId <= 0) {
      throw new ValidationError("Invalid shift ID");
    }

    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    // Validate request body
    const updateData = UpdateShiftRequestSchema.parse(body);

    // Update shift in the database
    const updatedShift = await db
      .update(shifts)
      .set(updateData)
      .where(eq(shifts.id, shiftId))
      .returning();

    if (updatedShift.length === 0) {
      throw new NotFoundError(`Shift with ID ${shiftId} not found`);
    }

    const shiftWithDetails = await db
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

        // User data
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      })
      .from(shifts)
      .leftJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
      .leftJoin(user_shifts, eq(shifts.id, user_shifts.shiftId))
      .leftJoin(users, eq(user_shifts.userId, users.id))
      .where(eq(shifts.id, shiftId));

    if (shiftWithDetails.length === 0) {
      throw new NotFoundError(`Shift with ID ${shiftId} not found`);
    }

    // Structure the response data (same format as GET)
    const shiftData = shiftWithDetails[0]!;
    const assignedUsers = shiftWithDetails
      .filter((row) => row.userId !== null)
      .map((row) => ({
        id: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        role: row.role,
      }));

    const formattedShift = {
      id: shiftData.shiftId,
      coreId: shiftData.coreId,
      date: shiftData.date,
      tipsEarned: shiftData.tipsEarned,
      timeStart: shiftData.timeStart,
      timeEnd: shiftData.timeEnd,
      dayOfWeek: shiftData.dayOfWeek,
      shiftOfDay: shiftData.shiftOfDay,
      numberOfEmployees: shiftData.numberOfEmployees,
      users: assignedUsers,
      totalAssignedUsers: assignedUsers.length,
    };

    return Response.json(
      {
        success: true,
        message: "Shift updated successfully",
        shift: formattedShift,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to update shift",
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

// DELETE /api/shifts/[id] - Delete shift and all user assignments
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const shiftId = parseInt(id);

    if (isNaN(shiftId) || shiftId <= 0) {
      throw new ValidationError("Invalid shift ID");
    }

    // Delete the shift (user_shifts will be cascade deleted due to foreign key constraint)
    const deletedShift = await db
      .delete(shifts)
      .where(eq(shifts.id, shiftId))
      .returning();

    if (deletedShift.length === 0) {
      throw new NotFoundError(`Shift with ID ${shiftId} not found`);
    }

    return Response.json(
      {
        success: true,
        message: `Shift ${shiftId} deleted successfully.`,
        shift: deletedShift[0],
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to delete shift",
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
