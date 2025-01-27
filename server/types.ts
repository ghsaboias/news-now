
// TypeScript definitions for common types
export type User = {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
};

export type WebhookRequest = {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: Date;
};

export type ErrorResponse = {
  status: number;
  message: string;
  details?: any;
};

export type JwtPayload = {
  userId: string;
  username: string;
  exp: number;
};
