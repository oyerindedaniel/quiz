"use client";

import { useState } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import QuestionSync from "@/components/sync/question-sync";
import UserSync from "@/components/sync/user-sync";
import { Database, Users, Settings, RotateCcw } from "lucide-react";

export default function SyncMenu() {
  const [activeSyncPanel, setActiveSyncPanel] = useState<
    "none" | "questions" | "users"
  >("none");

  const handleSyncPanelChange = (panel: "questions" | "users") => {
    setActiveSyncPanel(activeSyncPanel === panel ? "none" : panel);
  };

  return (
    <div className="fixed top-4 right-4 z-20">
      <div className="flex items-center gap-2">
        <Menubar className="bg-white/90 backdrop-blur-sm border-brand-200 shadow-md">
          <MenubarMenu>
            <MenubarTrigger className="flex items-center gap-2 font-sans text-gray-700">
              <RotateCcw className="w-4 h-4" />
              Sync
            </MenubarTrigger>
            <MenubarContent className="w-48">
              <MenubarItem
                onClick={() => handleSyncPanelChange("questions")}
                className="cursor-pointer"
              >
                <Database className="w-4 h-4 mr-2" />
                Question Sync
              </MenubarItem>
              <MenubarItem
                onClick={() => handleSyncPanelChange("users")}
                className="cursor-pointer"
              >
                <Users className="w-4 h-4 mr-2" />
                User Sync
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled className="text-gray-500">
                <Settings className="w-4 h-4 mr-2" />
                Sync Settings
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {activeSyncPanel === "questions" && (
        <div className="mt-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-brand-200 max-h-[70vh] overflow-hidden">
          <QuestionSync />
        </div>
      )}

      {activeSyncPanel === "users" && (
        <div className="mt-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-brand-200 max-h-[70vh] overflow-hidden">
          <UserSync />
        </div>
      )}
    </div>
  );
}
