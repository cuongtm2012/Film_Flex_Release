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

interface Position {
    x: number;
    y: number;
}

export default function FloatingAIChatbot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Draggable state
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
    const [hasMoved, setHasMoved] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Chat window positioning
    const [chatWindowPosition, setChatWindowPosition] = useState<{
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
    }>({});

    // Calculate chat window position based on FAB position
    const calculateChatWindowPosition = () => {
        const buttonSize = 56;
        const chatHeight = 384; // 96 * 4 = 384px (h-96)
        const margin = 16;

        const buttonCenterX = position.x + buttonSize / 2;
        const isOnRightSide = buttonCenterX > window.innerWidth / 2;

        let newPosition: typeof chatWindowPosition = {};

        // Horizontal positioning
        if (isOnRightSide) {
            // FAB on right side → Chat window expands to the LEFT
            const rightEdge = window.innerWidth - position.x - buttonSize;
            newPosition.right = rightEdge;
            newPosition.left = undefined;
        } else {
            // FAB on left side → Chat window expands to the RIGHT
            newPosition.left = position.x;
            newPosition.right = undefined;
        }

        // Vertical positioning
        const spaceBelow = window.innerHeight - position.y;
        const spaceAbove = position.y + buttonSize;

        if (spaceBelow >= chatHeight + margin) {
            // Enough space below → align top with button
            newPosition.top = position.y;
            newPosition.bottom = undefined;
        } else if (spaceAbove >= chatHeight + margin) {
            // Not enough space below, but enough above → align bottom with button bottom
            newPosition.bottom = window.innerHeight - position.y - buttonSize;
            newPosition.top = undefined;
        } else {
            // Not enough space either way → center vertically with constraints
            const centeredTop = Math.max(margin, Math.min(
                position.y - (chatHeight - buttonSize) / 2,
                window.innerHeight - chatHeight - margin
            ));
            newPosition.top = centeredTop;
            newPosition.bottom = undefined;
        }

        setChatWindowPosition(newPosition);
    };

    // Recalculate position when opening chat or when FAB position changes
    useEffect(() => {
        if (isOpen) {
            calculateChatWindowPosition();
        }
    }, [isOpen, position]);

    // Recalculate on window resize
    useEffect(() => {
        const handleResize = () => {
            if (isOpen) {
                calculateChatWindowPosition();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, position]);

    // Load saved position from localStorage
    useEffect(() => {
        const savedPosition = localStorage.getItem('ai-chat-button-position');
        if (savedPosition) {
            try {
                const parsed = JSON.parse(savedPosition);
                setPosition(parsed);
            } catch (e) {
                // Use default position (bottom-right)
                setDefaultPosition();
            }
        } else {
            setDefaultPosition();
        }
    }, []);

    const setDefaultPosition = () => {
        // Mobile detection
        const isMobile = window.innerWidth < 768;
        const buttonSize = 56;

        // Mobile: Account for bottom navigation (typically 64-80px height)
        // Desktop: Standard bottom-right position
        const bottomOffset = isMobile ? 96 : 16; // 80px nav + 16px margin for mobile
        const rightOffset = 16;

        setPosition({
            x: window.innerWidth - buttonSize - rightOffset,
            y: window.innerHeight - buttonSize - bottomOffset
        });
    };

    // Adjust position on orientation change (mobile)
    useEffect(() => {
        const handleOrientationChange = () => {
            // Recalculate default position on orientation change
            const savedPosition = localStorage.getItem('ai-chat-button-position');
            if (!savedPosition) {
                setDefaultPosition();
            }
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        return () => window.removeEventListener('orientationchange', handleOrientationChange);
    }, []);

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

    // Handle dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setHasMoved(false);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setHasMoved(false);
        setDragStart({
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;

            // Check if moved more than 5px (threshold to distinguish click vs drag)
            if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
                setHasMoved(true);
            }

            // Constrain to viewport
            const buttonSize = 56; // 14 * 4 = 56px
            const maxX = window.innerWidth - buttonSize;
            const maxY = window.innerHeight - buttonSize;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;

            const touch = e.touches[0];
            const newX = touch.clientX - dragStart.x;
            const newY = touch.clientY - dragStart.y;

            if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
                setHasMoved(true);
            }

            const buttonSize = 56;
            const maxX = window.innerWidth - buttonSize;
            const maxY = window.innerHeight - buttonSize;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);

                // Snap to nearest edge (left or right)
                if (hasMoved) {
                    const buttonSize = 56;
                    const centerX = position.x + buttonSize / 2;
                    const snapToRight = centerX > window.innerWidth / 2;

                    const newPosition = {
                        x: snapToRight ? window.innerWidth - buttonSize - 16 : 16,
                        y: Math.max(16, Math.min(position.y, window.innerHeight - buttonSize - 16))
                    };

                    setPosition(newPosition);
                    localStorage.setItem('ai-chat-button-position', JSON.stringify(newPosition));
                }
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, dragStart, position, hasMoved]);

    const handleButtonClick = () => {
        // Only open chat if not dragging
        if (!hasMoved) {
            setIsOpen(true);
        }
    };

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
                    conversationHistory: messages.slice(-10).map(m => ({
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
                content: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const getActionLabel = (action: string): string => {
        const labels: Record<string, string> = {
            'clear-cache': '🗑️ Xóa Cache',
            'refresh-page': '🔄 Tải lại',
            'check-connection': '📡 Kiểm tra kết nối',
            'logout': '🚪 Đăng xuất'
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
                ref={buttonRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onClick={handleButtonClick}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out, transform 0.2s',
                    WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
                }}
                className="fixed z-[10000] w-14 h-14 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-110 flex items-center justify-center touch-none select-none"
                title="AI Assistant - Kéo để di chuyển"
                aria-label="Open AI Chat Assistant"
            >
                <div className="relative pointer-events-none">
                    <MessageCircle className="h-6 w-6" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                </div>
            </button>
        );
    }

    return (
        <div
            className="fixed z-[10000] w-80 max-w-[90vw] h-96 max-h-[calc(100vh-120px)] sm:max-h-[80vh] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{
                left: chatWindowPosition.left !== undefined ? `${chatWindowPosition.left}px` : 'auto',
                right: chatWindowPosition.right !== undefined ? `${chatWindowPosition.right}px` : 'auto',
                top: chatWindowPosition.top !== undefined ? `${chatWindowPosition.top}px` : 'auto',
                bottom: chatWindowPosition.bottom !== undefined ? `${chatWindowPosition.bottom}px` : 'auto',
            }}
        >
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
                            Xóa
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
                            <h4 className="font-semibold text-sm mb-1">Xin chào{user ? ` ${user.username}` : ''}!</h4>
                            <p className="text-xs text-muted-foreground">
                                Hỏi tôi về phim, tài khoản hoặc vấn đề phát video.
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
                            <span className="text-xs text-muted-foreground">Đang suy nghĩ...</span>
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
                        placeholder="Hỏi tôi..."
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
