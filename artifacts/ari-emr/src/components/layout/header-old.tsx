import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/workspace" },
    { name: "Patients", href: "/workspace" },
    { name: "AI Tools", href: "/ai-tools" },
    { name: "Settings", href: "/settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/workspace" && location.startsWith("/workspace")) return true;
    if (location.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/workspace">
                <h1 className="text-2xl font-bold text-medical-blue cursor-pointer">SynaptiFlow</h1>
              </Link>
            </div>
          </div>
          
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-medical-blue text-white"
                      : "text-medical-gray hover:text-medical-blue"
                  }`}>
                    {item.name}
                  </a>
                </Link>
              ))}
            </div>
          </nav>
          
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-medical-gray" />
              ) : (
                <Menu className="h-6 w-6 text-medical-gray" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <a 
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-medical-blue text-white"
                      : "text-medical-gray hover:text-medical-blue"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
