/**
 * FilmFlex Password Management Test Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSettingsPage } from '../client/src/pages/ProfileSettingsPage';

describe('Password Management', () => {
  // TC_PASS_001: Verify user can successfully change password
  test('TC_PASS_001: Verify user can successfully change password', async () => {
    // Mock the authentication context
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user'
    };
    
    // Mock the API request for password change
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Password updated successfully' })
    });
    
    render(<ProfileSettingsPage />);
    
    // Navigate to the password section
    const passwordTab = screen.getByRole('tab', { name: /password/i });
    fireEvent.click(passwordTab);
    
    // Fill in the password change form
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await userEvent.type(currentPasswordInput, 'currentPassword123');
    await userEvent.type(newPasswordInput, 'newPassword123');
    await userEvent.type(confirmPasswordInput, 'newPassword123');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
    });
  });
  
  // TC_PASS_002: Verify error when current password is incorrect
  test('TC_PASS_002: Verify error when current password is incorrect', async () => {
    // Mock the API request for failed password change due to incorrect current password
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false, message: 'Current password is incorrect' })
    });
    
    render(<ProfileSettingsPage />);
    
    // Navigate to the password section
    const passwordTab = screen.getByRole('tab', { name: /password/i });
    fireEvent.click(passwordTab);
    
    // Fill in the password change form with incorrect current password
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await userEvent.type(currentPasswordInput, 'wrongPassword');
    await userEvent.type(newPasswordInput, 'newPassword123');
    await userEvent.type(confirmPasswordInput, 'newPassword123');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    // Verify error message
    await waitFor(() => {
      expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
    });
  });

  // TC_PASS_003: Verify error when new password and confirm do not match
  test('TC_PASS_003: Verify error when new password and confirm do not match', async () => {
    render(<ProfileSettingsPage />);
    
    // Navigate to the password section
    const passwordTab = screen.getByRole('tab', { name: /password/i });
    fireEvent.click(passwordTab);
    
    // Fill in the password change form with mismatched passwords
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await userEvent.type(currentPasswordInput, 'currentPassword123');
    await userEvent.type(newPasswordInput, 'newPassword123');
    await userEvent.type(confirmPasswordInput, 'differentPassword123');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    // Verify client-side validation error message
    expect(screen.getByText(/new password and confirmation do not match/i)).toBeInTheDocument();
  });

  // TC_PASS_004: Verify password complexity validation
  test('TC_PASS_004: Verify password complexity validation', async () => {
    render(<ProfileSettingsPage />);
    
    // Navigate to the password section
    const passwordTab = screen.getByRole('tab', { name: /password/i });
    fireEvent.click(passwordTab);
    
    // Fill in the password change form with a weak password
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await userEvent.type(currentPasswordInput, 'currentPassword123');
    await userEvent.type(newPasswordInput, '123');
    await userEvent.type(confirmPasswordInput, '123');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    // Verify client-side validation error for password complexity
    expect(screen.getByText(/password does not meet complexity requirements/i)).toBeInTheDocument();
  });

  // TC_PASS_005: Verify password fields are masked
  test('TC_PASS_005: Verify password fields are masked', () => {
    render(<ProfileSettingsPage />);
    
    // Navigate to the password section
    const passwordTab = screen.getByRole('tab', { name: /password/i });
    fireEvent.click(passwordTab);
    
    // Verify password fields have type="password"
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    expect(currentPasswordInput).toHaveAttribute('type', 'password');
    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });
});