import "express";

declare namespace Express {
  interface AuthUser {
    id: string;
    email: string;
  }

  interface Request {
    user?: AuthUser;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}
