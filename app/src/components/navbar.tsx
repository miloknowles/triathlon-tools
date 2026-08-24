import Link from "next/link"
import { Bike } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[88rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bike className="size-4" />
          </span>
          Triathlon Tools
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Link href="#simulator" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Bike Split Predictor
          </Link>
          <a
            href="https://github.com/miloknowles/triathlon-tools"
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.8 5.4-5.5 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .7Z" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  )
}
