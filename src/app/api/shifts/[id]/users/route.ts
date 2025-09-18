import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, user_shifts } from "~/server/db/schemas";
import { AssignUsersToShiftRequestSchema } from "~/lib/requests";
import { eq } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError, NotFoundError } from "~/lib/errors/";
import type { APIError } from "~/lib/errors";
import {
  getShiftWithDetails,
  formatSingleShiftWithDetailsResponse,
} from "~/lib/database/shift";

// POST /api/shifts/[id]/users - Assign users to a shift
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const shiftId = parseInt(id);

    if (isNaN(shiftId) || shiftId <= 0) {
      throw new ValidationError("Invalid shift ID");
    }

    const body = (await request.json()) as unknown;

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

    const shiftWithUsers = await getShiftWithDetails([eq(shifts.id, shiftId)]);
    const formattedShift = formatSingleShiftWithDetailsResponse(shiftWithUsers);

    return Response.json(
      {
        success: true,
        message: `Successfully assigned ${newAssignments.length} user(s) to shift ${shiftId}`,
        shift: formattedShift,
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);

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
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const shiftId = parseInt(id);

    if (isNaN(shiftId) || shiftId <= 0) {
      throw new ValidationError("Invalid shift ID");
    }

    const body = (await request.json()) as unknown;
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

    const shiftWithUsers = await getShiftWithDetails([eq(shifts.id, shiftId)]);

    if (shiftWithUsers.length === 0) {
      throw new NotFoundError(`Shift with ID ${shiftId} not found`);
    }

    const formattedShift = formatSingleShiftWithDetailsResponse(shiftWithUsers);

    return Response.json(
      {
        success: true,
        message: `Successfully replaced users for shift ${shiftId} with ${newAssignments.length} new assignment(s)`,
        shift: formattedShift,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);

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

// DELETE /api/shifts/[id]/users - Remove all users from a shift
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const shiftId = parseInt(id);

    if (isNaN(shiftId) || shiftId <= 0) {
      throw new ValidationError("Invalid shift ID");
    }

    const deletedAssignments = await db
      .delete(user_shifts)
      .where(eq(user_shifts.shiftId, shiftId))
      .returning();

    if (deletedAssignments.length === 0) {
      throw new NotFoundError(`No users assigned to shift with ID ${shiftId}`);
    }

    const updatedShift = await getShiftWithDetails([eq(shifts.id, shiftId)]);
    const formattedShift = formatSingleShiftWithDetailsResponse(updatedShift);

    return Response.json(
      {
        success: true,
        message: `Successfully removed users from shift ${shiftId}`,
        shift: formattedShift,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to remove users from shift",
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
