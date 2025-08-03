import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, TestTube, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiConfig {
  endpoint: string;
  apiKey: string;
  identifier: string;
  system: string;
}

interface ApiConfigurationProps {
  config: ApiConfig;
  onConfigChange: (config: ApiConfig) => void;
}

const serviceSystems = [
  { value: "servicenow", label: "ServiceNow" },
  { value: "jira", label: "Jira Service Management" },
  { value: "zendesk", label: "Zendesk" },
  { value: "freshservice", label: "Freshservice" },
  { value: "custom", label: "easitGO" }
];

export function ApiConfiguration({ config, onConfigChange }: ApiConfigurationProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleInputChange = (field: keyof ApiConfig, value: string) => {
    onConfigChange({
      ...config,
      [field]: value
    });
  };

  const testConnection = async () => {
    if (!config.endpoint || !config.apiKey || !config.identifier) {
      toast({
        title: "Missing Information",
        description: "Please fill in endpoint URL, API key, and identifier before testing.",
        variant: "destructive"
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Simulate API test call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, randomly succeed or fail
      const success = Math.random() > 0.3;
      
      if (success) {
        setConnectionStatus('success');
        toast({
          title: "Connection Successful",
          description: "Successfully connected to your service management system.",
          variant: "default"
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: "Unable to connect. Please check your endpoint URL and API key.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Connection Error",
        description: "An error occurred while testing the connection.",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isConfigComplete = config.endpoint && config.apiKey && config.identifier && config.system;

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">API Configuration</CardTitle>
            <CardDescription>
              Configure your service management system connection
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system">Service Management System</Label>
            <Select value={config.system} onValueChange={(value) => handleInputChange('system', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your system" />
              </SelectTrigger>
              <SelectContent>
                {serviceSystems.map((system) => (
                  <SelectItem key={system.value} value={system.value}>
                    {system.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint URL</Label>
            <Input
              id="endpoint"
              type="url"
              placeholder="https://your-instance.service-now.com/api/now/table/incident"
              value={config.endpoint}
              onChange={(e) => handleInputChange('endpoint', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={config.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifier">Identifier</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Enter identifier (e.g., user ID, instance ID)"
              value={config.identifier}
              onChange={(e) => handleInputChange('identifier', e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={!isConfigComplete || isTestingConnection}
                className="gap-2"
              >
                <TestTube className="w-4 h-4" />
                {isTestingConnection ? "Testing..." : "Test Connection"}
              </Button>
              
              {connectionStatus === 'success' && (
                <Badge variant="default" className="gap-1 bg-success text-success-foreground">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </Badge>
              )}
              
              {connectionStatus === 'error' && (
                <Badge variant="destructive" className="gap-1">
                  Connection Failed
                </Badge>
              )}
            </div>
          </div>
          
          {!isConfigComplete && (
            <p className="text-sm text-muted-foreground mt-2">
              Complete the configuration above to test your connection.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}