import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../client/src/lib/queryClient";
import { AuthProvider } from "../client/src/hooks/use-auth";
import ProfileImageUpload from "../client/src/components/ProfileImageUpload";
import ProfileSettingsPage from "../client/src/pages/ProfileSettingsPage";
import { beforeEach, describe, expect, it, jest, test } from "@jest/globals";
import { ThemeProvider } from "../client/src/components/ui/theme-provider";
import { TooltipProvider } from "@radix-ui/react-tooltip";

// Mock useAuth hook
jest.mock("../client/src/hooks/use-auth", () => ({
  ...jest.requireActual("../client/src/hooks/use-auth"),
  useAuth: () => ({
    user: {
      id: 2,
      username: "testuser",
      email: "test@example.com",
      profileImage: null,
      role: "user",
    },
    isLoading: false,
    error: null,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock API requests
global.fetch = jest.fn();

// Mock createObjectURL and revokeObjectURL
URL.createObjectURL = jest.fn(() => "mock-url");
URL.revokeObjectURL = jest.fn();

// Helper function to create a file with specified properties
function createMockFile(name: string, size: number, type: string) {
  const file = new File(["test"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

// Wrapper component for rendering components with necessary providers
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="filmflex-theme">
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

// Clean up before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe("Profile Image Upload Tests", () => {
  /**
   * Test Case: TC_UI_001
   * Verify profile image upload UI is displayed
   */
  test("TC_UI_001: Verify profile image upload UI is displayed", async () => {
    render(
      <Wrapper>
        <ProfileImageUpload />
      </Wrapper>
    );

    // Check that upload button is visible and enabled
    const uploadButton = screen.getByRole("button", { name: /upload|change|edit profile/i });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeEnabled();
  });

  /**
   * Test Case: TC_FUNC_001
   * Upload valid image file
   */
  test("TC_FUNC_001: Upload valid image file", async () => {
    // Mock successful upload response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, profileImageUrl: "https://example.com/image.jpg" }),
    });

    render(
      <Wrapper>
        <ProfileImageUpload />
      </Wrapper>
    );

    // Create a valid file (jpg, under 5MB)
    const validFile = createMockFile("image.jpg", 1024 * 1024 * 2, "image/jpeg"); // 2MB

    // Get file input (it might be hidden in the UI)
    const fileInput = screen.getByLabelText(/upload/i) || document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Upload file
    userEvent.upload(fileInput as HTMLElement, validFile);

    // For form submission - if there's a separate submit button after selecting the file
    const submitButton = screen.queryByRole("button", { name: /save|upload|confirm/i });
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    // Wait for the upload to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Verify API call was made with correct form data
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toContain("/api/users"); // Endpoint should contain /api/users
    expect(fetchCall[1].method).toBe("POST") || expect(fetchCall[1].method).toBe("PUT");
    expect(fetchCall[1].body instanceof FormData).toBe(true);
  });

  /**
   * Test Case: TC_FUNC_002
   * Upload invalid file type
   */
  test("TC_FUNC_002: Upload invalid file type", async () => {
    render(
      <Wrapper>
        <ProfileImageUpload />
      </Wrapper>
    );

    // Create an invalid file type
    const invalidFile = createMockFile("document.txt", 1024, "text/plain");

    // Get file input
    const fileInput = screen.getByLabelText(/upload/i) || document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Upload invalid file
    userEvent.upload(fileInput as HTMLElement, invalidFile);

    // Wait for error message to appear
    await waitFor(() => {
      const errorMessage = screen.getByText(/invalid file type/i);
      expect(errorMessage).toBeInTheDocument();
    });

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC_FUNC_003
   * Upload oversized image file
   */
  test("TC_FUNC_003: Upload oversized image file", async () => {
    render(
      <Wrapper>
        <ProfileImageUpload />
      </Wrapper>
    );

    // Create an oversized file (>5MB)
    const oversizedFile = createMockFile("large.jpg", 1024 * 1024 * 6, "image/jpeg"); // 6MB

    // Get file input
    const fileInput = screen.getByLabelText(/upload/i) || document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Upload oversized file
    userEvent.upload(fileInput as HTMLElement, oversizedFile);

    // Wait for error message to appear
    await waitFor(() => {
      const errorMessage = screen.getByText(/file size exceeds limit/i);
      expect(errorMessage).toBeInTheDocument();
    });

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC_FUNC_004
   * Cancel image upload
   */
  test("TC_FUNC_004: Cancel image upload", async () => {
    render(
      <Wrapper>
        <ProfileImageUpload />
      </Wrapper>
    );

    // Create a valid file
    const validFile = createMockFile("image.jpg", 1024 * 1024, "image/jpeg"); // 1MB

    // Get file input
    const fileInput = screen.getByLabelText(/upload/i) || document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Upload file
    userEvent.upload(fileInput as HTMLElement, validFile);

    // Find and click cancel button
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Verify the upload was canceled (no API call made)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC_UI_002
   * Verify preview of selected image
   */
  test("TC_UI_002: Verify preview of selected image", async () => {
    render(
      <Wrapper>
        <ProfileImageUpload />
      </Wrapper>
    );

    // Create a valid file
    const validFile = createMockFile("image.jpg", 1024 * 1024, "image/jpeg"); // 1MB

    // Get file input
    const fileInput = screen.getByLabelText(/upload/i) || document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Upload file
    userEvent.upload(fileInput as HTMLElement, validFile);

    // Verify that createObjectURL was called to create a preview
    expect(URL.createObjectURL).toHaveBeenCalled();

    // Check that image preview is displayed
    const imagePreview = screen.getByAltText(/preview|profile/i);
    expect(imagePreview).toBeInTheDocument();
    expect(imagePreview).toHaveAttribute("src", "mock-url");
  });

  /**
   * Test Case: TC_FUNC_005
   * Remove existing profile image
   */
  test("TC_FUNC_005: Remove existing profile image", async () => {
    // Mock successful remove response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Mock useAuth with existing profile image
    jest.spyOn(require("../client/src/hooks/use-auth"), "useAuth").mockReturnValueOnce({
      user: {
        id: 2,
        username: "testuser",
        email: "test@example.com",
        profileImage: "https://example.com/existing-image.jpg",
        role: "user",
      },
      isLoading: false,
      error: null,
    });

    render(
      <Wrapper>
        <ProfileImageUpload />
      </Wrapper>
    );

    // Find and click remove button
    const removeButton = screen.getByRole("button", { name: /remove|delete/i });
    fireEvent.click(removeButton);

    // Wait for confirmation dialog (if present)
    const confirmButton = screen.queryByRole("button", { name: /confirm|yes/i });
    if (confirmButton) {
      fireEvent.click(confirmButton);
    }

    // Wait for the remove operation to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Verify API call was made to remove profile image
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toContain("/api/users"); // Endpoint should contain /api/users
    expect(fetchCall[1].method).toBe("DELETE") || expect(fetchCall[1].method).toBe("PUT");
  });
});