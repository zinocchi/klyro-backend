declare namespace Express {
  interface AuthUser {
    id: string;
    email: string;
  }

  interface Request {
    user?: AuthUser;
  }
}
