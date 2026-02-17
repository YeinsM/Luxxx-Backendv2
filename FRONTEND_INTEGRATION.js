// Example integration for Luxxx Frontend
// How to connect the registration forms to the backend API

// SWITCH: 0 = localhost, 1 = DevTunnels
const USE_TUNNEL = 1;
const API_BASE_URL = USE_TUNNEL
  ? 'https://v9xj6vhl-5000.use2.devtunnels.ms/api'
  : 'http://localhost:5000/api';

// Example 1: Register Escort
export async function registerEscort(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/escort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        city: formData.city,
        age: parseInt(formData.age),
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Store token in localStorage
    localStorage.setItem('authToken', data.data.token);
    localStorage.setItem('userData', JSON.stringify(data.data.user));
    
    return data;
  } catch (error) {
    console.error('Error registering escort:', error);
    throw error;
  }
}

// Example 2: Register Member
export async function registerMember(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        city: formData.city,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('authToken', data.data.token);
    localStorage.setItem('userData', JSON.stringify(data.data.user));
    
    return data;
  } catch (error) {
    console.error('Error registering member:', error);
    throw error;
  }
}

// Example 3: Register Agency
export async function registerAgency(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/agency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agencyName: formData.agencyName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        city: formData.city,
        website: formData.website || undefined,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('authToken', data.data.token);
    localStorage.setItem('userData', JSON.stringify(data.data.user));
    
    return data;
  } catch (error) {
    console.error('Error registering agency:', error);
    throw error;
  }
}

// Example 4: Register Club
export async function registerClub(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/club`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clubName: formData.clubName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        website: formData.website || undefined,
        openingHours: formData.openingHours || undefined,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('authToken', data.data.token);
    localStorage.setItem('userData', JSON.stringify(data.data.user));
    
    return data;
  } catch (error) {
    console.error('Error registering club:', error);
    throw error;
  }
}

// Example 5: Login
export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('authToken', data.data.token);
    localStorage.setItem('userData', JSON.stringify(data.data.user));
    
    return data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

// Example 6: Get Current User (Protected Route)
export async function getCurrentUser() {
  try {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Token might be expired
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
      throw new Error(data.error || 'Failed to get user');
    }

    return data;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

// Example 7: Logout
export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  // Redirect to home or login page
  window.location.href = '/';
}

// Example 8: Check if user is authenticated
export function isAuthenticated() {
  const token = localStorage.getItem('authToken');
  return !!token;
}

// Example 9: Get stored user data
export function getUserData() {
  const userData = localStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
}

/* 
  HOW TO USE IN YOUR FORMS:
  
  In your register forms (e.g., /register/escort/page.tsx):
  
  import { registerEscort } from '@/services/api';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await registerEscort(formData);
      console.log('Registration successful:', result);
      router.push('/admin'); // Redirect to admin panel
    } catch (error) {
      alert(error.message); // Show error to user
    }
  };
  
  IMPORTANT: Make sure to start the backend server first!
  Run: npm run dev (in the Luxxx-Backendv2 directory)
*/
