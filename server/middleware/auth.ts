
import jwt from 'jsonwebtoken';
import config from './config';
import { ErrorResponse } from './types';

export const generateToken = (user: { id: string; username: string }) => {
  const payload: jwt.JwtPayload = {
    userId: user.id,
    username: user.username,
    exp: Date.now() + 86400000, // 24 hours
  };

  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });
};

export const authenticate = (req: any, res: any, next: any) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        status: 401,
        message: 'Unauthorized',
        details: 'Missing authentication token'
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 401,
      message: 'Unauthorized',
      details: 'Invalid authentication token'
    });
  }
};
