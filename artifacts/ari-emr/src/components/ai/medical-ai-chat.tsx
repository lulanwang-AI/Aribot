import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import ariLogo from '@assets/aribot-mark-primary-1024_1785138240677.png';
import {
  Send,
  Bot,
  User,
  Upload,
  Paperclip,
  Brain,
  FileImage,
  Activity,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Settings,
  History,
  Download,
  Share2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'dicom' | 'report';
    name: string;
    url?: string;
  }[];
  analysis?: {
    findings: string[];
    recommendations: string[];
    urgency: 'routine' | 'urgent' | 'critical';
    confidence: number;
  };
  suggestedActions?: string[];
}

interface MedicalAIChatProps {
  patientId?: string;
  studyId?: string;
  initialContext?: string;
  embedded?: boolean;
  onActionClick?: (action: string) => void;
}

export default function MedicalAIChat({
  patientId,
  studyId,
  initialContext,
  embedded = false,
  onActionClick
}: MedicalAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm Ari, your clinical AI assistant. I can help you:
      
• Analyze DICOM images and identify abnormalities
• Provide differential diagnoses based on imaging findings
• Compare current studies with prior imaging
• Generate comprehensive radiology reports
• Answer questions about protocols and procedures
• Assist with clinical decision-making

How can I help you today?`,
      timestamp: new Date(),
      suggestedActions: [
        'Analyze current study',
        'Compare with prior',
        'Generate report',
        'Upload new image'
      ]
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!embedded);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load patient context if provided
  const { data: patient } = useQuery<any>({
    queryKey: [`/api/patients/${patientId}`],
    enabled: !!patientId
  });

  // Load study context if provided
  const { data: study } = useQuery({
    queryKey: [`/api/studies/${studyId}`],
    enabled: !!studyId
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      message: string;
      attachments?: any;
    }) => {
      const res = await apiRequest('POST', '/api/ai/chat', {
        sessionId,
        message: params.message,
        attachments: params.attachments,
        patientId,
        studyId
      });
      return res.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        analysis: data.analysis,
        suggestedActions: data.suggestedActions
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
      setIsTyping(false);
    }
  });

  // Handle sending message
  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: selectedFile ? [{
        type: 'image',
        name: selectedFile.name
      }] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Prepare attachments if file is selected
    let attachments;
    if (selectedFile) {
      const base64 = await fileToBase64(selectedFile);
      attachments = {
        imageData: base64,
        fileName: selectedFile.name
      };
      setSelectedFile(null);
    }

    // Send message
    sendMessageMutation.mutate({
      message: userMessage.content,
      attachments
    });
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: 'File attached',
        description: `${file.name} ready to send with your message`
      });
    }
  };

  // Handle suggested action click
  const handleActionClick = (action: string) => {
    if (onActionClick) {
      onActionClick(action);
    } else {
      setInput(action);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize with context
  useEffect(() => {
    if (initialContext && messages.length === 1) {
      handleSend();
    }
  }, [initialContext]);

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center p-1">
              <img src={ariLogo} alt="Ari" className="w-full h-full object-contain" />
            </div>
          </div>
        )}
        
        <div className={`max-w-[70%] ${isUser ? 'text-right' : ''}`}>
          <div
            className={`rounded-lg p-3 ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {message.attachments.map((attachment, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <FileImage className="h-4 w-4" />
                    <span>{attachment.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {message.analysis && (
            <Card className="mt-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">AI Analysis</CardTitle>
                  <Badge
                    variant={
                      message.analysis.urgency === 'critical' ? 'destructive' :
                      message.analysis.urgency === 'urgent' ? 'default' : 'secondary'
                    }
                  >
                    {message.analysis.urgency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {message.analysis.findings.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium mb-1">Findings:</p>
                    <ul className="text-xs space-y-1">
                      {message.analysis.findings.slice(0, 3).map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <Activity className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Brain className="h-3 w-3" />
                  <span>Confidence: {(message.analysis.confidence * 100).toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {message.suggestedActions && message.suggestedActions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.suggestedActions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  onClick={() => handleActionClick(action)}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {action}
                </Button>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </p>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center p-1.5">
              <img src={ariLogo} alt="Ari" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-semibold">Ari — Clinical AI</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Online</span>
                </div>
                {patient && (
                  <>
                    <span>•</span>
                    <span>Patient: {patient.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost">
              <History className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
            {embedded && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.map(renderMessage)}
        
        {isTyping && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center p-1">
              <img src={ariLogo} alt="Ari" className="w-full h-full object-contain" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Ari is analyzing...</span>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        {selectedFile && (
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileImage className="h-4 w-4 text-blue-600" />
              <span className="text-sm">{selectedFile.name}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.dcm"
            className="hidden"
          />
          
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about medical images, diagnoses, or patient data..."
            className="flex-1"
          />
          
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedFile) || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Stethoscope className="h-3 w-3" />
            <span>HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            <span>Ari · multimodal clinical AI</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded && !isExpanded) {
    return (
      <div
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-white border shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-50 p-2"
        onClick={() => setIsExpanded(true)}
      >
        <img src={ariLogo} alt="Ari" className="w-full h-full object-contain" />
        {messages.length > 1 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  if (embedded) {
    return (
      <Card className="fixed bottom-4 right-4 w-[400px] h-[600px] shadow-2xl z-50">
        {chatContent}
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-8rem)]">
      {chatContent}
    </Card>
  );
}