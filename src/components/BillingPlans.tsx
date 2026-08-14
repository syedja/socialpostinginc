"use client";

import { useState } from "react";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { Button, Card } from "@/components/ui";

export function BillingPlans({
  currentPlan,
  status,
  currentPeriodEnd,
  hasStripeCustomer,
}: {
  currentPlan: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: PlanKey) {
    setBusy(plan);
    setError(null);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not start checkout");
      setBusy(null);
      return;
    }
    window.location.href = data.url;
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not open the billing portal");
      setBusy(null);
      return;
    }
    window.location.href = data.url;
  }

  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const daysLeft =
    isTrialing && currentPeriodEnd
      ? Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  return (
    <div>
      {isTrialing && (
        <Card className="mb-6 p-5">
          <p className="text-sm font-medium">
            <span className="mr-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">Free trial</span>
            {daysLeft !== null && daysLeft > 0
              ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
              : "Your trial ends today"}
            {currentPlan && ` · trying the ${PLANS[currentPlan as PlanKey]?.name ?? currentPlan} features`}
          </p>
          <p className="mt-1 text-xs text-muted">
            No card on file yet. Pick a plan below whenever you're ready — you'll keep whatever's left of your trial.
          </p>
        </Card>
      )}

      {isActive && (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              Current plan: {currentPlan ? PLANS[currentPlan as PlanKey]?.name ?? currentPlan : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted">Manage payment method, invoices, or cancel anytime.</p>
          </div>
          {hasStripeCustomer && (
            <Button variant="secondary" onClick={openPortal} disabled={busy === "portal"}>
              {busy === "portal" ? "Opening…" : "Manage billing"}
            </Button>
          )}
        </Card>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {(Object.entries(PLANS) as [PlanKey, (typeof PLANS)[PlanKey]][]).map(([key, plan]) => {
          const isCurrent = isActive && currentPlan === key;
          return (
            <Card key={key} className={key === "managed" ? "border-brand p-6" : "p-6"}>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-semibold">${plan.price}</span>
                <span className="text-muted">/month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-0.5 text-success" aria-hidden>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                variant={key === "managed" ? "primary" : "secondary"}
                onClick={() => checkout(key)}
                disabled={!!busy || isCurrent}
              >
                {isCurrent ? "Your current plan" : busy === key ? "Redirecting…" : "Choose " + plan.name}
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-faint">
        Your 14-day free trial starts the moment you sign up — no card required. Add payment details anytime to keep publishing after it ends.
      </p>
    </div>
  );
}
