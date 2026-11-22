import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from './auth.schema.js';

const SALT_ROUNDS = 10;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  monthly_budget: number | null;
  language: string;
  daily_reminder_time: string | null;
  created_at: Date;
}

export interface AuthResult {
  user: UserProfile;
  token: string;
}

const profileSelect = {
  id: true,
  email: true,
  name: true,
  monthly_budget: true,
  language: true,
  daily_reminder_time: true,
  created_at: true,
} as const;

export function generateToken(user: Pick<UserProfile, 'id' | 'email'>): string {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw AppError.conflict('Email is already registered');
  }

  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, password_hash },
    select: profileSelect,
  });

  return { user, token: generateToken(user) };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same message for unknown email and wrong password: no account enumeration.
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);

  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const profile: UserProfile = {
    id: user.id,
    email: user.email,
    name: user.name,
    monthly_budget: user.monthly_budget,
    language: user.language,
    daily_reminder_time: user.daily_reminder_time,
    created_at: user.created_at,
  };

  return { user: profile, token: generateToken(profile) };
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });

  if (!user) {
    throw AppError.unauthorized('Authenticated user no longer exists');
  }

  return user;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.monthly_budget !== undefined) data.monthly_budget = input.monthly_budget;
  if (input.language !== undefined) data.language = input.language;
  if (input.daily_reminder_time !== undefined) data.daily_reminder_time = input.daily_reminder_time;

  return prisma.user.update({ where: { id: userId }, data, select: profileSelect });
}

export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password_hash: true },
  });

  if (!user) {
    throw AppError.unauthorized('Authenticated user no longer exists');
  }

  const matches = await bcrypt.compare(input.current_password, user.password_hash);

  if (!matches) {
    throw AppError.unauthorized('Current password is incorrect');
  }

  const password_hash = await bcrypt.hash(input.new_password, SALT_ROUNDS);

  await prisma.user.update({ where: { id: userId }, data: { password_hash } });
}
