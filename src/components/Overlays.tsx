"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { ease, tween } from "@/gl/react";
import { isAdminEmail } from "@/lib/admin";

interface OverlayProps {
  open: boolean;
  onEntered?: () => void;
  onExited?: () => void;
}

function useReveal(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parts = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    let cancelled = false;
    const timers: number[] = [];

    if (open) {
      setVisible(true);
      setShown(true);

      parts.forEach((p, i) => {
        const base = parseFloat(p.dataset.delay || "0");
        p.style.opacity = "0";
        p.style.transform = "translateY(0.8rem)";
        timers.push(
          window.setTimeout(() => {
            if (cancelled) return;
            tween(0, 1, 0.7, ease.expoOut, (v) => {
              p.style.opacity = String(v);
              p.style.transform = `translateY(${(1 - v) * 0.8}rem)`;
            }, undefined);
          }, base * 1000 + i * 35)
        );
      });
    } else if (shown || visible) {
      setShown(false);

      parts
        .slice()
        .reverse()
        .forEach((p, i) => {
          const startOpacity = parseFloat(p.style.opacity || "1");
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              tween(startOpacity, 0, 0.32, ease.expoOut, (v) => {
                p.style.opacity = String(v);
                p.style.transform = `translateY(${(1 - v) * 0.55}rem)`;
              }, undefined);
            }, i * 22)
          );
        });

      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setVisible(false);
        }, 390)
      );
    }

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [open, shown, visible]);

  return { ref, visible };
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" strokeLinejoin="round" />
      <path d="M19 16v6M16 19h6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-15 shrink-0 text-white/35 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/65" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-17" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5Z" strokeLinejoin="round" />
      <path d="M3.8 10h16.4" strokeLinecap="round" />
    </svg>
  );
}

function ProfileAction({
  children,
  icon,
  description,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group pointer-events-auto flex min-h-[64px] w-full items-center gap-13 rounded-[1.1rem] px-13 py-11 text-left text-white transition-colors duration-200 hover:bg-white/[0.055] active:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/60"
    >
      <span className="flex size-42 shrink-0 items-center justify-center rounded-full bg-white/[0.055] text-white/80 transition-colors group-hover:bg-white/[0.09]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-14 leading-18 tracking-[-0.025em]">{children}</span>
        {description && <span className="mt-3 block text-11 leading-15 text-white/45">{description}</span>}
      </span>
      <ChevronIcon />
    </button>
  );
}

export function ProfileOverlay({
  open,
  onClose,
  onMyProjects,
  onSmartEdit,
  onAdminTemplates,
  onWebsiteTemplates,
}: OverlayProps & {
  onClose: () => void;
  onMyProjects?: () => void;
  onMyTemplates?: () => void;
  onSmartEdit?: () => void;
  onAdminTemplates?: () => void;
  onWebsiteTemplates?: () => void;
}) {
  const { ref, visible } = useReveal(open);
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && !!session?.user;

  return (
    <div
      ref={ref}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/80 text-white backdrop-blur-md [touch-action:pan-y] s:flex s:items-center s:justify-center s:px-25 s:py-20"
      style={{ visibility: visible ? "visible" : "hidden" }}
    >
      <div
        data-reveal
        role="dialog"
        aria-modal="true"
        aria-labelledby="paper-stish-account-title"
        className="mx-auto flex min-h-[100dvh] w-full max-w-[36rem] flex-col bg-[#101010] px-20 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.6rem,env(safe-area-inset-top))] text-white s:min-h-0 s:max-h-[min(86dvh,800px)] s:overflow-y-auto s:rounded-[2rem] s:border s:border-white/10 s:px-28 s:pb-24 s:pt-25 s:shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-12 border-b border-white/10 pb-18">
          <div className="label text-white/90">PAPER STISH</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-10 text-11 font-medium tracking-[0.02em] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
          >
            CLOSE
          </button>
        </header>

        <main className="flex-1 pt-24">
          <p className="label text-white/45">YOUR ACCOUNT</p>
          <h2 id="paper-stish-account-title" className="mt-7 text-30 leading-[1.05] tracking-[-0.05em]">
            Account
          </h2>

          {signedIn ? (
            <section data-reveal aria-label="Signed-in account" className="mt-20 flex items-center gap-14 rounded-[1.55rem] border border-white/[0.07] bg-white/[0.045] p-15">
              <div className="size-52 shrink-0 overflow-hidden rounded-full bg-white/10">
                {session.user?.image ? (
                  <img src={session.user.image} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center"><UserIcon /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-16 leading-20 tracking-[-0.03em]">
                  {session.user?.name ?? "Paper Stish user"}
                </p>
                <p className="mt-5 break-words text-12 leading-16 text-white/50">
                  {session.user?.email ?? ""}
                </p>
                <p className="mt-8 text-10 font-medium uppercase tracking-[0.08em] text-white/35">Signed in with Google</p>
              </div>
            </section>
          ) : (
            <section data-reveal className="mt-20 rounded-[1.55rem] border border-white/[0.07] bg-white/[0.045] p-16 s:p-20">
              <div className="flex items-center gap-12">
                <div className="flex size-42 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white/75">
                  <UserIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-14 tracking-[-0.025em]">Make it yours</p>
                  <p className="mt-5 text-11 leading-15 text-white/50">
                    Sign in to keep your Smart Edit projects connected to your account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signIn("google")}
                className="mt-16 flex min-h-[48px] w-full items-center justify-center gap-9 rounded-full bg-white px-16 text-13 font-medium tracking-[-0.02em] text-black transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Continue with Google
              </button>
            </section>
          )}

          <section data-reveal className="mt-25">
            <h3 className="label text-white/45">CREATE &amp; MANAGE</h3>
            <div className="mt-9 rounded-[1.5rem] border border-white/[0.09] bg-white/[0.018] p-5">
              <ProfileAction
                icon={<SparkIcon />}
                description="Choose a starting point for your website"
                onClick={onWebsiteTemplates}
              >
                Website Templates
              </ProfileAction>
              {signedIn && (
                <>
                  <ProfileAction
                    icon={<SparkIcon />}
                    description="Design and customize from scratch"
                    onClick={onSmartEdit}
                  >
                    Smart Edit
                  </ProfileAction>
                  {isAdminEmail(session.user?.email) && (
                    <ProfileAction
                      icon={<SparkIcon />}
                      description="Publish templates for everyone"
                      onClick={onAdminTemplates}
                    >
                      Admin Templates
                    </ProfileAction>
                  )}
                  <ProfileAction
                    icon={<FolderIcon />}
                    description="Pick up where you left off"
                    onClick={onMyProjects}
                  >
                    My Projects
                  </ProfileAction>
                </>
              )}
            </div>
          </section>

          {signedIn && (
            <div data-reveal className="mt-18 border-t border-white/10 pt-13">
              <button
                type="button"
                onClick={() => signOut()}
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-12 text-12 text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
              >
                <span>Sign out</span>
                <span aria-hidden="true" className="text-15 text-white/30">↗</span>
              </button>
            </div>
          )}
        </main>

        <footer className="mt-24 shrink-0 border-t border-white/[0.08] pt-15 text-center">
          <nav aria-label="Legal and support" className="label flex flex-wrap items-center justify-center gap-x-7 gap-y-6 text-white/45">
            <a href="/privacy" className="min-h-[24px] transition-colors hover:text-white">Privacy</a>
            <span aria-hidden="true">•</span>
            <a href="/terms" className="min-h-[24px] transition-colors hover:text-white">Terms</a>
            <span aria-hidden="true">•</span>
            <a href="mailto:sandeepdolai.info@gmail.com" className="min-h-[24px] transition-colors hover:text-white">Support</a>
          </nav>
          <p className="mt-12 text-11 leading-15 font-medium tracking-[-0.01em] text-white/35">
            Making something personal should feel simple.
          </p>
        </footer>
      </div>
    </div>
  );
}

export function NewsletterOverlay({ open }: OverlayProps) {
  const { ref, visible } = useReveal(open);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-1/2 top-1/2 z-40 w-420 -translate-x-1/2 -translate-y-1/2 s:w-600"
      style={{ visibility: visible ? "visible" : "hidden" }}
    >
      <div className="absolute inset-x-20 top-1/2 flex -translate-y-1/2 flex-col items-center text-center text-white">
        <p data-reveal className="max-w-[30rem] text-14 leading-17 tracking-[-0.02em] s:max-w-[32.5rem]">
          Newsletter sign-ups aren&apos;t open yet. No email address is collected here.
        </p>
      </div>
    </div>
  );
}
