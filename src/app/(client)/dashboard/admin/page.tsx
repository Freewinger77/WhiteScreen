"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Lock, Save, RotateCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RETELL_AGENT_GENERAL_PROMPT } from "@/lib/constants";

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [prompt, setPrompt] = useState(RETELL_AGENT_GENERAL_PROMPT);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Check if already authenticated in session
  useEffect(() => {
    const authStatus = sessionStorage.getItem("admin_authenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticate = () => {
    // Simple password check (you can make this more secure)
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "rapidscreen2025";
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_authenticated", "true");
      toast.success("Access granted!");
    } else {
      toast.error("Incorrect password!");
      setPassword("");
    }
  };

  const handleSavePrompt = async () => {
    setIsSaving(true);
    try {
      // Save the prompt to a config file or database
      const response = await fetch("/api/save-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("Failed to save prompt");

      setLastSaved(new Date());
      toast.success("Prompt saved successfully!");
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error("Failed to save prompt");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAgents = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/update-interviewers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("Failed to update agents");

      const data = await response.json();
      
      // Check results
      const allSuccess = data.results?.every((r: any) => r.status === "updated");
      
      if (allSuccess) {
        toast.success(`All ${data.results.length} agents updated successfully!`);
      } else {
        const failed = data.results?.filter((r: any) => r.status === "failed");
        toast.warning(`Updated ${data.results.length - failed.length}/${data.results.length} agents`);
      }
    } catch (error) {
      console.error("Error updating agents:", error);
      toast.error("Failed to update agents");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAndUpdate = async () => {
    await handleSavePrompt();
    await handleUpdateAgents();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
    setPassword("");
    toast.info("Logged out of admin panel");
  };

  if (!isAuthenticated) {
    return (
      <main className="p-8 pt-0 ml-12 mr-auto rounded-md">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="space-y-1 flex flex-col items-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                Admin Access
              </CardTitle>
              <p className="text-sm text-gray-500 text-center">
                Enter password to access global settings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                    className="pl-10 py-6"
                  />
                </div>
              </div>
              <Button
                onClick={handleAuthenticate}
                className="w-full bg-orange-500 hover:bg-orange-600 py-6"
              >
                Authenticate
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 pt-0 ml-12 mr-auto rounded-md max-w-6xl">
      <div className="flex flex-col items-left">
        <div className="flex justify-between items-center mt-8 mb-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Admin Panel
            </h2>
            <h3 className="text-sm tracking-tight text-gray-600 font-medium">
              Modify global interview prompt
            </h3>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900"
          >
            Logout
          </Button>
        </div>

        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Global Interviewer Prompt
            </CardTitle>
            <p className="text-sm text-gray-500">
              This prompt is used by all interviewer agents (Lisa, Bob, etc.). Changes will be applied when you click "Save & Update All Agents".
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Prompt Template
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
                placeholder="Enter the interviewer prompt..."
              />
              <p className="text-xs text-gray-500">
                Available variables: {"{{"} mins {"}}"}, {"{{"} name {"}}"}, {"{{"} objective {"}}"}, {"{{"} job_context {"}}"}, {"{{"} company {"}}"}, {"{{"} questions {"}}"}
              </p>
            </div>

            {lastSaved && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Last saved: {lastSaved.toLocaleString()}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSavePrompt}
                disabled={isSaving || isUpdating}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {isSaving ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Prompt
                  </>
                )}
              </Button>

              <Button
                onClick={handleSaveAndUpdate}
                disabled={isSaving || isUpdating}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isUpdating ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Save & Update All Agents
                  </>
                )}
              </Button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Warning:</strong> This will create NEW agents for all interviewers (Lisa, Bob, etc.) with the updated prompt. The old agents will be replaced in your database. Existing interviews will automatically use the new agents.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 shadow-lg bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Testing Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>• Test your changes in a development environment first</p>
            <p>• Keep a backup of the working prompt</p>
            <p>• Monitor interview quality after making changes</p>
            <p>• The follow-up limits (3/5/7) are enforced based on follow_up_count (1/2/3)</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default AdminPage;

