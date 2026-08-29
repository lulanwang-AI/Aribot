import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AIModule {
  id: string;
  name: string;
  description: string;
  provider: string;
  icon: string;
  color: string;
}

interface AIModuleCardProps {
  module: AIModule;
  onRunAnalysis: (moduleId: string, moduleName: string) => void;
}

export default function AIModuleCard({ module, onRunAnalysis }: AIModuleCardProps) {
  const [isRunning, setIsRunning] = useState(false);

  const getIconBgColor = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-100";
      case "green":
        return "bg-green-100";
      case "red":
        return "bg-red-100";
      case "purple":
        return "bg-purple-100";
      case "orange":
        return "bg-orange-100";
      case "amber":
        return "bg-amber-100";
      default:
        return "bg-gray-100";
    }
  };

  const getButtonColor = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-medical-blue hover:bg-blue-700";
      case "green":
        return "bg-medical-green hover:bg-green-700";
      case "red":
        return "bg-medical-red hover:bg-red-700";
      case "purple":
        return "bg-purple-600 hover:bg-purple-700";
      case "orange":
        return "bg-orange-600 hover:bg-orange-700";
      case "amber":
        return "bg-amber-600 hover:bg-amber-700";
      default:
        return "bg-gray-600 hover:bg-gray-700";
    }
  };

  const handleRunAnalysis = () => {
    setIsRunning(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setIsRunning(false);
      onRunAnalysis(module.id, module.name);
    }, 3000);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <div className={`w-12 h-12 ${getIconBgColor(module.color)} rounded-lg flex items-center justify-center mr-4`}>
            <span className="text-xl">{module.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{module.name}</h3>
            <p className="text-sm text-slate-500">{module.provider}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4">{module.description}</p>
        <Button 
          className={`w-full text-white ${getButtonColor(module.color)}`}
          onClick={handleRunAnalysis}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Analysis...
            </>
          ) : (
            "Run on Current Patient"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
