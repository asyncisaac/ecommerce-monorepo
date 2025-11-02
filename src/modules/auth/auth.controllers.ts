import { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { RegisterUserData, LoginUserData } from './types.js';

export class AuthController {
  async register(request: Request, response: Response): Promise<void> {
    try {
      const userData: RegisterUserData = {
        email: request.body.email,
        password: request.body.password,
        name: request.body.name,
      };

      // Validação básica
      if (!userData.email || !userData.password || !userData.name) {
        response.status(400).json({
          success: false,
          error: 'Email, password, and name are required',
        });
        return;
      }

      if (userData.password.length < 6) {
        response.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long',
        });
        return;
      }

      const result = await authService.register(userData);

      if (!result.success) {
        response.status(400).json(result);
        return;
      }

      response.status(201).json(result);
    } catch (error) {
      console.error('Register controller error:', error);
      response.status(500).json({
        success: false,
        error: 'Internal server error during registration',
      });
    }
  }

  async login(request: Request, response: Response): Promise<void> {
    try {
      const loginData: LoginUserData = {
        email: request.body.email,
        password: request.body.password,
      };

      // Validação básica
      if (!loginData.email || !loginData.password) {
        response.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const result = await authService.login(loginData);

      if (!result.success) {
        response.status(401).json(result);
        return;
      }

      response.status(200).json(result);
    } catch (error) {
      console.error('Login controller error:', error);
      response.status(500).json({
        success: false,
        error: 'Internal server error during login',
      });
    }
  }
}

export const authController = new AuthController();