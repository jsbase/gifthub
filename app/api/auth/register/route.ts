import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { groupName, password } = await request.json();

    const client = await clientPromise;
    const db = client.db();
    const groups = db.collection('groups');

    // Check if group already exists
    const existingGroup = await groups.findOne({ groupName });
    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group name already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new group
    const result = await groups.insertOne({
      groupName,
      password: hashedPassword,
      members: [],
      gifts: [],
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: 'Group created successfully', groupId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}