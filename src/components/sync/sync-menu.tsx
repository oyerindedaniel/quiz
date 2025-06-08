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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuestionSync from "@/components/sync/question-sync";
import UserSync from "@/components/sync/user-sync";
import { Database, Users, Settings, RotateCcw } from "lucide-react";

export default function SyncMenu() {
  const [questionSyncOpen, setQuestionSyncOpen] = useState(false);
  const [userSyncOpen, setUserSyncOpen] = useState(false);

  return (
    <>
      <div className="fixed top-4 right-4 z-20">
        <Menubar className="bg-white/90 backdrop-blur-sm border-brand-200 shadow-md">
          <MenubarMenu>
            <MenubarTrigger className="flex items-center gap-2 font-sans text-gray-700">
              <RotateCcw className="w-4 h-4" />
              Sync
            </MenubarTrigger>
            <MenubarContent className="w-48">
              <MenubarItem
                onClick={() => setQuestionSyncOpen(true)}
                className="cursor-pointer"
              >
                <Database className="w-4 h-4 mr-2" />
                Question Sync
              </MenubarItem>
              <MenubarItem
                onClick={() => setUserSyncOpen(true)}
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

      <Dialog open={questionSyncOpen} onOpenChange={setQuestionSyncOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-sans">
              <Database className="w-5 h-5 text-brand-600" />
              Question Sync
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <QuestionSync />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={userSyncOpen} onOpenChange={setUserSyncOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-sans">
              <Users className="w-5 h-5 text-brand-600" />
              User Sync
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <UserSync />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
