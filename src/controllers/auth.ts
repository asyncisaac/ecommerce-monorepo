import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

function getBcryptRounds(): number {
  const roundsRaw = Number(process.env.BCRYPT_ROUNDS ?? '12');
  return Number.isFinite(roundsRaw) && roundsRaw >= 10 && roundsRaw <= 14 ? roundsRaw : 12;
}

function getJwtSecretOrThrow(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('Configuração inválida: JWT_SECRET ausente ou fraco');
  }
  return secret;
}

export const register = async (req: Request, res: Response) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const name = String(req.body.name ?? '').trim();
  const password = String(req.body.password ?? '');

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, getBcryptRounds());

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = jwt.sign({ userId: user.id }, getJwtSecretOrThrow(), { expiresIn: '1h' });

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const login = async (req: Request, res: Response) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, getJwtSecretOrThrow(), { expiresIn: '1h' });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
};
