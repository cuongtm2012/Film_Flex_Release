import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Film } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');
    setIsSuccess(false);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setIsSuccess(true);
        setEmail(''); // Clear the form
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - PhimGG</title>
        <meta name="description" content="Reset your password for PhimGG account - Your gateway to premium entertainment" />
      </Helmet>
      
      {/* Cinematic Background with Film Texture */}
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/20 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-2xl animate-pulse"></div>
        </div>
        
        {/* Film Strip Border Effect */}
        <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-b from-red-600 via-red-700 to-red-800 opacity-30">
          <div className="flex flex-col h-full">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="flex-1 border-b border-black/50 relative">
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-2 bg-black rounded-sm"></div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-b from-red-600 via-red-700 to-red-800 opacity-30">
          <div className="flex flex-col h-full">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="flex-1 border-b border-black/50 relative">
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-2 bg-black rounded-sm"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
          <div className="w-full max-w-md space-y-8">
            {/* Cinematic Header */}
            <div className="text-center space-y-6">
              {/* Logo/Icon Area */}
              <div className="relative mx-auto w-24 h-24 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-2xl border-2 border-red-500/50">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent rounded-full animate-pulse"></div>
                <Mail className="h-12 w-12 text-white relative z-10" />
                <Film className="absolute -top-2 -right-2 h-6 w-6 text-red-300 animate-bounce" />
              </div>
              
              {/* Dramatic Typography */}
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Forgot your{' '}
                  <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                    password?
                  </span>
                </h1>
                <p className="text-gray-300 text-lg leading-relaxed max-w-sm mx-auto">
                  Enter your email and we'll send you a link to reset your password
                </p>
              </div>
            </div>

            {/* Main Form Card */}
            <Card className="bg-black/80 backdrop-blur-lg border border-red-500/30 shadow-2xl shadow-red-900/20">
              <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-2xl text-center text-white font-semibold">
                  Reset Password
                </CardTitle>
                <CardDescription className="text-center text-gray-400 text-base">
                  We'll email you a secure reset link
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Success Message */}
                {isSuccess && (
                  <Alert className="border-green-500/50 bg-green-500/10 backdrop-blur">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <AlertDescription className="text-green-300 text-base">
                      {message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Message */}
                {error && (
                  <Alert className="border-red-500/50 bg-red-500/10 backdrop-blur">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <AlertDescription className="text-red-300 text-base">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {!isSuccess && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-gray-300 text-base font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-12 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500/20 transition-all duration-300 text-base"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold text-base shadow-lg shadow-red-600/25 border-none transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-red-600/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </div>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </form>
                )}

                {/* Back to Login */}
                <div className="pt-4 text-center border-t border-gray-800">
                  <Link href="/auth">
                    <Button 
                      variant="ghost" 
                      className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-300 group"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Support Footer */}
            <div className="text-center">
              <p className="text-gray-500 text-sm">
                Having trouble?{' '}
                <Link href="/contact" className="text-red-400 hover:text-red-300 underline decoration-red-400/50 hover:decoration-red-300 transition-colors duration-300">
                  Contact Support
                </Link>
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-red-600/20">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-600/30 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-red-600/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-2 h-2 rounded-full bg-red-600/30 animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for additional cinematic effects */}
      <style jsx>{`
        @keyframes filmGrain {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.15; }
        }
        
        .film-grain::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0);
          background-size: 20px 20px;
          animation: filmGrain 2s infinite;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}