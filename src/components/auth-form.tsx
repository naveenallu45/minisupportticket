"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/ticket-constants";

type AuthMode = "login" | "register";

const clientAuthSchema = z.object({
  name: z.string().optional(),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

type AuthFormValues = z.infer<typeof clientAuthSchema>;

type AuthFormProps = {
  mode: AuthMode;
};

const defaultValues: AuthFormValues = {
  name: "",
  email: "",
  password: "",
};

export function AuthForm({ mode }: AuthFormProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(clientAuthSchema),
    defaultValues,
  });

  async function onSubmit(values: AuthFormValues) {
    if (isRegister) {
      const parsedRegistration = registerSchema.safeParse(values);

      if (!parsedRegistration.success) {
        const fieldErrors = parsedRegistration.error.flatten().fieldErrors;

        for (const [field, messages] of Object.entries(fieldErrors)) {
          const message = messages?.[0];

          if (message) {
            setError(field as keyof AuthFormValues, { message });
          }
        }

        toast.error("Please check the registration form");
        return;
      }

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedRegistration.data),
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.message ?? "Registration failed");
        return;
      }

      toast.success("Account created. Signing you in.");
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }

    window.location.assign(result?.url ?? callbackUrl);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
    <Card className="border-black/10 bg-background shadow-2xl shadow-black/10">
      <CardHeader className="space-y-5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-black text-white">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <CardTitle className="text-2xl tracking-tight">
            {isRegister ? "Create your workspace" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Start managing requests with a clean ticket workflow."
              : "Sign in to continue tracking support work."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                autoComplete="name"
                className="h-11 border-black/10 bg-muted/40"
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-11 border-black/10 bg-muted/40"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="h-11 border-black/10 bg-muted/40 pr-10"
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            {errors.password ? (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button className="h-11 w-full bg-black text-white hover:bg-black/90" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </CardContent>
    </Card>
    </motion.div>
  );
}
