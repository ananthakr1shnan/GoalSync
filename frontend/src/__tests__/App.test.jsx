import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import App from '../App';
import { describe, it, expect } from 'vitest';

describe('App Component', () => {
  it('renders without crashing', () => {
    // Because App uses useAuth (which we can mock or provide), 
    // we wrap it in necessary providers. 
    // In this basic test, we just ensure it mounts.
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    // Since App has a Routes component and might redirect to /login, 
    // we just check if it renders successfully without throwing errors.
    expect(true).toBe(true);
  });
});
