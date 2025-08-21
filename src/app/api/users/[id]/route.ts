import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { users } from "~/server/db/schemas";
import { UpdateUserRequestSchema } from "~/lib/requests";
import { eq } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError, NotFoundError } from "~/lib/errors/";

// GET /api/users/[id] - GET ONE user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    if (isNaN(userId) || userId <= 0) {
      throw new ValidationError("Invalid user ID format");
    }

    const user = await db.select().from(users).where(eq(users.id, userId));

    if (user.length === 0) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return Response.json(
      {
        success: true,
        message: "User retrieved successfully",
        users: user[0],
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);
    return Response.json(
      {
        success: false,
        message: "Retrieving user failed",
        users: null,
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

// PUT /api/users/[id] - Update ONE user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    if (isNaN(userId) || userId <= 0) {
      throw new ValidationError("Invalid user ID format");
    }

    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      throw new NotFoundError("Request body cannot be empty");
    }

    const updatePayload = UpdateUserRequestSchema.parse(body);

    const updatedUser = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return Response.json(
      {
        success: true,
        message: `User with ID ${userId} has been updated`,
        users: updatedUser[0],
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);
    return Response.json(
      {
        success: false,
        message: "User update failed",
        users: null,
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

// DELETE /api/users/[id] - Delete ONE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    if (isNaN(userId) || userId <= 0) {
      throw new ValidationError("Invalid user ID format");
    }

    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (deletedUser.length === 0) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return Response.json(
      {
        success: true,
        message: `User with ID ${userId} has been deleted successfully`,
        users: deletedUser[0],
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);
    return Response.json(
      {
        success: false,
        message: "User deletion failed",
        users: null,
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
