import Link from "next/link"
import { Bike, Code2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bike className="size-4" />
          </span>
          Triathlon Tools
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Link href="#simulator" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Simulator
          </Link>
          <a
            href="https://github.com/miloknowles/triathlon-tools"
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <Code2 />
          </a>
        </nav>
      </div>
    </header>
  )
}
