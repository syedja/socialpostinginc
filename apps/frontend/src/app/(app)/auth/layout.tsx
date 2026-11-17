import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { AttributionComponent } from '@gitroom/frontend/components/auth/attribution.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Toaster } from '@gitroom/react/toaster/toaster';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <MantineWrapper>
      <Toaster />
      <div className="bg-[#0E0E0E] flex flex-1 p-[12px] gap-[12px] min-h-screen w-screen text-white">
        {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
        <ReturnUrlComponent />
        <AttributionComponent />
        <div className="flex flex-col py-[40px] px-[20px] flex-1 lg:w-[600px] lg:flex-none rounded-[12px] text-white p-[12px] bg-[#1A1919]">
          <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-white">
            <LogoTextComponent />
            <div className="flex">{children}</div>
          </div>
        </div>
        <div className="text-[36px] flex-1 pt-[88px] hidden lg:flex flex-col items-center">
          <div className="text-center max-w-[620px] leading-[1.2]">
            Fresh posts for your business,
            <br />
            <span className="text-[#F2A65A]">every single day.</span>
          </div>
          <ul className="mt-[40px] flex flex-col gap-[18px] text-[18px] max-w-[520px] list-disc ps-[24px]">
            <li>Schedule Facebook, Instagram, Google Business Profile and more from one calendar</li>
            <li>AI captions written for local businesses</li>
            <li>14-day free trial, cancel anytime</li>
          </ul>
          <a
            className="mt-auto pb-[24px] text-[13px] underline opacity-70 hover:opacity-100"
            href={
              process.env.NEXT_PUBLIC_SOURCE_URL ||
              'https://github.com/syedja/socialpostinginc'
            }
            target="_blank"
            rel="noreferrer"
          >
            Open source (AGPL-3.0), built on Postiz. Source code
          </a>
        </div>
      </div>
    </MantineWrapper>
  );
}
