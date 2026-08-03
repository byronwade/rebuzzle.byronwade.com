"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { safeJsonParse } from "@/lib/utils";
import type { AdminStats, BlogPost, Puzzle, Tab, User } from "./admin-dashboard-types";

export function useAdminDashboard() {

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
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, router, toast]);

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

  const fetchPuzzles = async (page = 1) => {
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

  };

  const fetchBlogs = async (page = 1) => {
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

  };

  const fetchUsers = async (page = 1) => {
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

  };

  const fetchAnalytics = async () => {
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

  };

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

  return {
    loading, isAdmin, activeTab, setActiveTab, stats, statsLoading,
    puzzles, puzzlesLoading, puzzlePage, puzzleTotalPages, editingPuzzle, setEditingPuzzle,
    creatingPuzzle, setCreatingPuzzle, blogs, blogsLoading, blogPage, blogTotalPages,
    editingBlog, setEditingBlog, creatingBlog, setCreatingBlog, users, usersLoading,
    userPage, userTotalPages, analyticsEvents, analyticsLoading,
    deletePuzzleDialog, setDeletePuzzleDialog, deleteBlogDialog, setDeleteBlogDialog,
    deleteUserDialog, setDeleteUserDialog, user, fetchPuzzles, fetchBlogs, fetchUsers,
    handleStatsRefresh, handleSavePuzzle, handleDeletePuzzleClick, handleDeletePuzzle,
    handleSaveBlog, handleDeleteBlogClick, handleDeleteBlog,
    handleDeleteUserClick, handleDeleteUser, handleSendPasswordReset,
  };
}
