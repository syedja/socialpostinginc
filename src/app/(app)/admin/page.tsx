import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/access";
import { ButtonLink, Card } from "@/components/ui";

export const metadata = { title: "Clients — Social Posting Inc." };

/**
 * Admin-only: the Managed-plan workflow. Lists every customer with their plan
 * so you (or a future VA) can compose and schedule on a client's behalf.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const admin = createServiceClient();
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("id, email, full_name, timezone, created_at").order("created_at", { ascending: false }),
    admin.from("subscriptions").select("user_id, plan, status"),
  ]);

  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-muted">
        Managed-plan workflow: open a client to compose and schedule posts on their behalf.
      </p>

      <div className="mt-6 space-y-3">
        {(profiles ?? []).map((p) => {
          const sub = subByUser.get(p.id);
          const isManaged = sub?.plan === "managed";
          const activeSub = sub?.status === "active" || sub?.status === "trialing";
          return (
            <Card key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.full_name || p.email}</p>
                <p className="truncate text-xs text-muted">{p.email} · {p.timezone}</p>
                <div className="mt-1.5 flex gap-1.5">
                  {sub ? (
                    <>
                      <span className={isManaged ? "rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand" : "rounded-full bg-canvas px-2 py-0.5 text-xs text-muted"}>
                        {isManaged ? "Managed $399" : "Self-Serve $29"}
                      </span>
                      <span className={activeSub ? "rounded-full bg-success-soft px-2 py-0.5 text-xs text-success" : "rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger"}>
                        {sub.status}
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">No subscription yet</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <ButtonLink href={`/compose?client=${p.id}`} variant={isManaged ? "primary" : "secondary"} size="sm">
                  Compose for client
                </ButtonLink>
              </div>
            </Card>
          );
        })}
        {!profiles?.length && (
          <Card className="p-10 text-center text-sm text-muted">No customers yet. They'll appear here after signup.</Card>
        )}
      </div>
    </div>
  );
}
