import { DoctorDirectory } from "@/components/doctor-directory";
import { Stethoscope } from "lucide-react";

export default function Doctors() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4" data-testid="page-doctors">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-doctors-title">
          <Stethoscope className="h-5 w-5 text-primary" />
          Doctor Directory
        </h1>
        <p className="text-sm text-muted-foreground">Search and connect with verified clinicians</p>
      </div>
      <DoctorDirectory />
    </div>
  );
}
