import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, users, user_shifts, coreBlocks } from "~/server/db/schemas";
import { AssignUsersToShiftRequestSchema } from "~/lib/requests";
import { eq } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError } from "~/lib/errors/";

// POST /api/shifts/[id]/users - Assign users to a shift
export async function POST(
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
    const assignmentData = AssignUsersToShiftRequestSchema.parse(body);

    const newAssignments = await db
      .insert(user_shifts)
      .values(
        assignmentData.userIds.map((userId) => ({
          userId: userId,
          shiftId: shiftId,
        })),
      )
      .returning();

    return Response.json(
      {
        success: true,
        message: `Successfully assigned ${newAssignments.length} user(s) to shift ${shiftId}`,
        shift: newAssignments,
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to assign users to shift",
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

// PUT /api/shifts/[id]/users - Replace all users assigned to a shift
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
    const assignmentData = AssignUsersToShiftRequestSchema.parse(body);

    // Deduplicate userIds
    assignmentData.userIds = Array.from(new Set(assignmentData.userIds));

    // Delete existing assignments for the shift
    await db.delete(user_shifts).where(eq(user_shifts.shiftId, shiftId));

    // Insert new assignments
    const newAssignments = await db
      .insert(user_shifts)
      .values(
        assignmentData.userIds.map((userId) => ({
          userId: userId,
          shiftId: shiftId,
        })),
      )
      .returning();

    const shiftWithUsers = await db
      .select({
        // Shift data
        id: shifts.id,
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
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(shifts)
      .leftJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
      .leftJoin(user_shifts, eq(shifts.id, user_shifts.shiftId))
      .leftJoin(users, eq(user_shifts.userId, users.id))
      .where(eq(shifts.id, shiftId));

    if (shiftWithUsers.length === 0) {
      throw new ValidationError(`Shift with ID ${shiftId} not found`);
    }

    // Structure the response data
    const shiftData = shiftWithUsers[0]!;
    const assignedUsers = shiftWithUsers
      .filter((row) => row.userId !== null)
      .map((row) => ({
        id: row.userId,
        firstName: row.userFirstName,
        lastName: row.userLastName,
        email: row.userEmail,
        role: row.userRole,
      }));

    return Response.json(
      {
        success: true,
        message: `Successfully replaced users for shift ${shiftId} with ${newAssignments.length} new assignment(s)`,
        shift: {
          id: shiftData.id,
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
        message: "Failed to replace users for shift",
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

// GET /api/shifts/[id]/users - Get all users assigned to a shift
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

    // Get shift details with core block information
    const shift = await db
      .select({
        id: shifts.id,
        coreId: shifts.coreId,
        date: shifts.date,
        tipsEarned: shifts.tipsEarned,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        numberOfEmployees: coreBlocks.numberOfEmployees,
      })
      .from(shifts)
      .innerJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
      .where(eq(shifts.id, shiftId));

    // Get all users assigned to this shift
    const assignedUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      })
      .from(user_shifts)
      .innerJoin(users, eq(user_shifts.userId, users.id))
      .where(eq(user_shifts.shiftId, shiftId));

    return Response.json(
      {
        success: true,
        message:
          assignedUsers.length > 0
            ? `Found ${assignedUsers.length} user(s) assigned to shift ${shiftId}`
            : `No users assigned to shift ${shiftId}`,
        shift: {
          ...shift[0],
          users: assignedUsers,
          totalAssignedUsers: assignedUsers.length,
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
        message: "Failed to retrieve users for shift",
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

// DELETE /api/shifts/[id]/users - Remove all users from a shift
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

    const deletedAssignments = await db
      .delete(user_shifts)
      .where(eq(user_shifts.shiftId, shiftId))
      .returning();

    let message = `Successfully removed users from shift ${shiftId}`;

    return Response.json(
      {
        success: true,
        message: message,
        removedAssignments: deletedAssignments,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to remove users from shift",
        removedAssignments: null,
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
