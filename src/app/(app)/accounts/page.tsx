import { Suspense } from "react";
import { ConnectAccounts } from "@/components/ConnectAccounts";

export const metadata = { title: "Connected accounts — Social Posting Inc." };

export default function AccountsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Connected accounts</h1>
      <p className="mt-1 text-sm text-muted">
        Connect the Facebook Pages, Instagram accounts and Google Business locations you want to post to.
      </p>
      <div className="mt-6">
        <Suspense>
          <ConnectAccounts />
        </Suspense>
      </div>
    </div>
  );
}
