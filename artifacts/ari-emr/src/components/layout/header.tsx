import { useState, useEffect, useRef } from "react";
import { Bell, User, Search, Award, GraduationCap, Stethoscope, Calendar, MapPin, Phone, Mail, Shield, Building, Clock, Star, Activity, FileText, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "@/components/layout/sidebar";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function PatientSearch() {
  const [q, setQ] = useState("");
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      setLocation(`/workspace?search=${encodeURIComponent(q.trim())}`);
      setQ("");
      ref.current?.blur();
    }
  };

  return (
    <form onSubmit={submit} className="relative w-56 hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
      <Input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search patient… ⌘K"
        className="pl-9 text-sm bg-gray-50 border-gray-200"
      />
    </form>
  );
}

export default function Header() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <header className="bg-white border-b border-gray-200 h-12">
      <div className="flex items-center justify-between h-full px-3 sm:px-6 gap-2">
        {/* Mobile nav drawer */}
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" data-testid="button-mobile-nav">
              <Menu className="w-5 h-5 text-gray-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 border-0 [&>button]:text-white">
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </SheetContent>
        </Sheet>
        {/* Left side - Doctor Information Tab */}
        <div className="flex-1 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1.5 h-10 max-w-full px-2 sm:px-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-sm font-semibold truncate">Dr. Sarah Johnson, MD, PhD</div>
                    <div className="text-xs text-gray-500 truncate hidden sm:block">Diagnostic Radiologist • License: NY-453892</div>
                  </div>
                </div>
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 hidden md:inline-flex">
                  On Duty
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(100vw-1rem)] max-w-[600px] p-0" align="start">
              <Tabs defaultValue="credentials" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b">
                  <TabsTrigger value="credentials">Credentials</TabsTrigger>
                  <TabsTrigger value="specializations">Specializations</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                </TabsList>
                
                <TabsContent value="credentials" className="p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <GraduationCap className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Education</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>MD - Harvard Medical School</span>
                            <span className="text-gray-500">2008</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PhD in Medical Imaging - MIT</span>
                            <span className="text-gray-500">2012</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Residency - Johns Hopkins Hospital</span>
                            <span className="text-gray-500">2008-2012</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fellowship - Memorial Sloan Kettering</span>
                            <span className="text-gray-500">2012-2014</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Board Certifications</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>American Board of Radiology (ABR)</span>
                            <Badge variant="outline" className="text-xs">Active</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Certificate of Added Qualification - Neuroradiology</span>
                            <Badge variant="outline" className="text-xs">Active</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Nuclear Medicine Board Certification</span>
                            <Badge variant="outline" className="text-xs">Active</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Licenses & DEA</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>New York State Medical License</span>
                            <span className="text-gray-500">NY-453892</span>
                          </div>
                          <div className="flex justify-between">
                            <span>DEA Registration</span>
                            <span className="text-gray-500">BJ1234567</span>
                          </div>
                          <div className="flex justify-between">
                            <span>NPI Number</span>
                            <span className="text-gray-500">1234567890</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="specializations" className="p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Stethoscope className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Clinical Expertise</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            <span>Neuro-Oncology Imaging</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            <span>Functional MRI</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            <span>CT Angiography</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            <span>Interventional Radiology</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            <span>Pediatric Imaging</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            <span>AI-Assisted Diagnostics</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Research & Publications</div>
                        <div className="space-y-1 text-sm">
                          <div>• 47 peer-reviewed publications in radiology journals</div>
                          <div>• Principal Investigator - NIH Grant R01-AI2024</div>
                          <div>• Co-author: "AI Applications in Medical Imaging" (2023)</div>
                          <div>• Editorial Board: Journal of Diagnostic Imaging</div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Recognition</div>
                        <div className="space-y-1 text-sm">
                          <div>• Radiologist of the Year 2023 - American College of Radiology</div>
                          <div>• Excellence in Teaching Award - 2022</div>
                          <div>• Top Doctor - New York Magazine (2020-2024)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="schedule" className="p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Current Week Schedule</div>
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2">
                            <span>Day</span>
                            <span>Hours</span>
                            <span>Department</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span>Monday</span>
                            <span>7:00 AM - 3:00 PM</span>
                            <span>Main Radiology</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span>Tuesday</span>
                            <span>7:00 AM - 3:00 PM</span>
                            <span>Emergency</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span>Wednesday</span>
                            <span>12:00 PM - 8:00 PM</span>
                            <span>Interventional</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span>Thursday</span>
                            <span>7:00 AM - 3:00 PM</span>
                            <span>Main Radiology</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span>Friday</span>
                            <span>7:00 AM - 3:00 PM</span>
                            <span>Pediatric</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">On-Call Schedule</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Weekend On-Call</span>
                            <span className="text-gray-500">Every 3rd weekend</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Night Call</span>
                            <span className="text-gray-500">Tuesday nights</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Holiday Coverage</span>
                            <span className="text-gray-500">Rotating schedule</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="contact" className="p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Hospital Affiliation</div>
                        <div className="space-y-1 text-sm">
                          <div>Mount Sinai Hospital - Department of Radiology</div>
                          <div className="text-gray-500">1 Gustave L. Levy Place, New York, NY 10029</div>
                          <div className="text-gray-500">Office: Annenberg Building, 5th Floor, Room 5-20</div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Contact Information</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Office</span>
                            <span className="text-gray-600">(212) 241-7409</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pager</span>
                            <span className="text-gray-600">#4523</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mobile</span>
                            <span className="text-gray-600">(917) 555-0123</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="font-semibold">Email & Digital</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Hospital Email</span>
                            <span className="text-gray-600">sarah.johnson@mountsinai.org</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Secure Messaging</span>
                            <span className="text-gray-600">@dr.sjohnson</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Department Portal</span>
                            <span className="text-gray-600">radiology.msh.edu/sjohnson</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side - search, notifications, profile */}
        <div className="flex items-center space-x-1 sm:space-x-4 shrink-0">
          {/* Search Bar — Cmd+K to focus, Enter navigates to /patients?search= */}
          <PatientSearch />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start py-3">
                <div className="font-medium">New AI Analysis Complete</div>
                <div className="text-sm text-gray-500">Patient: Emily Tan - Lung analysis ready</div>
                <div className="text-xs text-gray-400 mt-1">2 minutes ago</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start py-3">
                <div className="font-medium">Critical Patient Alert</div>
                <div className="text-sm text-gray-500">Michael Chen requires immediate attention</div>
                <div className="text-xs text-gray-400 mt-1">15 minutes ago</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start py-3">
                <div className="font-medium">Report Generated</div>
                <div className="text-sm text-gray-500">Oncology report for David Kim is ready</div>
                <div className="text-xs text-gray-400 mt-1">1 hour ago</div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-sm text-blue-600">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">Dr. Sarah Johnson</span>
                  <span className="text-xs text-gray-500">Radiologist</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Account Preferences</DropdownMenuItem>
              <DropdownMenuItem>Notification Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}