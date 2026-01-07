import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Sparkles, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface SuggestedAction {
    id: string;
    label: string;
    action: () => void;
}

interface ChatResponse {
    reply: string;
    suggestedActions?: string[];
    shouldEscalate?: boolean;
}

export default function FloatingAIChatbot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load conversation history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('ai-chat-history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setMessages(parsed.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                })));
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
    }, []);

    // Save conversation history
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('ai-chat-history', JSON.stringify(messages));
        }
    }, [messages]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    history: messages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data: ChatResponse = await response.json();

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.reply,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Handle suggested actions
            if (data.suggestedActions && data.suggestedActions.length > 0) {
                const actions: SuggestedAction[] = data.suggestedActions.map((action: string) => ({
                    id: action,
                    label: getActionLabel(action),
                    action: () => handleAction(action)
                }));
                setSuggestedActions(actions);
            } else {
                setSuggestedActions([]);
            }

        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, I\'m having trouble right now. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const getActionLabel = (action: string): string => {
        const labels: Record<string, string> = {
            'clear-cache': '🗑️ Clear Cache',
            'refresh-page': '🔄 Refresh',
            'check-connection': '📡 Check Connection',
            'logout': '🚪 Logout'
        };
        return labels[action] || action;
    };

    const handleAction = (action: string) => {
        switch (action) {
            case 'clear-cache':
                localStorage.clear();
                window.location.reload();
                break;
            case 'refresh-page':
                window.location.reload();
                break;
            case 'check-connection':
                window.open('https://www.google.com', '_blank');
                break;
            case 'logout':
                window.location.href = '/api/logout';
                break;
        }
    };

    const clearHistory = () => {
        setMessages([]);
        localStorage.removeItem('ai-chat-history');
        setSuggestedActions([]);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
                title="AI Assistant"
            >
                <div className="relative">
                    <MessageCircle className="h-6 w-6" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                </div>
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 h-96 flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-600/10 to-red-700/10 border-b border-border">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-400 animate-pulse" />
                    <h3 className="text-sm font-semibold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
                        AI Assistant
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
                {messages.length === 0 && (
                    <div className="text-center py-4 space-y-3">
                        <div className="text-3xl">👋</div>
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Hi{user ? ` ${user.username}` : ''}!</h4>
                            <p className="text-xs text-muted-foreground">
                                Ask me about movies, account, or playback issues.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 ${message.role === 'user'
                                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                                : 'bg-muted text-foreground'
                                }`}
                        >
                            <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                            <p className="text-[10px] opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin text-red-400" />
                            <span className="text-xs text-muted-foreground">Thinking...</span>
                        </div>
                    </div>
                )}

                {/* Suggested Actions */}
                {suggestedActions.length > 0 && !isLoading && (
                    <div className="flex flex-wrap gap-1.5">
                        {suggestedActions.map((action) => (
                            <button
                                key={action.id}
                                onClick={action.action}
                                className="px-2 py-1 text-[10px] rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex items-center gap-2"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me..."
                        disabled={isLoading}
                        className="flex-1 px-3 py-1.5 bg-muted rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-1.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
