import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { RegisterUserData, LoginUserData, AuthResponse } from './types.js';

const prisma = new PrismaClient();

export class AuthService {
  async register(userData: RegisterUserData): Promise<AuthResponse> {
    try {
      // Verificar se usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User already exists',
          error: 'User already exists with this email',
        };
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Failed to register user',
        error: 'Failed to register user',
      };
    }
  }

  async login(loginData: LoginUserData): Promise<AuthResponse> {
    try {
      // Encontrar usuário pelo email
      const user = await prisma.user.findUnique({
        where: { email: loginData.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          createdAt: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'Invalid email or password',
        };
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'Invalid email or password',
        };
      }

      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      // Remover password da resposta
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Failed to login',
        error: 'Failed to login',
      };
    }
  }
}

export const authService = new AuthService();