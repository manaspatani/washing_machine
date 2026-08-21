"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim() || !password) return;

    setLoading(true);
    const supabase = createClient();
    let email = `${studentId.trim().toLowerCase()}@hostel.local`;
    if (studentId.trim().toLowerCase() === "admin") {
      email = "admin_hostel@hostel.local";
    }

    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && studentId.trim().toLowerCase() === "admin") {
      // Try fallback to legacy admin@hostel.local email first
      const fallback = await supabase.auth.signInWithPassword({
        email: "admin@hostel.local",
        password,
      });
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      } else {
        // Auto-trigger setup endpoint if admin needs account initialization
        try {
          await fetch("/api/setup", { method: "POST" });
          const retry = await supabase.auth.signInWithPassword({
            email: "admin_hostel@hostel.local",
            password,
          });
          if (!retry.error) {
            data = retry.data;
            error = null;
          }
        } catch (e) {
          // Continue to error check below
        }
      }
    }

    if (error) {
      toast.error("Invalid ID or password.");
      setLoading(false);
      return;
    }

    if (!data?.user) {
      toast.error("User not found after sign in.");
      setLoading(false);
      return;
    }

    // Check role to redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, is_blocked")
      .eq("id", data.user.id)
      .single();

    if (profile?.is_blocked) {
      await supabase.auth.signOut();
      toast.error("Your account has been blocked. Contact the hostel admin.");
      setLoading(false);
      return;
    }

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      toast.error("Your account is inactive. Contact the hostel admin.");
      setLoading(false);
      return;
    }

    toast.success("Login successful!");

    if (profile?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard/book");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🧺</span>
          <h1>Mewad Jain Hostel</h1>
          <p>Washing Machine Booking</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="studentId">Student / Admin ID</label>
            <input
              id="studentId"
              type="text"
              className="form-control"
              placeholder="e.g. 201A or admin"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              autoCapitalize="characters"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p className="text-muted text-xs">
            Forgot your password? Contact the hostel admin.
          </p>
        </div>
      </div>
    </div>
  );
}
