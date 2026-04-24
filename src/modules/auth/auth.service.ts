import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { RegisterUserData, LoginUserData, AuthResponse } from './types.js';

function getJwtSecretOrThrow(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('Configuração inválida: JWT_SECRET ausente ou fraco');
  }
  return secret;
}

export class AuthService {
  async register(userData: RegisterUserData): Promise<AuthResponse> {
    try {
      const email = userData.email.trim().toLowerCase();
      // Verificar se usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
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
          email,
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
        getJwtSecretOrThrow(),
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
      const email = loginData.email.trim().toLowerCase();
      // Encontrar usuário pelo email
      const user = await prisma.user.findUnique({
        where: { email },
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
        getJwtSecretOrThrow(),
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
