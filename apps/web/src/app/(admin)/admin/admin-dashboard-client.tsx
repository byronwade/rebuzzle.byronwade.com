"use client";

import {
  Activity,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Brain,
  Download,
  Edit,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Puzzle as PuzzleIcon,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BarChart } from "@/components/admin/charts/BarChart";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { EditBlogDialog } from "@/components/admin/EditBlogDialog";
import { EditPuzzleDialog } from "@/components/admin/EditPuzzleDialog";
import { exportToCSV } from "@/components/admin/exportUtils";

// Dynamic imports for heavy tab components (code splitting)
const StatsTab = dynamic(
  () => import("@/components/admin/tabs/StatsTab").then((mod) => ({ default: mod.StatsTab })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" />
      </div>
    ),
    ssr: false,
  }
);

const ToolsTab = dynamic(
  () => import("@/components/admin/tabs/ToolsTab").then((mod) => ({ default: mod.ToolsTab })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" />
      </div>
    ),
    ssr: false,
  }
);

const AIInsightsTab = dynamic(
  () =>
    import("@/components/admin/tabs/AIInsightsTab").then((mod) => ({ default: mod.AIInsightsTab })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" />
      </div>
    ),
    ssr: false,
  }
);

import { format as formatDateFns } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { safeJsonParse } from "@/lib/utils";

type Tab = "stats" | "puzzles" | "blogs" | "users" | "analytics" | "tools" | "ai-insights";

interface AdminStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalPuzzles: number;
    activePuzzles: number;
    totalBlogPosts: number;
    publishedBlogPosts: number;
    totalUserStats: number;
    totalAnalyticsEvents: number;
    totalEmailSubscriptions: number;
  };
  recentActivity: {
    newUsersLast7Days: number;
    newPuzzlesLast7Days: number;
    newBlogPostsLast7Days: number;
    eventsLast7Days: number;
  };
  topUsers: Array<{
    userId: string;
    username: string;
    email: string;
    points: number;
    streak: number;
    wins: number;
    level: number;
  }>;
  puzzleTypes: Array<{ type: string; count: number }>;
  eventTypes: Array<{ type: string; count: number }>;
  dailySignups: Array<{ date: string; count: number }>;
  userEngagement?: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
    returningVsNew: { returning: number; new: number };
    retention: { day1: number; day7: number };
    churnRate: number;
  };
  puzzlePerformance?: {
    completionRatesByType: Array<{
      type: string;
      completionRate: number;
      totalSessions: number;
      completedSessions: number;
    }>;
    averageTimeToSolve: Array<{
      type: string;
      avgTimeSeconds: number;
      count: number;
    }>;
    popularPuzzles: Array<{
      puzzleId: string;
      puzzleText: string;
      puzzleType: string;
      attempts: number;
      uniqueUsers: number;
    }>;
    difficultPuzzles: Array<{
      puzzleId: string;
      completionRate: number;
      totalSessions: number;
    }>;
    abandonmentRate: Array<{
      puzzleId: string;
      abandonmentRate: number;
    }>;
    hintUsage: Array<{ hintsUsed: number; count: number }>;
  };
  timeSeries?: {
    dailyPuzzleCompletions: Array<{ date: string; count: number }>;
    dailyPuzzleAttempts: Array<{ date: string; count: number }>;
    dailyGameSessions: Array<{ date: string; count: number }>;
    dailyEventsByType: Array<{
      date: string;
      events: Array<{ type: string; count: number }>;
    }>;
  };
  advancedAnalytics?: {
    satisfactionByType: Array<{
      type: string;
      avgSatisfaction: number;
      count: number;
    }>;
    difficultyPerception: Array<{
      puzzleId: string;
      avgPerceived: number;
      actualDifficulty: number;
      count: number;
    }>;
    peakUsageTimes: Array<{ hour: number; count: number }>;
    progressionFunnel: {
      signups: number;
      firstPuzzle: number;
      regularPlayers: number;
      conversionToFirstPuzzle: number;
      conversionToRegular: number;
    };
  };
}

interface Puzzle {
  id: string;
  puzzle: string;
  puzzleType?: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard" | number;
  category?: string;
  explanation?: string;
  hints?: string[];
  publishedAt: string;
  createdAt?: string;
  active: boolean;
  metadata?: Record<string, any>;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  puzzleId: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  stats?: {
    points: number;
    streak: number;
    totalGames: number;
    wins: number;
    level: number;
    dailyChallengeStreak: number;
    lastPlayDate?: string;
  } | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("stats");

  // Stats state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Puzzles state
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [puzzlesLoading, setPuzzlesLoading] = useState(false);
  const [puzzlePage, setPuzzlePage] = useState(1);
  const [puzzleTotalPages, setPuzzleTotalPages] = useState(1);
  const [editingPuzzle, setEditingPuzzle] = useState<Puzzle | null>(null);
  const [creatingPuzzle, setCreatingPuzzle] = useState(false);

  // Blogs state
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogPage, setBlogPage] = useState(1);
  const [blogTotalPages, setBlogTotalPages] = useState(1);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [creatingBlog, setCreatingBlog] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);

  // Analytics state
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Delete confirmation dialogs state
  const [deletePuzzleDialog, setDeletePuzzleDialog] = useState<{
    open: boolean;
    id: string | null;
    name?: string;
  }>({ open: false, id: null });
  const [deleteBlogDialog, setDeleteBlogDialog] = useState<{
    open: boolean;
    id: string | null;
    name?: string;
  }>({ open: false, id: null });
  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    open: boolean;
    id: string | null;
    name?: string;
  }>({ open: false, id: null });

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isAuthenticated) {
        window.location.assign("/login");
        return;
      }

      try {
        // Check admin access via dedicated check endpoint
        const response = await fetch("/api/admin/check");
        if (response.ok) {
          const data = await safeJsonParse(response);
          if (data?.isAdmin) {
            setIsAdmin(true);
            // StatsTab will handle its own initial data fetch
          } else {
            toast({
              title: "Access Denied",
              description: "You must be an admin to access this page.",
              variant: "destructive",
            });
            window.location.assign("/");
          }
        } else {
          // Not an admin or not authenticated
          toast({
            title: "Access Denied",
            description: "You must be an admin to access this page.",
            variant: "destructive",
          });
          window.location.assign("/");
        }
      } catch (error) {
        console.error("Admin check failed:", error);
        toast({
          title: "Error",
          description: "Failed to verify admin access",
          variant: "destructive",
        });
        window.location.assign("/");
      }
      setLoading(false);
    };

    if (isAuthenticated) {
      checkAdmin();
    }
    // When unauthenticated, loading clears via derive below (avoid sync setState in effect)
  }, [isAuthenticated, router, toast]);

  const effectiveLoading = isAuthenticated ? loading : false;

  // Fetch functions
  const fetchStats = useCallback(async (startDate?: Date | null, endDate?: Date | null) => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }
      const url = `/api/admin/stats${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const data = await safeJsonParse<{ success: boolean; stats?: AdminStats }>(response);
      if (data?.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
    setStatsLoading(false);
  }, []);

  const fetchPuzzles = useCallback(async (page = 1) => {
    setPuzzlesLoading(true);
    try {
      const response = await fetch(`/api/admin/puzzles?page=${page}&limit=20`);
      const data = await safeJsonParse<{
        success: boolean;
        puzzles?: Puzzle[];
        pagination?: { totalPages: number };
      }>(response);
      if (data?.success && data.puzzles) {
        setPuzzles(data.puzzles);
        if (data.pagination) {
          setPuzzleTotalPages(data.pagination.totalPages);
        }
        setPuzzlePage(page);
      }
    } catch (error) {
      console.error("Failed to fetch puzzles:", error);
    }
    setPuzzlesLoading(false);
  }, []);

  const fetchBlogs = useCallback(async (page = 1) => {
    setBlogsLoading(true);
    try {
      const response = await fetch(`/api/admin/blogs?page=${page}&limit=20`);
      const data = await safeJsonParse<{
        success: boolean;
        blogPosts?: BlogPost[];
        pagination?: { totalPages: number };
      }>(response);
      if (data?.success && data.blogPosts) {
        setBlogs(data.blogPosts);
        if (data.pagination) {
          setBlogTotalPages(data.pagination.totalPages);
        }
        setBlogPage(page);
      }
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
    }
    setBlogsLoading(false);
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=20`);
      const data = await safeJsonParse<{
        success: boolean;
        users?: User[];
        pagination?: { totalPages: number };
      }>(response);
      if (data?.success && data.users) {
        setUsers(data.users);
        if (data.pagination) {
          setUserTotalPages(data.pagination.totalPages);
        }
        setUserPage(page);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
    setUsersLoading(false);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch("/api/admin/analytics/events?limit=100");
      const data = await safeJsonParse<{ success: boolean; events?: unknown[] }>(response);
      if (data?.success) {
        setAnalyticsEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
    setAnalyticsLoading(false);
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin) return;

    switch (activeTab) {
      case "stats":
        // StatsTab handles its own data fetching via date range
        // Don't fetch here to avoid conflicts
        break;
      case "puzzles":
        fetchPuzzles();
        break;
      case "blogs":
        fetchBlogs();
        break;
      case "users":
        fetchUsers();
        break;
      case "analytics":
        fetchAnalytics();
        break;
    }
  }, [activeTab, isAdmin, fetchAnalytics, fetchBlogs, fetchPuzzles, fetchUsers]);

  // Memoized callback for stats refresh
  const handleStatsRefresh = useCallback(
    (startDate?: Date | null, endDate?: Date | null) => {
      fetchStats(startDate, endDate);
    },
    [fetchStats]
  );

  // Puzzle handlers
  const handleDeletePuzzleClick = (id: string, name?: string) => {
    const puzzle = puzzles.find((p) => p.id === id);
    setDeletePuzzleDialog({
      open: true,
      id,
      name: name || puzzle?.answer || puzzle?.puzzle?.substring(0, 50),
    });
  };

  const handleDeletePuzzle = async () => {
    if (!deletePuzzleDialog.id) return;

    try {
      const response = await fetch(`/api/admin/puzzles/${deletePuzzleDialog.id}`, {
        method: "DELETE",
      });
      const data = await safeJsonParse<{ success: boolean; error?: string }>(response);

      if (data?.success) {
        toast({ title: "Success", description: "Puzzle deleted successfully" });
        fetchPuzzles(puzzlePage);
        setDeletePuzzleDialog({ open: false, id: null });
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to delete puzzle",
          variant: "destructive",
        });
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to delete puzzle",
        variant: "destructive",
      });
    }
  };

  const handleSavePuzzle = async (puzzle: Puzzle) => {
    try {
      const url = puzzle.id.startsWith("puzzle_")
        ? `/api/admin/puzzles/${puzzle.id}`
        : "/api/admin/puzzles";
      const method = puzzle.id.startsWith("puzzle_") ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(puzzle),
      });

      const data = await safeJsonParse<{ success: boolean; error?: string }>(response);

      if (data?.success) {
        toast({
          title: "Success",
          description: `Puzzle ${method === "POST" ? "created" : "updated"} successfully`,
        });
        setEditingPuzzle(null);
        setCreatingPuzzle(false);
        fetchPuzzles(puzzlePage);
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to save puzzle",
          variant: "destructive",
        });
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to save puzzle",
        variant: "destructive",
      });
    }
  };

  // Blog handlers
  const handleDeleteBlogClick = (id: string, name?: string) => {
    const blog = blogs.find((b) => b.id === id);
    setDeleteBlogDialog({
      open: true,
      id,
      name: name || blog?.title,
    });
  };

  const handleDeleteBlog = async () => {
    if (!deleteBlogDialog.id) return;

    try {
      const response = await fetch(`/api/admin/blogs/${deleteBlogDialog.id}`, {
        method: "DELETE",
      });
      const data = await safeJsonParse<{ success: boolean; error?: string }>(response);

      if (data?.success) {
        toast({
          title: "Success",
          description: "Blog post deleted successfully",
        });
        fetchBlogs(blogPage);
        setDeleteBlogDialog({ open: false, id: null });
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to delete blog post",
          variant: "destructive",
        });
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to delete blog post",
        variant: "destructive",
      });
    }
  };

  const handleSaveBlog = async (blog: BlogPost) => {
    try {
      const url = blog.id.startsWith("blog_") ? `/api/admin/blogs/${blog.id}` : "/api/admin/blogs";
      const method = blog.id.startsWith("blog_") ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blog),
      });

      const data = await safeJsonParse<{ success: boolean; error?: string }>(response);

      if (data?.success) {
        toast({
          title: "Success",
          description: `Blog post ${method === "POST" ? "created" : "updated"} successfully`,
        });
        setEditingBlog(null);
        setCreatingBlog(false);
        fetchBlogs(blogPage);
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to save blog post",
          variant: "destructive",
        });
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to save blog post",
        variant: "destructive",
      });
    }
  };

  // User handlers
  const handleDeleteUserClick = (id: string, name?: string) => {
    const user = users.find((u) => u.id === id);
    setDeleteUserDialog({
      open: true,
      id,
      name: name || user?.username || user?.email,
    });
  };

  const handleDeleteUser = async () => {
    if (!deleteUserDialog.id) return;

    try {
      const response = await fetch(`/api/admin/users/${deleteUserDialog.id}`, {
        method: "DELETE",
      });
      const data = await safeJsonParse<{ success: boolean; error?: string }>(response);

      if (data?.success) {
        toast({ title: "Success", description: "User deleted successfully" });
        fetchUsers(userPage);
        setDeleteUserDialog({ open: false, id: null });
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to delete user",
          variant: "destructive",
        });
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleSendPasswordReset = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}/send-password-reset`, {
        method: "POST",
      });
      const data = await safeJsonParse<{ success: boolean; error?: string }>(response);

      if (data?.success) {
        toast({
          title: "Success",
          description: "Password reset email sent successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data?.error || "Failed to send password reset",
          variant: "destructive",
        });
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to send password reset",
        variant: "destructive",
      });
    }
  };

  if (effectiveLoading) {
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

// Puzzles Tab Component
function PuzzlesTab({
  puzzles,
  loading,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onSave,
  editingPuzzle,
  onCancelEdit,
  creatingPuzzle,
  onCreateNew,
}: {
  puzzles: Puzzle[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (puzzle: Puzzle) => void;
  onDelete: (id: string) => void;
  onSave: (puzzle: Puzzle) => void;
  editingPuzzle: Puzzle | null;
  onCancelEdit: () => void;
  creatingPuzzle: boolean;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">Puzzles Management</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Create, edit, and manage puzzles in your collection
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
          Create Puzzle
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card className="p-5" key={i}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : puzzles.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center">
          <PuzzleIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No puzzles found</h3>
          <p className="mb-6 text-muted-foreground text-sm">
            Get started by creating your first puzzle
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
            Create Puzzle
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {puzzles.map((puzzle) => (
              <Card className="border p-5 transition-shadow hover:shadow-md" key={puzzle.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base">{puzzle.puzzle}</h3>
                          {puzzle.puzzleType && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs">
                              {puzzle.puzzleType}
                            </span>
                          )}
                          {!puzzle.active && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Answer: <strong className="text-foreground">{puzzle.answer}</strong>
                        </p>
                        {puzzle.explanation && (
                          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                            {puzzle.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <span>
                        Published: {formatDateFns(new Date(puzzle.publishedAt), "MMM d, yyyy")}
                      </span>
                      {puzzle.difficulty && (
                        <span className="capitalize">Difficulty: {puzzle.difficulty}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label="Puzzle actions" size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" data-icon="inline-start" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onEdit(puzzle)}>
                          <Edit className="mr-2 h-4 w-4" data-icon="inline-start" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(puzzle.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" data-icon="inline-start" />
                          Delete…
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    onClick={() => page > 1 && onPageChange(page - 1)}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        className="cursor-pointer"
                        isActive={page === pageNum}
                        onClick={() => onPageChange(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 7 && page < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    className={
                      page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                    onClick={() => page < totalPages && onPageChange(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <EditPuzzleDialog
        isCreating={creatingPuzzle}
        onOpenChange={(open) => {
          if (!open) {
            onCancelEdit();
          }
        }}
        onSave={onSave as any}
        open={!!editingPuzzle}
        puzzle={editingPuzzle as any}
      />
    </div>
  );
}

// Blogs Tab Component
function BlogsTab({
  blogs,
  loading,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onSave,
  editingBlog,
  onCancelEdit,
  creatingBlog,
  onCreateNew,
}: {
  blogs: BlogPost[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (blog: BlogPost) => void;
  onDelete: (id: string) => void;
  onSave: (blog: BlogPost) => void;
  editingBlog: BlogPost | null;
  onCancelEdit: () => void;
  creatingBlog: boolean;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">
            Blog Posts Management
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage blog posts and content for your platform
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
          Create Blog Post
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card className="p-5" key={i}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No blog posts found</h3>
          <p className="mb-6 text-muted-foreground text-sm">
            Get started by creating your first blog post
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" data-icon="inline-start" />
            Create Blog Post
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {blogs.map((blog) => (
              <Card
                className="border p-5 transition-shadow hover:shadow-md"
                key={blog.id || blog.slug}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="mb-1 font-semibold text-base">{blog.title}</h3>
                    {blog.excerpt && (
                      <p className="line-clamp-2 text-muted-foreground text-sm">{blog.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-muted-foreground text-xs">
                      <span className="font-mono">{blog.slug}</span>
                      <span>•</span>
                      <span>
                        Published: {formatDateFns(new Date(blog.publishedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label="Blog post actions" size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" data-icon="inline-start" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onEdit(blog)}>
                          <Edit className="mr-2 h-4 w-4" data-icon="inline-start" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(blog.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" data-icon="inline-start" />
                          Delete…
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    onClick={() => page > 1 && onPageChange(page - 1)}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        className="cursor-pointer"
                        isActive={page === pageNum}
                        onClick={() => onPageChange(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 7 && page < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    className={
                      page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                    onClick={() => page < totalPages && onPageChange(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <EditBlogDialog
        blog={editingBlog as any}
        isCreating={creatingBlog}
        onOpenChange={(open) => {
          if (!open) {
            onCancelEdit();
          }
        }}
        onSave={onSave as any}
        open={!!editingBlog}
      />
    </div>
  );
}

// Users Tab Component
function UsersTab({
  users,
  loading,
  page,
  totalPages,
  onPageChange,
  onDelete,
  onSendPasswordReset,
}: {
  users: User[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => void;
  onSendPasswordReset: (id: string) => void;
}) {
  const [sortField, setSortField] = useState<
    "points" | "streak" | "createdAt" | "lastLogin" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: "points" | "streak" | "createdAt" | "lastLogin") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: number | string | Date = 0;
    let bValue: number | string | Date = 0;

    switch (sortField) {
      case "points":
        aValue = a.stats?.points || 0;
        bValue = b.stats?.points || 0;
        break;
      case "streak":
        aValue = a.stats?.streak || 0;
        bValue = b.stats?.streak || 0;
        break;
      case "createdAt":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "lastLogin":
        aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        break;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  const handleExport = () => {
    const exportData = users.map((user) => ({
      Username: user.username,
      Email: user.email,
      Points: user.stats?.points || 0,
      Level: user.stats?.level || 0,
      Wins: user.stats?.wins || 0,
      Streak: user.stats?.streak || 0,
      "Joined Date": formatDateFns(new Date(user.createdAt), "MMM d, yyyy"),
      "Last Login": user.lastLogin
        ? formatDateFns(new Date(user.lastLogin), "MMM d, yyyy")
        : "Never",
    }));
    exportToCSV(exportData, `users-export-${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-xl tracking-tight md:text-2xl">Users Management</h2>
          <p className="mt-1 text-muted-foreground text-sm">View and manage all registered users</p>
        </div>
        <Button onClick={handleExport} size="sm" variant="outline">
          <Download className="mr-2 h-4 w-4" data-icon="inline-start" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div className="flex items-center gap-4" key={i}>
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <div className="ml-auto flex gap-2">
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : users.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 font-semibold text-lg">No users found</h3>
          <p className="text-muted-foreground text-sm">No users have registered yet</p>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Username</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("points")}
                      size="sm"
                      variant="ghost"
                    >
                      Points
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("streak")}
                      size="sm"
                      variant="ghost"
                    >
                      Streak
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold">Level</TableHead>
                  <TableHead className="font-semibold">Wins</TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("lastLogin")}
                      size="sm"
                      variant="ghost"
                    >
                      Last Login
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      className="-ml-2 h-8 px-2 hover:bg-muted"
                      onClick={() => handleSort("createdAt")}
                      size="sm"
                      variant="ghost"
                    >
                      Joined
                      <ArrowUpDown className="ml-2 h-3 w-3" data-icon="inline-end" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-8 text-center text-muted-foreground" colSpan={9}>
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user) => (
                    <TableRow className="hover:bg-muted/50" key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {user.stats?.points.toLocaleString("en-US") || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {user.stats?.streak || 0}
                          {user.stats && user.stats.streak > 0 && (
                            <span className="text-neutral-700 dark:text-neutral-300 text-xs dark:text-neutral-500 dark:text-neutral-400">
                              🔥
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                          {user.stats?.level || 0}
                        </span>
                      </TableCell>
                      <TableCell>{user.stats?.wins.toLocaleString("en-US") || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.lastLogin ? (
                          formatDateFns(new Date(user.lastLogin), "MMM d, yyyy")
                        ) : (
                          <span className="text-muted-foreground/60">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateFns(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-label="User actions" size="sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" data-icon="inline-start" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => onSendPasswordReset(user.id)}>
                                <Mail className="mr-2 h-4 w-4" data-icon="inline-start" />
                                Send Password Reset
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => onDelete(user.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" data-icon="inline-start" />
                                Delete… User
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    onClick={() => page > 1 && onPageChange(page - 1)}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        className="cursor-pointer"
                        isActive={page === pageNum}
                        onClick={() => onPageChange(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 7 && page < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    className={
                      page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                    onClick={() => page < totalPages && onPageChange(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({
  events,
  loading,
  stats,
}: {
  events: any[];
  loading: boolean;
  stats: AdminStats | null;
}) {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredEvents = events.filter(
    (event) => filterType === "all" || event.eventType === filterType
  );

  const eventTypes = stats?.eventTypes || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-700 dark:text-neutral-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base md:text-lg">Analytics & Events</h2>
        <Select onValueChange={setFilterType} value={filterType}>
          <SelectTrigger aria-label="Filter events by type" className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Events</SelectItem>
              {eventTypes.map((et) => (
                <SelectItem key={et.type} value={et.type}>
                  {et.type}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {stats?.eventTypes && (
        <div className="grid gap-6 md:grid-cols-2">
          <BarChart
            color="hsl(var(--chart-1))"
            data={stats.eventTypes.map((et) => ({
              type: et.type,
              count: et.count,
            }))}
            dataKey="count"
            description="Frequency of different analytics event types"
            title="Event Type Distribution"
            xAxisKey="type"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
          <CardDescription>Real-time stream of analytics events from your platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] space-y-2 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No events found</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {filterType === "all"
                    ? "No analytics events have been recorded yet"
                    : `No events of type "${filterType}" found`}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  key={event.id}
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="font-medium">{event.eventType}</div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                        {event.userId ? "Authenticated" : "Anonymous"}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {event.userId ? (
                        <span>
                          User:{" "}
                          <span className="font-mono text-xs">
                            {event.userId.substring(0, 8)}...
                          </span>
                        </span>
                      ) : (
                        "Anonymous user"
                      )}
                      {event.metadata?.puzzleId && (
                        <span className="ml-2">
                          • Puzzle:{" "}
                          <span className="font-mono text-xs">
                            {event.metadata.puzzleId.substring(0, 8)}...
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      {formatDateFns(new Date(event.timestamp), "MMM d, yyyy h:mm a")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
