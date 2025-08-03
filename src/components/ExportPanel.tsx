import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Send, FileText, Clock, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isUser?: boolean;
}

interface ExportPanelProps {
  selectedMessages: Message[];
}

// Azure Function endpoint through Static Web App
const getApiEndpoint = () => {
  // For Teams app, use the full URL to your Azure Static Web App
  return 'https://proud-hill-02d98db03.2.azurestaticapps.net/api/create-case';
};

export function ExportPanel({ selectedMessages }: ExportPanelProps) {
  console.log('ExportPanel rendering with messages:', selectedMessages.length);
  const [isExporting, setIsExporting] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [manager, setManager] = useState("");
  const [contact, setContact] = useState("");
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [showReturnedLink, setShowReturnedLink] = useState(false);
  const { toast } = useToast();

  // Auto-populate manager and contact from Teams message data
  useEffect(() => {
    if (selectedMessages.length > 0) {
      const message = selectedMessages[0];
      const contactName = (message as any).contactName;
      const contactEmail = (message as any).contactEmail;
      const managerName = (message as any).managerName;
      const managerEmail = (message as any).managerEmail;
      
      console.log('ExportPanel received data:', {
        contactName,
        contactEmail,
        managerName,
        managerEmail
      });
      
      // Manager = Person who clicked "Create case" (Christer) - use email, not name
      if (managerEmail) {
        setManager(managerEmail);
      } else if (managerName) {
        setManager(managerName); // fallback to name if no email
      }
      
      // Contact = Original message sender (Nicklas)
      if (contactEmail) {
        setContact(contactEmail);
      } else if (contactName && contactName !== 'Unknown User') {
        setContact(contactName);
      }
    }
  }, [selectedMessages]);

  const formatConversation = () => {
    if (selectedMessages.length === 0) return '';
    
    const content = selectedMessages[0].content;
    
    // Filter out Teams tag notification lines (containing &nbsp;)
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      
      // Remove lines that contain &nbsp; and match timestamp pattern (these are tag notifications)
      const hasTimestamp = /\[\w+.*?\d{2}-\d{2}\s+\d{2}:\d{2}\]/.test(trimmedLine);
      const hasNbsp = trimmedLine.includes('&nbsp;');
      
      // Keep line if it doesn't have both timestamp and &nbsp;, and isn't empty
      return trimmedLine.length > 0 && !(hasTimestamp && hasNbsp);
    });
    
    return filteredLines.join('\n').trim();
  };

  const generateTicketTitle = () => {
    if (selectedMessages.length > 0) {
      const firstMessage = selectedMessages[0];
      const preview = firstMessage.content.substring(0, 80);
      return preview.length < firstMessage.content.length ? preview + "..." : preview;
    }
    return "";
  };

  const exportToServiceDesk = async () => {
    if (selectedMessages.length === 0) {
      toast({
        title: "No Messages Selected",
        description: "Please select at least one message to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // Create the payload for your server
      const payload = {
        title: ticketTitle || generateTicketTitle(),
        description: formatConversation(),
        manager: manager,
        contact: contact,
        messages: selectedMessages
      };

      console.log('Sending payload to Azure Function:', JSON.stringify(payload, null, 2));

      // Call the Azure Function
      const apiEndpoint = getApiEndpoint();
      console.log('API Endpoint:', apiEndpoint);
      console.log('Making request to:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('Azure Function response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure Function error response:', errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Server response data:', data);
      
      // Store the response for display
      setLastResponse(data);
      
      // Extract useful information from the response
      let successMessage = "Ticket has been created in your service management system.";
      let caseUrl = null;
      
      // Check if response contains the service desk URL in the nested structure
      if (data.importItemResult && data.importItemResult[0] && 
          data.importItemResult[0].returnValues && 
          data.importItemResult[0].returnValues.returnValue) {
        
        const returnValues = data.importItemResult[0].returnValues.returnValue;
        const urlObject = returnValues.find((item: any) => item.name === "URL_Selfservice");
        
        if (urlObject && urlObject.content) {
          caseUrl = urlObject.content;
          successMessage += ` Case URL: ${urlObject.content}`;
        }
      } else if (data.URL_Selfservice) {
        // Fallback for direct URL_Selfservice field
        caseUrl = data.URL_Selfservice;
        successMessage += ` Case URL: ${data.URL_Selfservice}`;
      } else if (data.caseId || data.id || data.ticketId) {
        const caseId = data.caseId || data.id || data.ticketId;
        successMessage += ` Case ID: ${caseId}`;
      }
      
      toast({
        title: "Ticket Created Successfully! 🎉",
        description: caseUrl ? (
          <div className="space-y-2">
            <p>Ticket has been created in your service management system.</p>
            <a 
              href={caseUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline block"
            >
              View Created Case →
            </a>
          </div>
        ) : successMessage,
        variant: "default"
      });

      // Reset form
      setTicketTitle("");
      setManager("");
      setContact("");
      
    } catch (error) {
      console.error('API Error:', error);
      
      let errorTitle = "Export Failed";
      let errorDescription = "Unable to create ticket";
      
      if (error instanceof Error) {
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        
        if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
          errorTitle = "CORS/Network Error";
          errorDescription = `The browser blocked this request due to CORS policy. To fix this, you need to either:\n\n1. Use a backend/proxy server\n2. Ask the API provider to add your domain to their CORS whitelist\n3. Use a browser extension to disable CORS (temporary solution)`;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorTitle = "Network Connection Error";
          errorDescription = `Could not connect to the API server. Please check:\n\n1. The server is running\n2. Your internet connection\n3. The API endpoint is accessible\n\nError: ${error.message}`;
        } else {
          errorDescription = `${error.message}`;
        }
      } else {
        errorDescription = `Unknown error: ${String(error)}`;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = selectedMessages.length > 0 && !isExporting;

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <Send className="w-5 h-5 text-success" />
          </div>
          <div>
            <CardTitle className="text-lg">Export to Service Desk</CardTitle>
            <CardDescription>
              Create a ticket from the selected conversation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{selectedMessages.length}</div>
              <div className="text-muted-foreground">Messages</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{new Set(selectedMessages.map(m => m.sender)).size}</div>
              <div className="text-muted-foreground">Participants</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">easitGO</div>
              <div className="text-muted-foreground">Target System</div>
            </div>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-title">Ticket Title</Label>
            <Input
              id="ticket-title"
              placeholder={generateTicketTitle() || "Enter ticket title..."}
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manager">Manager (Handläggare)</Label>
              <Input
                id="manager"
                placeholder="Enter manager email..."
                value={manager}
                onChange={(e) => setManager(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact">Contact (Anmälare)</Label>
              <Input
                id="contact"
                placeholder="Enter contact email..."
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedMessages.length > 0 && (
          <div className="space-y-2">
            <Label>Message Preview</Label>
            <div className="max-h-32 overflow-y-auto p-3 bg-muted rounded-lg text-sm">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                {formatConversation()}
              </pre>
            </div>
          </div>
        )}

        {/* Return Link Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="show-returned-link" 
            checked={showReturnedLink}
            onCheckedChange={(checked) => setShowReturnedLink(checked as boolean)}
          />
          <Label htmlFor="show-returned-link" className="text-sm">
            Returnera länk till ärende
          </Label>
        </div>

        {/* API Response Display - Only show if checkbox is checked */}
        {showReturnedLink && lastResponse && (
          <div className="space-y-2">
            <Label>Last API Response</Label>
            <div className="max-h-40 overflow-y-auto p-3 bg-muted rounded-lg text-sm">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </div>
            {(() => {
              // Extract URL from nested structure
              let caseUrl = null;
              if (lastResponse.importItemResult && lastResponse.importItemResult[0] && 
                  lastResponse.importItemResult[0].returnValues && 
                  lastResponse.importItemResult[0].returnValues.returnValue) {
                
                const returnValues = lastResponse.importItemResult[0].returnValues.returnValue;
                const urlObject = returnValues.find((item: any) => item.name === "URL_Selfservice");
                
                if (urlObject && urlObject.content) {
                  caseUrl = urlObject.content;
                }
              } else if (lastResponse.URL_Selfservice) {
                caseUrl = lastResponse.URL_Selfservice;
              }
              
              return caseUrl ? (
                <a 
                  href={caseUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  🔗 Klicka här för att se ditt ärende
                </a>
              ) : null;
            })()}
          </div>
        )}

        {selectedMessages.length === 0 && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg">
            <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              Select one or more messages from the conversation to create a ticket.
            </div>
          </div>
        )}

        {/* Export Button */}
        <Button
          onClick={exportToServiceDesk}
          disabled={!canExport}
          className="w-full gap-2"
          size="lg"
        >
          <Send className="w-4 h-4" />
          {isExporting ? "Creating Ticket..." : "Create Service Desk Ticket"}
        </Button>
      </CardContent>
    </Card>
  );
}