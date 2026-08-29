import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Database, Download, Trash2, FileText } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* AI Module Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI Module Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Brain CT Triage</h4>
                <p className="text-sm text-slate-600">Enable automatic hemorrhage detection</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Lung Analysis</h4>
                <p className="text-sm text-slate-600">Enable nodule and pneumothorax detection</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Stroke Detection</h4>
                <p className="text-sm text-slate-600">Enable LVO and time-sensitive alerts</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
        
        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-medical-blue hover:bg-blue-700">
              <Database className="w-4 h-4 mr-2" />
              Import Mock Data
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export Patient Data
            </Button>
            <Button variant="outline" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
          </CardContent>
        </Card>
        
        {/* Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pacs-url">PACS Server URL</Label>
              <Input 
                id="pacs-url"
                placeholder="https://pacs.hospital.com" 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fhir-endpoint">FHIR Endpoint</Label>
              <Input 
                id="fhir-endpoint"
                placeholder="https://fhir.hospital.com/R4" 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="api-key">AI Service API Key</Label>
              <Input 
                id="api-key"
                type="password" 
                placeholder="Enter API key" 
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Security & Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Security & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">HIPAA Audit Logging</h4>
                <p className="text-sm text-slate-600">Track all data access and modifications</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Data Encryption at Rest</h4>
                <p className="text-sm text-slate-600">Encrypt patient data in database</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Generate Audit Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
