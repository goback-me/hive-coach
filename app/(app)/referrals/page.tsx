import { prisma } from "@/lib/prisma";
import { createReferral, createReferralLink, updateReferralStage } from "@/lib/actions";
import ReferralBoard from "@/components/ReferralBoard";
import AddReferralModal from "./AddReferralModal";
import ReferralLinkManager from "./ReferralLinkManager";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const [referrals, links] = await Promise.all([
    prisma.referral.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.referralLink.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const referralData = referrals.map((r) => ({
    id: r.id,
    name: r.name,
    source: r.source,
    note: r.note,
    stage: r.stage,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="p-10 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Referrals</h1>
          <p style={{ color: "var(--text-secondary)" }}>Warm intros from group chats, DMs and friends — drag through the pipeline.</p>
        </div>
        <div className="flex gap-3">
          <ReferralLinkManager
            links={links.map((l) => ({ id: l.id, code: l.code, label: l.label }))}
            action={createReferralLink}
          />
          <AddReferralModal action={createReferral} />
        </div>
      </div>

      <ReferralBoard initialReferrals={referralData} onMove={updateReferralStage} />
    </div>
  );
}
