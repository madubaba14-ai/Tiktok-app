import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyPassword,
  generateToken,
  setSessionCookie,
  excludePassword,
  isValidEmail,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if user has password authentication
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'This account uses Google Sign-In. Please use that method to log in.' },
        { status: 400 }
      );
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Update last active
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    
    // Generate session token
    const token = generateToken();
    
    // Set session cookie
    await setSessionCookie(token, user.id);
    
    // Return user without password hash
    return NextResponse.json({
      user: excludePassword(user),
      token,
      message: 'Login successful',
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
