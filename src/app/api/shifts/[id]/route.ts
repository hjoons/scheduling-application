import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts } from "~/server/db/schemas";
import { UpdateShiftRequestSchema } from "~/lib/requests";
import { eq } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError, NotFoundError } from "~/lib/errors/";
import type { APIError } from "~/lib/errors";
import {
  getShiftWithDetails,
  formatSingleShiftWithDetailsResponse,
} from "~/lib/database/shift";

// GET /api/shifts/[id] - Get shift information with assigned users by ID
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const shiftId = parseInt(id);

    if (isNaN(shiftId) || shiftId <= 0) {
      throw new ValidationError("Invalid shift ID");
    }

    // Get shift with core block data and assigned users using shared function
    const shiftWithDetails = await getShiftWithDetails([
      eq(shifts.id, shiftId),
    ]);

    if (shiftWithDetails.length === 0) {
      throw new NotFoundError(`Shift with ID ${shiftId} not found`);
    }

    const formattedShift =
      formatSingleShiftWithDetailsResponse(shiftWithDetails);

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
    const apiError: APIError = handleAPIError(error);

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

    // Get updated shift with details using shared function
    const shiftWithDetails = await getShiftWithDetails([
      eq(shifts.id, shiftId),
    ]);
    const formattedShift =
      formatSingleShiftWithDetailsResponse(shiftWithDetails);

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
    const apiError: APIError = handleAPIError(error);

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
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
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
        message: `Shift ${shiftId} deleted successfully`,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to delete shift",
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
