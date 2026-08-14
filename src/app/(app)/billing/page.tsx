import { createClient } from "@/lib/supabase/server";
import { BillingPlans } from "@/components/BillingPlans";

export const metadata = { title: "Billing — Social Posting Inc." };

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, stripe_customer_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-muted">Choose a plan or manage your subscription.</p>
      <div className="mt-6">
        <BillingPlans
          currentPlan={sub?.plan ?? null}
          status={sub?.status ?? null}
          currentPeriodEnd={sub?.current_period_end ?? null}
          hasStripeCustomer={!!sub?.stripe_customer_id}
        />
      </div>
    </div>
  );
}
