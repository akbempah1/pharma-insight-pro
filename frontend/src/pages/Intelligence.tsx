import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Grid,
  Badge,
  Flex,
} from '@tremor/react';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import {
  askAI,
  diagnoseData,
  getSuggestedQuestions,
  getPreliminaryAnalysis,
  PreliminaryAnalysis,
} from '../api';
import { formatCurrency, formatNumber } from '../utils';

interface IntelligenceProps {
  sessionId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Intelligence({ sessionId }: IntelligenceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preliminary, setPreliminary] = useState<PreliminaryAnalysis | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<{ name: string; questions: string[] }[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load preliminary analysis
    const loadPreliminary = async () => {
      try {
        const data = await getPreliminaryAnalysis(sessionId);
        setPreliminary(data);
      } catch (error) {
        console.error('Failed to load preliminary analysis:', error);
      }
    };

    // Load suggested questions
    const loadSuggestions = async () => {
      try {
        const data = await getSuggestedQuestions();
        setSuggestedQuestions(data.categories);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadPreliminary();
    loadSuggestions();
  }, [sessionId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (question?: string) => {
    const q = question || input;
    if (!q.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await askAI(sessionId, q);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: error.response?.data?.detail || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnose = async () => {
    setLoading(true);
    const userMessage: Message = {
      role: 'user',
      content: '🔍 Run a full diagnosis of my pharmacy data',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await diagnoseData(sessionId);
      
      let content = '';
      if ('answer' in response) {
        content = response.answer;
      } else {
        // Format preliminary analysis
        content = `## Preliminary Analysis

**Summary:**
- Total Revenue: ${formatCurrency(response.summary.totalRevenue)}
- Transactions: ${formatNumber(response.summary.totalTransactions)}
- Products: ${response.summary.uniqueProducts}
- Recent Growth: ${response.summary.recentGrowth.toFixed(1)}%
- Trend: ${response.summary.overallTrend}

**Issues Identified:**
${response.issues.length > 0 ? response.issues.map((i: string) => `⚠️ ${i}`).join('\n') : '✅ No critical issues found'}

**Recommendations:**
${response.recommendations.map((r: string) => `💡 ${r}`).join('\n')}`;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: error.response?.data?.detail || 'Failed to run diagnosis.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto"></div>
          <Text className="mt-4">Loading AI Intelligence...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SparklesIcon className="w-7 h-7 text-teal-600" />
          AI Intelligence
        </h1>
        <p className="text-gray-500 mt-1">Ask questions about your pharmacy data and get AI-powered insights</p>
      </div>

      {/* Preliminary Analysis Summary */}
      {preliminary && messages.length === 0 && (
        <Card>
          <Title>📊 Quick Overview</Title>
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mt-4">
            <div className="p-3 bg-teal-50 rounded-lg">
              <Text className="text-teal-700 text-sm">Revenue</Text>
              <Text className="text-teal-900 font-semibold text-lg">
                {formatCurrency(preliminary.summary.totalRevenue)}
              </Text>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Text className="text-blue-700 text-sm">Trend</Text>
              <Text className="text-blue-900 font-semibold text-lg capitalize">
                {preliminary.summary.overallTrend} ({preliminary.summary.recentGrowth >= 0 ? '+' : ''}{preliminary.summary.recentGrowth.toFixed(1)}%)
              </Text>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Text className="text-purple-700 text-sm">ABC Class A</Text>
              <Text className="text-purple-900 font-semibold text-lg">
                {preliminary.abcSummary.classA} products
              </Text>
            </div>
            <div className={`p-3 rounded-lg ${preliminary.deadStockCount > 20 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <Text className={preliminary.deadStockCount > 20 ? 'text-red-700' : 'text-emerald-700'} >
                Dead Stock
              </Text>
              <Text className={`font-semibold text-lg ${preliminary.deadStockCount > 20 ? 'text-red-900' : 'text-emerald-900'}`}>
                {preliminary.deadStockCount} items
              </Text>
            </div>
          </Grid>

          {/* Issues & Recommendations */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text className="font-semibold text-gray-700 mb-2">⚠️ Issues Identified</Text>
              {preliminary.issues.length > 0 ? (
                <div className="space-y-2">
                  {preliminary.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <Text className="text-amber-800 text-sm">{issue}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  <Text className="text-emerald-800 text-sm">No critical issues found!</Text>
                </div>
              )}
            </div>
            <div>
              <Text className="font-semibold text-gray-700 mb-2">💡 Recommendations</Text>
              <div className="space-y-2">
                {preliminary.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <LightBulbIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <Text className="text-blue-800 text-sm">{rec}</Text>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={handleDiagnose} icon={SparklesIcon} className="bg-gradient-to-r from-teal-600 to-blue-600">
              Run Full AI Diagnosis
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleSubmit("What are my top 10 selling products and why are they performing well?")}
            >
              Top Products Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="min-h-[500px] flex flex-col">
        <Title className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5 text-teal-600" />
          Chat with PharmaInsight AI
        </Title>
        <Text className="text-gray-500">Powered by Claude - Ask anything about your pharmacy data</Text>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-4 max-h-[400px] min-h-[300px]">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <SparklesIcon className="w-16 h-16 text-teal-200 mx-auto mb-4" />
              <Text className="text-gray-600 font-medium text-lg">
                Ask me anything about your pharmacy!
              </Text>
              <Text className="text-gray-400 mt-2">
                Example: "What should I reorder this week?" or "Which products are losing money?"
              </Text>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-teal-200' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-teal-600 animate-pulse" />
                  <span className="text-gray-600 text-sm">Analyzing your data...</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <TextInput
            placeholder="Ask a question about your pharmacy data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            disabled={loading}
            className="flex-1"
          />
          <Button
            icon={PaperAirplaneIcon}
            onClick={() => handleSubmit()}
            disabled={loading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Send
          </Button>
        </div>
      </Card>

      {/* Suggested Questions */}
      <Card>
        <Title>💬 Suggested Questions</Title>
        <Text className="text-gray-500">Click any question to ask the AI</Text>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestedQuestions.map((category) => (
            <div key={category.name} className="space-y-2">
              <Badge color="teal" size="lg">{category.name}</Badge>
              <div className="space-y-1">
                {category.questions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(question)}
                    disabled={loading}
                    className="w-full text-left p-3 text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors disabled:opacity-50 border border-transparent hover:border-teal-200"
                  >
                    → {question}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
