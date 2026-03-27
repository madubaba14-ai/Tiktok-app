import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hashPassword,
  generateToken,
  setSessionCookie,
  excludePassword,
  isValidEmail,
  isValidUsername,
  isValidPassword,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, password, displayName } = body;
    
    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate username format
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingEmail = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }
    
    // Check if username already exists
    const existingUsername = await db.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName: displayName || username,
        passwordHash,
      },
    });
    
    // Generate session token
    const token = generateToken();
    
    // Set session cookie
    await setSessionCookie(token, user.id);
    
    // Return user without password hash
    return NextResponse.json({
      user: excludePassword(user),
      token,
      message: 'Registration successful',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
