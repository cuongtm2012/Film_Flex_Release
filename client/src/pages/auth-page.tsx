import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms of Service and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation, registerMutation } = useAuth();

  // Redirect if user is already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  const [authError, setAuthError] = useState<string | null>(null);

  const onLoginSubmit = (data: LoginFormValues) => {
    setAuthError(null);
    loginMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        navigate("/");
      },
      onError: (error) => {
        setAuthError(error.message || "We're having trouble signing you in. Please check your credentials and try again.");
        toast({
          title: "Login failed",
          description: error.message || "Please check your credentials and try again",
          variant: "destructive",
        });
      },
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, agreeToTerms, ...registerData } = data;

    registerMutation.mutate(registerData, {
      onSuccess: () => {
        toast({
          title: "Registration successful",
          description: "Your account has been created",
        });
        navigate("/");
      },
      onError: (error) => {
        toast({
          title: "Registration failed",
          description:
            error.message || "Please try again with different information",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="flex h-screen">
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-6">
        <div className="mx-auto w-full max-w-md">
          <Tabs
            defaultValue="login"
            onValueChange={setActiveTab}
            value={activeTab}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="login-form"
                >
                  <CardContent className="space-y-4">
                    {authError && (
                      <div
                        className="bg-destructive/15 text-destructive px-4 py-3 rounded-md auth-error"
                        data-testid="auth-error"
                      >
                        <p>{authError}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="username">Username</Label>
                        {loginForm.formState.errors.username && (
                          <span className="text-xs text-destructive">
                            {loginForm.formState.errors.username.message}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="username"
                          type="text"
                          data-testid="username"
                          className={`username-input pl-10 ${
                            loginForm.formState.errors.username
                              ? "border-destructive"
                              : ""
                          }`}
                          placeholder="Enter your username"
                          {...loginForm.register("username", { required: true })}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70">
                          <svg
                            className="w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 pl-3 left-0 flex items-center">
                          <span className="pl-6"></span> {/* Spacer for the icon */}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {loginForm.formState.errors.password && (
                          <span className="text-xs text-destructive">
                            {loginForm.formState.errors.password.message}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <PasswordInput
                          id="password"
                          data-testid="password"
                          className={`password-input pl-10 ${
                            loginForm.formState.errors.password
                              ? "border-destructive"
                              : ""
                          }`}
                          placeholder="••••••••"
                          {...loginForm.register("password")}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70">
                          <svg
                            className="w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 pl-3 left-0 flex items-center">
                          <span className="pl-6"></span> {/* Spacer for the icon */}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" />
                        <label
                          htmlFor="remember"
                          className="text-sm text-muted-foreground"
                        >
                          Remember me
                        </label>
                      </div>

                      <a
                        href="/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-4">
                    <Button
                      type="submit"
                      data-testid="login-button"
                      className="login-button w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Logging in...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>

                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-background text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          // Check if OAuth is configured
                          fetch('/api/auth/google')
                            .then(response => {
                              if (response.ok) {
                                window.location.href = "/api/auth/google";
                              } else {
                                toast({
                                  title: "Google Sign-In Unavailable",
                                  description: "Google authentication is not configured. Please use email/password login.",
                                  variant: "destructive",
                                });
                              }
                            })
                            .catch(() => {
                              toast({
                                title: "Google Sign-In Unavailable",
                                description: "Google authentication is not configured. Please use email/password login.",
                                variant: "destructive",
                              });
                            });
                        }}
                        className="flex items-center justify-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                          <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Google
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Check if Facebook OAuth is configured
                          fetch('/api/auth/facebook')
                            .then(response => {
                              if (response.ok) {
                                window.location.href = "/api/auth/facebook";
                              } else {
                                toast({
                                  title: "Facebook Sign-In Unavailable",
                                  description: "Facebook authentication is not configured. Please use email/password login.",
                                  variant: "destructive",
                                });
                              }
                            })
                            .catch(() => {
                              toast({
                                title: "Facebook Sign-In Unavailable",
                                description: "Facebook authentication is not configured. Please use email/password login.",
                                variant: "destructive",
                              });
                            });
                        }}
                        className="flex items-center justify-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </button>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Join FilmFlex to access our vast collection of movies
                  </CardDescription>
                </CardHeader>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="registerUsername">Username</Label>
                        {registerForm.formState.errors.username && (
                          <span className="text-xs text-destructive">
                            {registerForm.formState.errors.username.message}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="registerUsername"
                          type="text"
                          className={`pl-10 ${
                            registerForm.formState.errors.username
                              ? "border-destructive"
                              : ""
                          }`}
                          placeholder="Choose a username"
                          {...registerForm.register("username")}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70">
                          <svg
                            className="w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 pl-3 left-0 flex items-center">
                          <span className="pl-6"></span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email">Email</Label>
                        {registerForm.formState.errors.email && (
                          <span className="text-xs text-destructive">
                            {registerForm.formState.errors.email.message}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          className={`pl-10 ${
                            registerForm.formState.errors.email
                              ? "border-destructive"
                              : ""
                          }`}
                          placeholder="you@example.com"
                          {...registerForm.register("email")}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70">
                          <svg
                            className="w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 pl-3 left-0 flex items-center">
                          <span className="pl-6"></span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="registerPassword">Password</Label>
                        {registerForm.formState.errors.password && (
                          <span className="text-xs text-destructive">
                            {registerForm.formState.errors.password.message}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <PasswordInput
                          id="registerPassword"
                          className={`pl-10 ${
                            registerForm.formState.errors.password
                              ? "border-destructive"
                              : ""
                          }`}
                          placeholder="••••••••"
                          {...registerForm.register("password")}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70">
                          <svg
                            className="w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 pl-3 left-0 flex items-center">
                          <span className="pl-6"></span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters long with at least one
                        uppercase letter, one lowercase letter, and one number
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        {registerForm.formState.errors.confirmPassword && (
                          <span className="text-xs text-destructive">
                            {registerForm.formState.errors.confirmPassword.message}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <PasswordInput
                          id="confirmPassword"
                          className={`pl-10 ${
                            registerForm.formState.errors.confirmPassword
                              ? "border-destructive"
                              : ""
                          }`}
                          placeholder="••••••••"
                          {...registerForm.register("confirmPassword")}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/70">
                          <svg
                            className="w-4 h-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          </svg>
                        </div>
                        <div className="absolute inset-y-0 pl-3 left-0 flex items-center">
                          <span className="pl-6"></span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="terms" 
                          checked={registerForm.watch("agreeToTerms")}
                          onCheckedChange={(checked) => 
                            registerForm.setValue("agreeToTerms", checked === true)
                          }
                          className={
                            registerForm.formState.errors.agreeToTerms
                              ? "border-destructive"
                              : ""
                          }
                        />
                        <div className="flex-1">
                          <label
                            htmlFor="terms"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            I agree to the{" "}
                            <a
                              href="/terms"
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                              href="/privacy"
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Privacy Policy
                            </a>
                          </label>
                          {registerForm.formState.errors.agreeToTerms && (
                            <div className="text-xs text-destructive mt-1">
                              {registerForm.formState.errors.agreeToTerms.message}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-4">
                    <Button
                      type="submit"
                      className="w-full"
                      data-testid="register-button"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>

                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-background text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          // Check if OAuth is configured
                          fetch('/api/auth/google')
                            .then(response => {
                              if (response.ok) {
                                window.location.href = "/api/auth/google";
                              } else {
                                toast({
                                  title: "Google Sign-In Unavailable",
                                  description: "Google authentication is not configured. Please use email/password login.",
                                  variant: "destructive",
                                });
                              }
                            })
                            .catch(() => {
                              toast({
                                title: "Google Sign-In Unavailable",
                                description: "Google authentication is not configured. Please use email/password login.",
                                variant: "destructive",
                              });
                            });
                        }}
                        className="flex items-center justify-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                          <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Google
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Check if Facebook OAuth is configured
                          fetch('/api/auth/facebook')
                            .then(response => {
                              if (response.ok) {
                                window.location.href = "/api/auth/facebook";
                              } else {
                                toast({
                                  title: "Facebook Sign-In Unavailable",
                                  description: "Facebook authentication is not configured. Please use email/password login.",
                                  variant: "destructive",
                                });
                              }
                            })
                            .catch(() => {
                              toast({
                                title: "Facebook Sign-In Unavailable",
                                description: "Facebook authentication is not configured. Please use email/password login.",
                                variant: "destructive",
                              });
                            });
                        }}
                        className="flex items-center justify-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </button>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:block w-1/2 bg-gradient-to-br from-gray-900 to-black text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI3NjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBmaWxsPSIjMjEyMTIxIiBkPSJNMCAwaDEwODB2NzYwSDB6Ii8+PGcgb3BhY2l0eT0iLjA1Ij48Y2lyY2xlIGN4PSI2NzIiIGN5PSI4MyIgcj0iMzMiIGZpbGw9IiNGRkYiLz48Y2lyY2xlIGN4PSI4NTAiIGN5PSIyMzgiIHI9IjI0IiBmaWxsPSIjRkZGIi8+PGNpcmNsZSBjeD0iOTc5IiBjeT0iMTk4IiByPSIyNCIgZmlsbD0iI0ZGRiIvPjxjaXJjbGUgY3g9IjMwNSIgY3k9IjE4NyIgcj0iMTUiIGZpbGw9IiNGRkYiLz48Y2lyY2xlIGN4PSIzMjMiIGN5PSIzNTciIHI9IjE1IiBmaWxsPSIjRkZGIi8+PGNpcmNsZSBjeD0iOTUxIiBjeT0iMzQzIiByPSIxNSIgZmlsbD0iI0ZGRiIvPjxjaXJjbGUgY3g9IjEwNTAiIGN5PSIzNzYiIHI9IjE1IiBmaWxsPSIjRkZGIi8+PGNpcmNsZSBjeD0iNjY1IiBjeT0iNDc0IiByPSIxNSIgZmlsbD0iI0ZGRiIvPjxjaXJjbGUgY3g9IjU4MSIgY3k9IjQxOCIgcj0iMTUiIGZpbGw9IiNGRkYiLz48Y2lyY2xlIGN4PSI2NjUiIGN5PSI0NzQiIHI9IjE1IiBmaWxsPSIjRkZGIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-40"></div>

        <div className="h-full flex flex-col justify-center relative z-10">
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg mr-3 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h18M3 16h18"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold">FilmFlex</h1>
          </div>

          <h2 className="text-3xl font-semibold mb-6 leading-tight">
            Your Ultimate{" "}
            <span className="text-primary">Movie Experience</span>
          </h2>

          <p className="text-lg mb-8 text-gray-300 max-w-lg">
            Discover, watch, and enjoy thousands of movies and TV shows from
            around the world. With FilmFlex, your entertainment journey knows no
            bounds.
          </p>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="flex items-start mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-1">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 8h-3v14h18v-14h-3v-2c0-2.209-1.791-4-4-4s-4 1.791-4 4v2zm0 0v-2c0-1.105.895-2 2-2s2 .895 2 2v2h-4z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Secure Access</h3>
                  <p className="text-sm text-gray-400">
                    Role-based permissions for personalized experience
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="flex items-start mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-1">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Seamless Experience</h3>
                  <p className="text-sm text-gray-400">
                    Continue watching where you left off
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="flex items-start mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-1">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">HD Streaming</h3>
                  <p className="text-sm text-gray-400">
                    Premium quality on all your devices
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="flex items-start mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-1">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Watchlists</h3>
                  <p className="text-sm text-gray-400">
                    Organize and save your favorites
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center text-sm text-gray-400">
            <span>Already have thousands of happy users worldwide</span>
            <div className="flex -space-x-2 ml-4">
              <div className="w-6 h-6 rounded-full bg-blue-500 border border-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-green-500 border border-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-yellow-500 border border-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-purple-500 border border-gray-800"></div>
              <div className="w-6 h-6 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center text-[10px]">
                +5k
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}