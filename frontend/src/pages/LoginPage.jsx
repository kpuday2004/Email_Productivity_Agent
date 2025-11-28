import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Sparkles, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@email.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        if (response.data) {
          navigate('/inbox');
        }
      } catch (err) {
        // Not authenticated
      }
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      toast.success('Login successful!');
      navigate('/inbox');
    } catch (err) {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-4xl w-full p-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Email Brain
              </h1>
            </div>
            
            <p className="text-lg text-gray-700 mb-8">
              Your intelligent email productivity agent powered by AI
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Smart Categorization</h3>
                  <p className="text-sm text-gray-600">Automatically categorize emails using custom prompts</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Brain className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Action Extraction</h3>
                  <p className="text-sm text-gray-600">Extract tasks and deadlines from your emails</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Auto-Draft Replies</h3>
                  <p className="text-sm text-gray-600">Generate professional email replies instantly</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  data-testid="email-input"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  data-testid="password-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <Button
                data-testid="login-button"
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Demo credentials:</strong><br />
                Email: demo@email.com<br />
                Password: demo123
              </p>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="floating-animation">
              <img
                src="https://images.unsplash.com/photo-1759661966728-4a02e3c6ed91?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxwcm9kdWN0aXZpdHklMjBkYXNoYm9hcmR8ZW58MHx8fHwxNzY0MjU0MDYwfDA&ixlib=rb-4.1.0&q=85"
                alt="Email productivity"
                className="rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;