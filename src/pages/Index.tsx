import { useState } from "react";
import { ConversationSelector } from "@/components/ConversationSelector";
import { ExportPanel } from "@/components/ExportPanel";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  sender: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isUser?: boolean;
}

const Index = () => {
  console.log('=== INDEX COMPONENT LOADED ===');
  
  return (
    <div style={{background: 'red', color: 'white', padding: '20px', minHeight: '100vh'}}>
      <h1 style={{fontSize: '24px'}}>DEBUG: REACT IS WORKING!</h1>
      <p>If you see this red page, React is rendering correctly.</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
};

export default Index;
