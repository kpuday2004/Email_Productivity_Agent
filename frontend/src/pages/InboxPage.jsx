import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, LogOut, Settings, MessageSquare, Sparkles, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InboxPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [emails, setEmails] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showChat, setShowChat] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchEmails();
    fetchPrompts();
    fetchChatHistory();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (err) {
      navigate('/');
    }
  };

  const fetchEmails = async () => {
    try {
      const response = await axios.get(`${API}/emails`, { withCredentials: true });
      setEmails(response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load emails');
      setLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      const response = await axios.get(`${API}/prompts`, { withCredentials: true });
      setPrompts(response.data);
    } catch (err) {
      toast.error('Failed to load prompts');
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history`, { withCredentials: true });
      setChatMessages(response.data);
    } catch (err) {
      // No chat history yet
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.success('Logged out successfully');
      navigate('/');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const handleEmailClick = (emailId) => {
    navigate(`/email/${emailId}`);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, userMsg]);
    setChatInput('');
    setSendingChat(true);

    try {
      const response = await axios.post(
        `${API}/chat`,
        { message: chatInput },
        { withCredentials: true }
      );
      
      const assistantMsg = { role: 'assistant', content: response.data.response };
      setChatMessages([...chatMessages, userMsg, assistantMsg]);
    } catch (err) {
      toast.error('Chat failed. Please try again.');
    } finally {
      setSendingChat(false);
    }
  };

  const handleUpdatePrompt = async (promptId, updatedData) => {
    try {
      await axios.put(
        `${API}/prompts/${promptId}`,
        updatedData,
        { withCredentials: true }
      );
      toast.success('Prompt updated successfully');
      fetchPrompts();
      setEditingPrompt(null);
    } catch (err) {
      toast.error('Failed to update prompt');
    }
  };

  const filteredEmails = categoryFilter === 'all' 
    ? emails 
    : emails.filter(e => e.category === categoryFilter);

  const unreadCount = emails.filter(e => !e.is_read).length;

  const getCategoryColor = (category) => {
    const colors = {
      'Important': 'category-important',
      'Newsletter': 'category-newsletter',
      'Spam': 'category-spam',
      'To-Do': 'category-todo'
    };
    return colors[category] || 'bg-gray-500';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
          <p className="mt-4 text-white text-lg">Loading your inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Email Brain</h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Dialog open={showPrompts} onOpenChange={setShowPrompts}>
                <DialogTrigger asChild>
                  <Button data-testid="prompts-button" variant="outline" className="rounded-xl">
                    <Settings className="w-4 h-4 mr-2" />
                    Prompts
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Manage AI Prompts</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                      {prompts.map((prompt) => (
                        <div key={prompt.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-800">{prompt.name}</h3>
                            <Button
                              data-testid={`edit-prompt-${prompt.prompt_type}`}
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPrompt(prompt)}
                            >
                              Edit
                            </Button>
                          </div>
                          {editingPrompt?.id === prompt.id ? (
                            <div className="space-y-3">
                              <Input
                                value={editingPrompt.name}
                                onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                                placeholder="Prompt name"
                              />
                              <Textarea
                                value={editingPrompt.content}
                                onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                                rows={4}
                                placeholder="Prompt content"
                              />
                              <div className="flex gap-2">
                                <Button
                                  data-testid="save-prompt"
                                  onClick={() => handleUpdatePrompt(prompt.id, { name: editingPrompt.name, content: editingPrompt.content })}
                                >
                                  Save
                                </Button>
                                <Button variant="outline" onClick={() => setEditingPrompt(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">{prompt.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog open={showChat} onOpenChange={setShowChat}>
                <DialogTrigger asChild>
                  <Button data-testid="chat-button" variant="outline" className="rounded-xl">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Chat with Email Agent</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[50vh] pr-4 mb-4">
                    <div className="space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`chat-message ${msg.role}`}>
                          {msg.content}
                        </div>
                      ))}
                      {sendingChat && (
                        <div className="chat-message assistant">
                          <div className="flex gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      data-testid="chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="Ask about your emails..."
                      disabled={sendingChat}
                    />
                    <Button data-testid="send-chat" onClick={handleSendChat} disabled={sendingChat}>
                      Send
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button data-testid="logout-button" variant="outline" onClick={handleLogout} className="rounded-xl">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Emails</p>
                <p className="text-3xl font-bold text-gray-800">{emails.length}</p>
              </div>
              <Mail className="w-10 h-10 text-purple-500" />
            </div>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-3xl font-bold text-indigo-600">{unreadCount}</p>
              </div>
              <Sparkles className="w-10 h-10 text-indigo-500" />
            </div>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categorized</p>
                <p className="text-3xl font-bold text-purple-600">{emails.filter(e => e.category).length}</p>
              </div>
              <Filter className="w-10 h-10 text-purple-500" />
            </div>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Actions</p>
                <p className="text-3xl font-bold text-indigo-600">{emails.filter(e => e.action_items?.length > 0).length}</p>
              </div>
              <RefreshCw className="w-10 h-10 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="glass-card p-6">
          <Tabs defaultValue="all" onValueChange={setCategoryFilter}>
            <TabsList className="mb-6">
              <TabsTrigger data-testid="filter-all" value="all">All</TabsTrigger>
              <TabsTrigger data-testid="filter-important" value="Important">Important</TabsTrigger>
              <TabsTrigger data-testid="filter-todo" value="To-Do">To-Do</TabsTrigger>
              <TabsTrigger data-testid="filter-newsletter" value="Newsletter">Newsletter</TabsTrigger>
              <TabsTrigger data-testid="filter-spam" value="Spam">Spam</TabsTrigger>
            </TabsList>

            <TabsContent value={categoryFilter}>
              <div className="space-y-3">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    data-testid={`email-card-${email.id}`}
                    className={`email-card ${!email.is_read ? 'unread' : ''}`}
                    onClick={() => handleEmailClick(email.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-800">{email.sender}</h3>
                          {email.category && (
                            <span className={`category-badge ${getCategoryColor(email.category)}`}>
                              {email.category}
                            </span>
                          )}
                          {!email.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{email.subject}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{email.body}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500">{formatDate(email.received_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default InboxPage;