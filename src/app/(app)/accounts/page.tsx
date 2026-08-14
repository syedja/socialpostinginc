import { ConnectAccounts } from "@/components/ConnectAccounts";

export const metadata = { title: "Connected accounts — Social Posting Inc." };

export default function AccountsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Connected accounts</h1>
      <p className="mt-1 text-sm text-muted">
        Link the social profiles you want to post to. You can add or remove networks anytime.
      </p>
      <div className="mt-6">
        <ConnectAccounts />
      </div>
    </div>
  );
}
