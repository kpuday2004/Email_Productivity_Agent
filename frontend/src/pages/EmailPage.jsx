import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Sparkles, Clock, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmail();
  }, [id]);

  const fetchEmail = async () => {
    try {
      const response = await axios.get(`${API}/emails/${id}`, { withCredentials: true });
      setEmail(response.data);
      setLoading(false);

      if (!response.data.is_read) {
        await axios.patch(`${API}/emails/${id}/read`, {}, { withCredentials: true });
      }
    } catch (err) {
      toast.error('Failed to load email');
      navigate('/inbox');
    }
  };

  const handleProcessEmail = async () => {
    setProcessing(true);
    try {
      const response = await axios.post(
        `${API}/emails/${id}/process`,
        {},
        { withCredentials: true }
      );
      
      setEmail({
        ...email,
        category: response.data.category,
        action_items: response.data.action_items,
        draft_reply: response.data.draft_reply
      });
      
      toast.success('Email processed successfully!');
    } catch (err) {
      toast.error('Failed to process email. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

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
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
          <p className="mt-4 text-white text-lg">Loading email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <Button
              data-testid="back-button"
              variant="outline"
              onClick={() => navigate('/inbox')}
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inbox
            </Button>

            <Button
              data-testid="process-button"
              onClick={handleProcessEmail}
              disabled={processing}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Process with AI
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Email Content */}
        <div className="glass-card p-8 mb-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              {email.category && (
                <span className={`category-badge ${getCategoryColor(email.category)}`}>
                  {email.category}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{email.subject}</h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span><strong>{email.sender}</strong> &lt;{email.sender_email}&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDate(email.received_at)}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
          </div>
        </div>

        {/* AI Analysis */}
        {(email.action_items || email.draft_reply) && (
          <div className="space-y-4">
            {/* Action Items */}
            {email.action_items && email.action_items.length > 0 && (
              <Card className="p-6 bg-white rounded-2xl">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Action Items
                </h2>
                <div className="space-y-3">
                  {email.action_items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.task}</p>
                        {item.deadline && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Deadline:</strong> {item.deadline}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Draft Reply */}
            {email.draft_reply && (
              <Card className="p-6 bg-white rounded-2xl">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  Draft Reply
                </h2>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{email.draft_reply}</p>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This is a draft reply. Review and edit before sending.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Processing Prompt */}
        {!email.category && !processing && (
          <Card className="p-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl text-center">
            <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to analyze</h3>
            <p className="text-gray-600 mb-4">
              Click "Process with AI" to categorize this email, extract action items, and generate a draft reply.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailPage;