import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ViewerLayout from "@/components/imaging/viewer-layout";
import type { Patient, ImagingStudy } from "@/shared/schema";

export default function PatientDetail() {
  const [, params1] = useRoute("/patients/:id");
  const [, params2] = useRoute("/patient/:id");
  const patientId = params1?.id || params2?.id;
  const [, setLocation] = useLocation();

  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
    enabled: !!patientId,
  });

  const { data: studies = [] } = useQuery<ImagingStudy[]>({
    queryKey: ["/api/patients", patientId, "studies"],
    enabled: !!patientId,
  });

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const handleBack = () => {
    setLocation("/workspace");
  };

  // Use the ViewerLayout component for the full PostDICOM-style viewer
  return <ViewerLayout patient={patient} studies={studies} onBack={handleBack} />;
}
