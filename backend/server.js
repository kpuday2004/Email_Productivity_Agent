const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Console } = require('console');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;

// Load mock data
const mockData = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock_data.json'), 'utf-8'));

// In-memory storage
const processedEmails = {};
const chatMessages = {};
const sessions = {};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Auth middleware
const authenticateUser = (req, res, next) => {
    let sessionToken = req.cookies.session_token;
    
    if (!sessionToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            sessionToken = authHeader.replace('Bearer ', '');
        }
    }
    
    if (!sessionToken || !sessions[sessionToken]) {
        return res.status(401).json({ detail: 'Not authenticated' });
    }
    
    const userId = sessions[sessionToken];
    const user = mockData.users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(401).json({ detail: 'User not found' });
    }
    
    req.user = {
        id: user.id,
        email: user.email,
        name: user.name
    };
    
    next();
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = mockData.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ detail: 'Invalid credentials' });
    }
    
    const sessionToken = require('crypto').randomUUID();
    sessions[sessionToken] = user.id;
    
    res.cookie('session_token', sessionToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
    
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        },
        session_token: sessionToken
    });
});

app.get('/api/auth/me', authenticateUser, (req, res) => {
    res.json(req.user);
});

app.post('/api/auth/logout', (req, res) => {
    const sessionToken = req.cookies.session_token;
    if (sessionToken && sessions[sessionToken]) {
        delete sessions[sessionToken];
    }
    
    res.clearCookie('session_token', {
        path: '/',
        sameSite: 'lax',
        secure: false
    });
    
    res.json({ message: 'Logged out' });
});

// Email routes
app.get('/api/emails', authenticateUser, (req, res) => {
    const { category } = req.query;
    
    let emails = mockData.emails.filter(e => e.user_id === req.user.id);
    
    // Merge with processed emails
    emails = emails.map(email => {
        if (processedEmails[email.id]) {
            return { ...email, ...processedEmails[email.id] };
        }
        return email;
    });
    
    if (category && category !== 'all') {
        emails = emails.filter(e => e.category === category);
    }
    
    // Sort by received_at descending
    emails.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
    
    res.json(emails);
});

app.get('/api/emails/:emailId', authenticateUser, (req, res) => {
    const { emailId } = req.params;
    
    let email = mockData.emails.find(e => e.id === emailId && e.user_id === req.user.id);
    
    if (!email) {
        return res.status(404).json({ detail: 'Email not found' });
    }
    
    // Merge with processed data
    if (processedEmails[emailId]) {
        email = { ...email, ...processedEmails[emailId] };
    }
    
    res.json(email);
});

app.patch('/api/emails/:emailId/read', authenticateUser, (req, res) => {
    const { emailId } = req.params;
    
    const email = mockData.emails.find(e => e.id === emailId && e.user_id === req.user.id);
    
    if (!email) {
        return res.status(404).json({ detail: 'Email not found' });
    }
    
    if (!processedEmails[emailId]) {
        processedEmails[emailId] = {};
    }
    processedEmails[emailId].is_read = true;
    
    res.json({ message: 'Email marked as read' });
});

app.post('/api/emails/:emailId/process', authenticateUser, async (req, res) => {
    const { emailId } = req.params;
    
    const email = mockData.emails.find(e => e.id === emailId && e.user_id === req.user.id);
    
    if (!email) {
        return res.status(404).json({ detail: 'Email not found' });
    }
    
    // Get prompts
    const prompts = mockData.prompts.filter(p => p.user_id === req.user.id);
    const promptMap = {};
    prompts.forEach(p => {
        promptMap[p.prompt_type] = p.content;
    });
    
    const emailText = `From: ${email.sender} <${email.sender_email}>\nSubject: ${email.subject}\n\n${email.body}`;
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        // Categorization
        const catPrompt = `${promptMap.categorization || 'Categorize this email'}\n\n${emailText}`;
        const catResult = await model.generateContent(catPrompt);
        const category = catResult.response.text().trim();
        // Action extraction
        const actionPrompt = `${promptMap.action_extraction || 'Extract action items'}\n\n${emailText}`;
        const actionResult = await model.generateContent(actionPrompt);
        const actionText = actionResult.response.text().trim();
        let actionItems = [];
        try {
            const jsonMatch = actionText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                actionItems = parsed.tasks || [];
            }
        } catch (e) {
            console.error('Failed to parse action items:', e);
        }
        // Auto-reply
        const replyPrompt = `${promptMap.auto_reply || 'Draft a reply'}\n\n${emailText}`;
        const replyResult = await model.generateContent(replyPrompt);
        const draftReply = replyResult.response.text().trim();
        // Store processed data
        processedEmails[emailId] = {
            category,
            action_items: actionItems,
            draft_reply: draftReply
        };
        res.json({
            category,
            action_items: actionItems,
            draft_reply: draftReply
        });
    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ detail: `Processing failed: ${error.message}` });
    }
});

// Prompt routes
app.get('/api/prompts', authenticateUser, (req, res) => {
    const prompts = mockData.prompts.filter(p => p.user_id === req.user.id);
    res.json(prompts);
});

app.put('/api/prompts/:promptId', authenticateUser, (req, res) => {
    const { promptId } = req.params;
    const { name, content } = req.body;
    
    const prompt = mockData.prompts.find(p => p.id === promptId && p.user_id === req.user.id);
    
    if (!prompt) {
        return res.status(404).json({ detail: 'Prompt not found' });
    }
    
    if (name) prompt.name = name;
    if (content) prompt.content = content;
    
    res.json({ message: 'Prompt updated' });
});

// Chat routes
app.post('/api/chat', authenticateUser, async (req, res) => {
    const { message } = req.body;
    
    // Get email context
    const emails = mockData.emails.filter(e => e.user_id === req.user.id);
    const unread = emails.filter(e => !e.is_read).length;
    
    const categories = {};
    emails.forEach(e => {
        const cat = processedEmails[e.id]?.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const emailSummary = `User has ${emails.length} emails. ${unread} unread. Categories: ${JSON.stringify(categories)}`;
    const systemMessage = `You are an intelligent email assistant. ${emailSummary}. Help the user manage their inbox, answer questions about emails, and provide insights.`;
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        // Build chat history
        const history = [];
        if (chatMessages[req.user.id]) {
            chatMessages[req.user.id].forEach(msg => {
                history.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });
        }
        
        const chat = model.startChat({
            history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });
        
        const result = await chat.sendMessage(`${systemMessage}\n\nUser: ${message}`);
        const response = result.response.text();
        
        // Save messages
        if (!chatMessages[req.user.id]) {
            chatMessages[req.user.id] = [];
        }
        
        chatMessages[req.user.id].push({ role: 'user', content: message });
        chatMessages[req.user.id].push({ role: 'assistant', content: response });
        
        res.json({ response });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ detail: `Chat failed: ${error.message}` });
    }
});

app.get('/api/chat/history', authenticateUser, (req, res) => {
    res.json(chatMessages[req.user.id] || []);
});

// Health check
app.get('/api/', (req, res) => {
    res.json({ message: 'Email Brain API - Express.js + Gemini AI' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
