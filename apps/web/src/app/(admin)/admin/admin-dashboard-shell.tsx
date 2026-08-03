"use client";
import { Activity, BarChart3, BookOpen, Brain, Loader2, Puzzle as PuzzleIcon, Users, Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsTab } from "./admin-analytics-tab";
import { BlogsTab } from "./admin-blogs-tab";
import { PuzzlesTab } from "./admin-puzzles-tab";
import { UsersTab } from "./admin-users-tab";
import type { Tab } from "./admin-dashboard-types";

const StatsTab = dynamic(() => import("@/components/admin/tabs/StatsTab").then((m) => ({ default: m.StatsTab })), { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" /></div>, ssr: false });
const ToolsTab = dynamic(() => import("@/components/admin/tabs/ToolsTab").then((m) => ({ default: m.ToolsTab })), { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" /></div>, ssr: false });
const AIInsightsTab = dynamic(() => import("@/components/admin/tabs/AIInsightsTab").then((m) => ({ default: m.AIInsightsTab })), { loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" /></div>, ssr: false });

export function AdminDashboardShell(props: Record<string, any>) {
  const {
    loading, isAdmin, activeTab, setActiveTab, stats, statsLoading,
    puzzles, puzzlesLoading, puzzlePage, puzzleTotalPages, editingPuzzle, setEditingPuzzle,
    creatingPuzzle, setCreatingPuzzle, blogs, blogsLoading, blogPage, blogTotalPages,
    editingBlog, setEditingBlog, creatingBlog, setCreatingBlog, users, usersLoading,
    userPage, userTotalPages, analyticsEvents, analyticsLoading,
    deletePuzzleDialog, setDeletePuzzleDialog, deleteBlogDialog, setDeleteBlogDialog,
    deleteUserDialog, setDeleteUserDialog, user, fetchPuzzles, fetchBlogs,
    handleStatsRefresh, handleSavePuzzle, handleDeletePuzzleClick, handleDeletePuzzle,
    handleSaveBlog, handleDeleteBlogClick, handleDeleteBlog,
    handleDeleteUserClick, handleDeleteUser, handleSendPasswordReset,
  } = props;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton className="h-32" key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-6">
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Admin Dashboard</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Comprehensive analytics and management for your Rebuzzle platform
            </p>
          </div>
        </div>
      </div>

      <Tabs onValueChange={(v) => setActiveTab(v as Tab)} value={activeTab}>
        <TabsList className="mb-8 h-11 bg-muted/50">
          <TabsTrigger className="data-[state=active]:bg-background" value="stats">
            <BarChart3 data-icon="inline-start" className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-background" value="puzzles">
            <PuzzleIcon data-icon="inline-start" className="mr-2 h-4 w-4" />
            Puzzles
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-background" value="blogs">
            <BookOpen data-icon="inline-start" className="mr-2 h-4 w-4" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-background" value="users">
            <Users data-icon="inline-start" className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-background" value="analytics">
            <Activity data-icon="inline-start" className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-background" value="tools">
            <Wrench data-icon="inline-start" className="mr-2 h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-background" value="ai-insights">
            <Brain data-icon="inline-start" className="mr-2 h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="stats">
          <StatsTab loading={statsLoading} onRefresh={handleStatsRefresh} stats={stats as any} />
        </TabsContent>

        <TabsContent className="space-y-6" value="puzzles">
          <PuzzlesTab
            creatingPuzzle={creatingPuzzle}
            editingPuzzle={editingPuzzle}
            loading={puzzlesLoading}
            onCancelEdit={() => {
              setEditingPuzzle(null);
              setCreatingPuzzle(false);
            }}
            onCreateNew={() => {
              setCreatingPuzzle(true);
              setEditingPuzzle({
                id: "new",
                puzzle: "",
                answer: "",
                difficulty: "medium",
                publishedAt: new Date().toISOString(),
                active: true,
              });
            }}
            onDelete={handleDeletePuzzleClick}
            onEdit={(p) => setEditingPuzzle(p)}
            onPageChange={fetchPuzzles}
            onSave={handleSavePuzzle}
            page={puzzlePage}
            puzzles={puzzles}
            totalPages={puzzleTotalPages}
          />
        </TabsContent>

        <TabsContent className="space-y-6" value="blogs">
          <BlogsTab
            blogs={blogs}
            creatingBlog={creatingBlog}
            editingBlog={editingBlog}
            loading={blogsLoading}
            onCancelEdit={() => {
              setEditingBlog(null);
              setCreatingBlog(false);
            }}
            onCreateNew={() => {
              setCreatingBlog(true);
              setEditingBlog({
                id: "new",
                title: "",
                slug: "",
                content: "",
                excerpt: "",
                authorId: user?.id || "",
                puzzleId: "",
                publishedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }}
            onDelete={handleDeleteBlogClick}
            onEdit={(b) => setEditingBlog(b)}
            onPageChange={fetchBlogs}
            onSave={handleSaveBlog}
            page={blogPage}
            totalPages={blogTotalPages}
          />
        </TabsContent>

        <TabsContent className="space-y-6" value="users">
          <UsersTab
            loading={usersLoading}
            onDelete={handleDeleteUserClick}
            onPageChange={fetchUsers}
            onSendPasswordReset={handleSendPasswordReset}
            page={userPage}
            totalPages={userTotalPages}
            users={users}
          />
        </TabsContent>

        <TabsContent className="space-y-6" value="analytics">
          <AnalyticsTab events={analyticsEvents} loading={analyticsLoading} stats={stats} />
        </TabsContent>

        <TabsContent className="space-y-6" value="tools">
          <ToolsTab
            onBlogPostSaved={() => {
              fetchBlogs(blogPage);
            }}
            onPuzzleSaved={() => {
              fetchPuzzles(puzzlePage);
            }}
          />
        </TabsContent>

        <TabsContent className="space-y-6" value="ai-insights">
          <AIInsightsTab />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialogs */}
      <DeleteConfirmDialog
        description="Are you sure you want to delete this puzzle? This will permanently remove it from the database."
        itemName={deletePuzzleDialog.name}
        onConfirm={handleDeletePuzzle}
        onOpenChange={(open) => setDeletePuzzleDialog({ ...deletePuzzleDialog, open })}
        open={deletePuzzleDialog.open}
        title="Delete Puzzle"
      />

      <DeleteConfirmDialog
        description="Are you sure you want to delete this blog post? This will permanently remove it from the database."
        itemName={deleteBlogDialog.name}
        onConfirm={handleDeleteBlog}
        onOpenChange={(open) => setDeleteBlogDialog({ ...deleteBlogDialog, open })}
        open={deleteBlogDialog.open}
        title="Delete Blog Post"
      />

      <DeleteConfirmDialog
        description="Are you sure you want to delete this user? This will permanently remove the user and all their associated data (stats, attempts, sessions) from the database."
        itemName={deleteUserDialog.name}
        onConfirm={handleDeleteUser}
        onOpenChange={(open) => setDeleteUserDialog({ ...deleteUserDialog, open })}
        open={deleteUserDialog.open}
        title="Delete User"
      />
    </div>
  );

}
