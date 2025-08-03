import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { app } from "@microsoft/teams-js";
import { ExportPanel } from "@/components/ExportPanel";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Message {
  id: string;
  sender: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isUser?: boolean;
}

const CreateCase = () => {
  console.log("🚀 CreateCase.tsx loaded");
  
  const [searchParams] = useSearchParams();
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);

  // Debug the rendering
  console.log('CreateCase component is rendering');
  console.log('Current URL:', window.location.href);
  console.log('Search params object:', Object.fromEntries(searchParams.entries()));

  useEffect(() => {
    // Initialize Teams SDK first
    const initializeTeams = async () => {
      try {
        console.log("✅ Starting Teams SDK initialization");
        await app.initialize();
        console.log("✅ Teams SDK initialized successfully");
      } catch (error) {
        console.error("❌ Teams SDK initialization failed:", error);
        // Continue anyway for testing
      }
    };
    
    initializeTeams();

    // Extract message data from Teams context
    const messageText = searchParams.get('text') || searchParams.get('messageText') || '';
    const messageId = searchParams.get('messageId') || 'default-id';
    const contactName = searchParams.get('contactName') || searchParams.get('senderName') || 'Teams User';
    const contactEmail = searchParams.get('contactEmail') || searchParams.get('senderEmail') || '';
    const managerName = searchParams.get('managerName') || '';
    const managerEmail = searchParams.get('managerEmail') || '';
    const conversationId = searchParams.get('conversationId') || '';
    const timestamp = searchParams.get('timestamp') || new Date().toISOString();

    console.log('CreateCase extracted params:', {
      messageText,
      messageId,
      contactName,
      contactEmail,
      managerName,
      managerEmail,
      conversationId
    });

    // Always create a message to show something on the page
    const message: Message = {
      id: messageId,
      sender: contactName,
      content: messageText || 'Welcome to the case creation page. This will be populated with message data from Teams.',
      timestamp: timestamp,
      isUser: false
    };
    
    setSelectedMessages([message]);
    
    // Store additional data for the ExportPanel to use
    (message as any).contactName = contactName;
    (message as any).contactEmail = contactEmail;
    (message as any).managerName = managerName;
    (message as any).managerEmail = managerEmail;
    (message as any).conversationId = conversationId;
  }, [searchParams]);

  // Add a simple fallback to see if component renders at all
  console.log('About to render CreateCase JSX');
  
  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: 'white', padding: '20px' }}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create Service Desk Case</h1>
              <p className="text-muted-foreground">Create a case from Teams conversation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Export Panel */}
          <div>
            <ExportPanel
              selectedMessages={selectedMessages}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCase;