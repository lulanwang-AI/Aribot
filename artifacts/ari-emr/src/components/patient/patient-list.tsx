import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import type { Patient, ImagingStudy } from "@/shared/schema";

interface PatientListProps {
  patients: Patient[];
  studies: ImagingStudy[];
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
  onStudySelect: (study: ImagingStudy) => void;
}

export default function PatientList({
  patients,
  studies,
  selectedPatient,
  onPatientSelect,
  onStudySelect,
}: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCurrentStudyDescription = (patient: Patient) => {
    const patientStudies = studies.filter(study => study.patientId === patient.id);
    if (patientStudies.length > 0) {
      const study = patientStudies[0];
      return `${study.studyType} ${study.studyDate}`;
    }
    return "No studies available";
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Patient Management</CardTitle>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Patients"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Add New Patient Button */}
        <Button className="w-full bg-medical-blue hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Patient
        </Button>
      </CardHeader>
      
      {/* Patient List */}
      <CardContent>
        <div className="space-y-3">
          {filteredPatients.map((patient) => {
            const patientStudies = studies.filter(study => study.patientId === patient.id);
            return (
              <div
                key={patient.id}
                className={`p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
                  selectedPatient?.id === patient.id ? "bg-blue-50 border-blue-200" : ""
                }`}
                onClick={() => {
                  onPatientSelect(patient);
                  if (patientStudies.length > 0) {
                    onStudySelect(patientStudies[0]);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{patient.name}</h3>
                    <p className="text-sm text-slate-600">{getCurrentStudyDescription(patient)}</p>
                    <p className="text-xs text-slate-500">Patient ID: {patient.patientId}</p>
                  </div>
                  <Badge className={getStatusColor(patient.status)}>
                    {patient.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
