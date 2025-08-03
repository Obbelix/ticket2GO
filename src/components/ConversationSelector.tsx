import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isUser?: boolean;
}

interface ConversationSelectorProps {
  onSelectionChange: (selectedMessages: Message[]) => void;
  selectedMessages: Message[];
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender: "Sarah Chen",
    avatar: "",
    content: "Hi team, I'm experiencing issues with the VPN connection. It keeps disconnecting every few minutes.",
    timestamp: "2:45 PM",
    isUser: false
  },
  {
    id: "2", 
    sender: "IT Support",
    avatar: "",
    content: "Thanks for reporting this, Sarah. Can you please tell me which VPN client you're using and when the issue started?",
    timestamp: "2:47 PM",
    isUser: true
  },
  {
    id: "3",
    sender: "Sarah Chen", 
    avatar: "",
    content: "I'm using the company VPN client v3.2.1 on Windows 11. The disconnections started this morning around 9 AM.",
    timestamp: "2:48 PM",
    isUser: false
  },
  {
    id: "4",
    sender: "IT Support",
    avatar: "",
    content: "I see. This might be related to the network maintenance we had last night. Let me check the server logs and create a ticket for this issue.",
    timestamp: "2:50 PM", 
    isUser: true
  },
  {
    id: "5",
    sender: "Sarah Chen",
    avatar: "",
    content: "Thanks! This is quite urgent as I have a client presentation at 4 PM and need stable internet access.",
    timestamp: "2:51 PM",
    isUser: false
  }
];

export function ConversationSelector({ onSelectionChange, selectedMessages }: ConversationSelectorProps) {
  console.log('ConversationSelector rendering');
  const [selectAll, setSelectAll] = useState(false);

  const handleMessageToggle = (message: Message, checked: boolean) => {
    let newSelection;
    if (checked) {
      newSelection = [...selectedMessages, message];
    } else {
      newSelection = selectedMessages.filter(m => m.id !== message.id);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange(mockMessages);
    } else {
      onSelectionChange([]);
    }
  };

  const isMessageSelected = (messageId: string) => {
    return selectedMessages.some(m => m.id === messageId);
  };

  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teams-purple-light rounded-full">
            <Users className="w-4 h-4 text-teams-purple" />
            <span className="text-sm font-medium text-teams-purple">IT Support Channel</span>
          </div>
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="w-3 h-3" />
            {mockMessages.length} messages
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={selectAll}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select All
          </label>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {mockMessages.map((message) => (
          <div 
            key={message.id}
            className={`flex items-start gap-3 p-4 rounded-lg transition-all duration-200 hover:bg-muted cursor-pointer ${
              isMessageSelected(message.id) ? 'bg-accent border-2 border-primary' : 'border border-border'
            }`}
            onClick={() => handleMessageToggle(message, !isMessageSelected(message.id))}
          >
            <Checkbox
              checked={isMessageSelected(message.id)}
              onCheckedChange={(checked) => handleMessageToggle(message, checked as boolean)}
              onClick={(e) => e.stopPropagation()}
            />
            
            <Avatar className="w-8 h-8 mt-0.5">
              <AvatarImage src={message.avatar} alt={message.sender} />
              <AvatarFallback className={message.isUser ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                {message.sender.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{message.sender}</span>
                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedMessages.length > 0 && (
        <div className="mt-6 p-4 bg-accent rounded-lg border">
          <p className="text-sm text-accent-foreground">
            <span className="font-medium">{selectedMessages.length}</span> message(s) selected for export
          </p>
        </div>
      )}
    </Card>
  );
}