import { NextRequest } from 'next/server';
import { db } from '~/server/db';
import { users } from '~/server/db/schemas';
import { CreateUserRequestSchema, UpdateUserRequestSchema, GetUsersQuerySchema } from '~/lib/requests';
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
        users: usersList,
        error: null
     });
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json({
        success: false,
        users: [],
        error: {
            type: apiError.type,
            message: apiError.message,
            details: apiError.details,
        }
    }, {status: apiError.statusCode});
  }
}