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
    const email = `${studentId.trim().toLowerCase()}@hostel.local`;
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && studentId.trim().toLowerCase() === "admin") {
      // Auto-trigger setup endpoint if admin doesn't exist yet
      try {
        const setupRes = await fetch("/api/setup", { method: "POST" });
        if (setupRes.ok) {
          const retry = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!retry.error) {
            data = retry.data;
            error = null;
          }
        }
      } catch (e) {
        // Continue to error check below
      }
    }

    if (error) {
      toast.error("Invalid ID or password. If logging in as admin for the first time, click 'Initialize / Reset Admin Account' below.");
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
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-full"
            style={{ fontSize: "0.8rem" }}
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch("/api/setup");
                let data;
                try {
                  data = await res.json();
                } catch {
                  toast.error("Failed to parse setup API response.");
                  setLoading(false);
                  return;
                }
                if (res.ok && data.success) {
                  toast.success("Admin account created/reset! Log in with ID: admin / Password: admin@123");
                  setStudentId("admin");
                  setPassword("admin@123");
                } else {
                  toast.error(data.error || data.details || "Setup failed. Check .env.local configuration.");
                }
              } catch (e: any) {
                toast.error(e?.message || "Failed to connect to setup API.");
              } finally {
                setLoading(false);
              }
            }}
          >
            ⚡ Initialize / Reset Admin Account
          </button>

          <p className="text-muted text-xs" style={{ marginTop: 12 }}>
            Forgot your password? Contact the hostel admin.
          </p>
        </div>
      </div>
    </div>
  );
}
