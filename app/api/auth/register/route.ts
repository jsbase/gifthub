import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { groupName, password } = await request.json();

    // Check if group already exists
    const existingGroup = await prisma.group.findUnique({
      where: { name: groupName }
    });

    if (existingGroup) {
      return NextResponse.json(
        { message: 'Group already exists' },
        { status: 400 }
      );
    }

    // Hash password and create group
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await prisma.group.create({
      data: {
        name: groupName,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Group created successfully',
      groupId: result.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        message: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}