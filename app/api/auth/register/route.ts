import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not set');
      return NextResponse.json(
        { success: false, message: 'Service configuration error' },
        { status: 503 }
      );
    }

    // Parse and validate request body
    let groupName: string;
    let password: string;
    
    try {
      const body = await request.json();
      groupName = body.groupName;
      password = body.password;
    } catch (e) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate input
    if (!groupName || typeof groupName !== 'string' || groupName.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'Group name must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const trimmedGroupName = groupName.trim();

    // Check if group already exists
    const existingGroup = await prisma.group.findUnique({
      where: { name: trimmedGroupName }
    });

    if (existingGroup) {
      return NextResponse.json(
        { success: false, message: 'A group with this name already exists' },
        { status: 400 }
      );
    }

    // Hash password and create group
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await prisma.group.create({
      data: {
        name: trimmedGroupName,
        password: hashedPassword,
      },
    });

    if (!result || !result.id) {
      throw new Error('Failed to create group');
    }

    return NextResponse.json({
      success: true,
      message: 'Group created successfully',
      groupId: result.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Handle Prisma-specific errors
      if (error.message.includes('P2002')) {
        return NextResponse.json(
          { success: false, message: 'A group with this name already exists' },
          { status: 400 }
        );
      }
      
      // Handle connection errors
      if (error.message.includes('MONGODB_URI') || 
          error.message.includes('connect ECONNREFUSED') ||
          error.message.includes('Connection time out')) {
        return NextResponse.json(
          { success: false, message: 'Database connection error' },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}