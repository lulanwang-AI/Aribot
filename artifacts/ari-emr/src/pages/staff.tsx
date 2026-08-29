import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  Clock,
  Award,
  Briefcase,
  Star,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  MapPin,
  GraduationCap,
  Shield
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  specialization?: string;
  status: "on-duty" | "off-duty" | "on-leave" | "on-call";
  shift: string;
  experience: number;
  rating: number;
  patients: number;
  email: string;
  phone: string;
  certifications: string[];
  avatar?: string;
}

export default function Staff() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  // Mock staff data
  const staffMembers: StaffMember[] = [
    {
      id: "staff-001",
      name: "Dr. Sarah Johnson",
      role: "Chief Radiologist",
      department: "Radiology",
      specialization: "Neuroradiology",
      status: "on-duty",
      shift: "Day Shift (8:00 AM - 6:00 PM)",
      experience: 15,
      rating: 4.9,
      patients: 1247,
      email: "sarah.johnson@synaptiflow.com",
      phone: "555-0101",
      certifications: ["Board Certified", "FRCR", "CAQ Neuroradiology"],
      avatar: "/api/placeholder/150/150"
    },
    {
      id: "staff-002",
      name: "Dr. Michael Chen",
      role: "Senior Cardiologist",
      department: "Cardiology",
      specialization: "Interventional Cardiology",
      status: "on-duty",
      shift: "Day Shift (7:00 AM - 5:00 PM)",
      experience: 12,
      rating: 4.8,
      patients: 892,
      email: "michael.chen@synaptiflow.com",
      phone: "555-0102",
      certifications: ["Board Certified", "FACC", "FSCAI"]
    },
    {
      id: "staff-003",
      name: "Dr. Lisa Wang",
      role: "Oncologist",
      department: "Oncology",
      specialization: "Medical Oncology",
      status: "on-call",
      shift: "On Call",
      experience: 10,
      rating: 4.7,
      patients: 634,
      email: "lisa.wang@synaptiflow.com",
      phone: "555-0103",
      certifications: ["Board Certified", "ASCO Member"]
    },
    {
      id: "staff-004",
      name: "Dr. James Wilson",
      role: "Emergency Physician",
      department: "Emergency",
      status: "on-duty",
      shift: "Night Shift (8:00 PM - 8:00 AM)",
      experience: 8,
      rating: 4.6,
      patients: 2341,
      email: "james.wilson@synaptiflow.com",
      phone: "555-0104",
      certifications: ["Board Certified", "ACEP Fellow", "ATLS"]
    },
    {
      id: "staff-005",
      name: "Nurse Patricia Brown",
      role: "Head Nurse",
      department: "ICU",
      status: "on-duty",
      shift: "Day Shift (7:00 AM - 7:00 PM)",
      experience: 20,
      rating: 4.9,
      patients: 3456,
      email: "patricia.brown@synaptiflow.com",
      phone: "555-0105",
      certifications: ["RN", "CCRN", "CNL"]
    },
    {
      id: "staff-006",
      name: "Dr. Robert Anderson",
      role: "Anesthesiologist",
      department: "Surgery",
      status: "off-duty",
      shift: "Day Shift (6:00 AM - 4:00 PM)",
      experience: 14,
      rating: 4.8,
      patients: 1823,
      email: "robert.anderson@synaptiflow.com",
      phone: "555-0106",
      certifications: ["Board Certified", "ASA Member"]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-duty": return "bg-green-100 text-green-800 border-green-300";
      case "off-duty": return "bg-gray-100 text-gray-800 border-gray-300";
      case "on-leave": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "on-call": return "bg-blue-100 text-blue-800 border-blue-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredStaff = staffMembers.filter(member => {
    if (searchTerm && !member.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !member.role.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterDepartment !== "all" && member.department !== filterDepartment) return false;
    
    if (selectedTab === "on-duty" && member.status !== "on-duty") return false;
    if (selectedTab === "doctors" && !member.role.includes("Dr.")) return false;
    if (selectedTab === "nurses" && !member.role.includes("Nurse")) return false;
    
    return true;
  });

  const staffStats = {
    total: staffMembers.length,
    onDuty: staffMembers.filter(s => s.status === "on-duty").length,
    doctors: staffMembers.filter(s => s.role.includes("Dr.")).length,
    nurses: staffMembers.filter(s => s.role.includes("Nurse")).length,
    averageRating: (staffMembers.reduce((acc, s) => acc + s.rating, 0) / staffMembers.length).toFixed(1)
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Staff Management
            </h1>
          </div>
          
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-6 py-2 bg-white border-b flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{staffStats.total}</span> total staff</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{staffStats.onDuty}</span> on duty</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{staffStats.doctors}</span> doctors</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{staffStats.nurses}</span> nurses</span>
        <span className="text-border">·</span>
        <span>★ <span className="font-semibold text-foreground">{staffStats.averageRating}</span> avg rating</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="px-6 py-3 bg-white border-b">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-fit h-auto">
                <TabsTrigger value="all">All Staff</TabsTrigger>
                <TabsTrigger value="on-duty">On Duty ({staffStats.onDuty})</TabsTrigger>
                <TabsTrigger value="doctors">Doctors ({staffStats.doctors})</TabsTrigger>
                <TabsTrigger value="nurses">Nurses ({staffStats.nurses})</TabsTrigger>
              </TabsList>
              
              {/* Search and Filters */}
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </div>
          
          <TabsContent value={selectedTab} className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              {filteredStaff.map((member) => (
                <Card key={member.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{member.name}</h3>
                            <p className="text-sm text-gray-600">{member.role}</p>
                            {member.specialization && (
                              <p className="text-xs text-gray-500">{member.specialization}</p>
                            )}
                          </div>
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Briefcase className="w-3 h-3" />
                            <span>{member.department}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>{member.shift}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Award className="w-3 h-3" />
                            <span>{member.experience} years</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="w-3 h-3" />
                            <span>{member.patients} patients</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.floor(member.rating)
                                    ? "text-yellow-500 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{member.rating}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {member.certifications.map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Shield className="w-2 h-2 mr-1" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4 pt-3 border-t">
                          <a href={`mailto:${member.email}`} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                            <Mail className="w-3 h-3" />
                            Email
                          </a>
                          <a href={`tel:${member.phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                            <Phone className="w-3 h-3" />
                            {member.phone}
                          </a>
                          <Button size="sm" variant="outline" className="ml-auto">
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredStaff.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No staff members found</p>
                  <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}