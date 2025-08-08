import { NextRequest } from 'next/server';
import { db } from '~/server/db';
import { users } from '~/server/db/schemas';
import { CreateUserRequestSchema, GetUsersQuerySchema } from '~/lib/requests';
import { eq, and } from 'drizzle-orm';
import { handleAPIError } from '~/lib/errors/error-handler';

// GET /api/users - List users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const rawParams = {
        role: searchParams.get('role'),
        status: searchParams.get('status')
    }

    // Validate query parameters
    const queryParams = GetUsersQuerySchema.parse(rawParams);

    // Build dynamic WHERE conditions
    const conditions = [];
    if (queryParams.role) {
        conditions.push(eq(users.role, queryParams.role));
    }

    if (queryParams.status) {
        conditions.push(eq(users.status, queryParams.status));
    }

    const usersList = await db.select()
    .from(users)
    .where(and(...conditions));
    
    return Response.json({ 
        success: true,
        message: usersList.length > 0 ? "Users retrieved successfully" : "No users found",
        users: usersList,
        error: null
     }, {status: 200});
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json({
        success: false,
        message: "Failed to retrieve users",
        users: null,
        error: {
            type: apiError.type,
            message: apiError.message,
            details: apiError.details,
        }
    }, {status: apiError.statusCode});
  }
}

// POST /api/users - Create ONE user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body
        const userData = CreateUserRequestSchema.parse(body);

        // Insert new user into the database
        const newUser = await db.insert(users)
            .values(userData)
            .returning();

        return Response.json({
            success: true,
            message: newUser ? "User created successfully" : "No user created",
            users: newUser[0] ?? null,
            error: null
        }, {status: 201});
    } catch (error) {
        const apiError = handleAPIError(error);

        return Response.json({
            success: false,
            message: "User creation failed",
            users: null,
            error: {
                type: apiError.type,
                message: apiError.message,
                details: apiError.details,
            }
        }, {status: apiError.statusCode});
    }
}