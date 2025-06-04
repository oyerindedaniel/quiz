"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  HelpCircle,
  Settings,
  Database,
  BarChart3,
  Upload,
  Download,
  LogOut,
  User,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigationData = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        url: "/admin/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Users",
        url: "/admin/users",
        icon: Users,
        subItems: [
          {
            title: "View All Users",
            url: "/admin/users",
          },
          {
            title: "Create User",
            url: "/admin/users/create",
          },
          {
            title: "User Credentials",
            url: "/admin/users/credentials",
          },
        ],
      },
      {
        title: "Subjects",
        url: "/admin/subjects",
        icon: BookOpen,
      },
      {
        title: "Questions",
        url: "/admin/questions",
        icon: HelpCircle,
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        title: "Import",
        url: "/admin/import",
        icon: Upload,
      },
      {
        title: "Export",
        url: "/admin/export",
        icon: Download,
      },
      {
        title: "Database",
        url: "/admin/database",
        icon: Database,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
        subItems: [
          {
            title: "General",
            url: "/admin/settings",
          },
          {
            title: "Create User",
            url: "/admin/settings/create-user",
          },
          {
            title: "Admin Users",
            url: "/admin/settings/admins",
          },
        ],
      },
    ],
  },
];

export function AdminLayoutWithSidebar({ children }: AdminLayoutProps) {
  const { admin, isLoading, logout } = useAdminAuth({
    redirectPath: "/",
  });
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-gray-600 font-sans">Loading...</span>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/admin/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-600 text-sidebar-primary-foreground">
                    <Shield className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold font-sans">
                      Admin Portal
                    </span>
                    <span className="truncate text-xs font-sans">
                      Quiz Management
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {navigationData.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel className="font-sans">
                {section.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {item.subItems ? (
                        <SidebarMenuButton
                          asChild
                          className={`font-sans ${
                            pathname.startsWith(item.url)
                              ? "bg-sidebar-accent"
                              : ""
                          }`}
                        >
                          <div>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto size-4" />
                          </div>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          className={`font-sans ${
                            pathname === item.url ? "bg-sidebar-accent" : ""
                          }`}
                        >
                          <Link href={item.url}>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                      {item.subItems && (
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                className={`font-sans ${
                                  pathname === subItem.url
                                    ? "bg-sidebar-accent"
                                    : ""
                                }`}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center space-x-3 px-2 py-2">
                <div className="flex items-center justify-center w-8 h-8 bg-brand-100 rounded-full">
                  <User className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate font-sans">
                    {admin.firstName} {admin.lastName}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        admin.role === "SUPER_ADMIN" ? "default" : "secondary"
                      }
                      className="text-xs font-sans"
                    >
                      {admin.role}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator className="my-2" />
              <SidebarMenuButton onClick={logout} className="font-sans">
                <LogOut className="size-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 bg-white border-b border-gray-200">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900 font-sans">
              Admin Dashboard
            </h1>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-gray-50">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
