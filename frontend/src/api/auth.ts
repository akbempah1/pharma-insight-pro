import api from './index';

export interface User {
  id: number;
  email: string;
  pharmacy_name: string;
  is_premium: boolean;
  session_id: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  pharmacy_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

const AUTH_TOKEN_KEY = 'pharma_auth_token';
const AUTH_USER_KEY = 'pharma_auth_user';

// Save auth data to localStorage
export const saveAuth = (data: AuthResponse) => {
  localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
};

// Get saved token
export const getToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// Get saved user
export const getUser = (): User | null => {
  const user = localStorage.getItem(AUTH_USER_KEY);
  return user ? JSON.parse(user) : null;
};

// Clear auth data
export const clearAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem('pharma_session_id');
};

// Check if logged in
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Register new user
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', data);
  saveAuth(response.data);
  return response.data;
};

// Login user
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', data);
  saveAuth(response.data);
  return response.data;
};

// Get current user
export const getMe = async (): Promise<User> => {
  const response = await api.get('/auth/me', {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return response.data;
};

// Update user's session_id
export const updateSession = async (sessionId: string): Promise<void> => {
  await api.put(`/auth/session/${sessionId}`, null, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  
  // Update local user data
  const user = getUser();
  if (user) {
    user.session_id = sessionId;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
};

// Logout
export const logout = () => {
  clearAuth();
  window.location.href = '/login';
};