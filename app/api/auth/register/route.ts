import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const POST: (request: NextRequest) => Promise<NextResponse> = async request => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not set');
      return NextResponse.json(
        { success: false, message: 'Service configuration error' },
        { status: 503 }
      );
    }

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
    const existingGroup = await prisma.group.findUnique({
      where: { name: trimmedGroupName }
    });

    if (existingGroup) {
      return NextResponse.json(
        { success: false, message: 'A group with this name already exists' },
        { status: 400 }
      );
    }

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

    if (error instanceof Error) {
      if (error.message.includes('P2002')) {
        return NextResponse.json(
          { success: false, message: 'A group with this name already exists' },
          { status: 400 }
        );
      }

      if (error.message.includes('MONGODB_URI') ||
        error.message.includes('connect ECONNREFUSED') ||
        error.message.includes('Connection time out')) {
        return NextResponse.json(
          { success: false, message: 'Database connection error' },
          { status: 503 }
        );
      }
    }

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
};
