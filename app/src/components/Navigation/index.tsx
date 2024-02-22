"use client";

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Button } from "../ui/button"
import { Cross1Icon, GitHubLogoIcon, HamburgerMenuIcon } from "@radix-ui/react-icons"
import { Container, Flex, Heading, IconButton, Section } from "@radix-ui/themes"


const tools: { title: string; href: string; description: string }[] = [
  {
    title: "🚲 Bike Split Simulator",
    href: "/tools/bike-simulator",
    description: "Predict your finish time on a bike course using a physics simulator",
  },
];


export default function Navigation() {
  const [open, setOpen] = React.useState(false);

  const onClickLink = () => {
    setOpen(false);
  }

  return (
    // Can make this "sticky" if desired.
    <header className="top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex container max-w-screen-2xl items-center justify-between">
        <NavigationMenu className="hidden sm:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Tools</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[200px] gap-3 p-4 sm:w-[350px] ">
                  {tools.map((component) => (
                    <ListItem
                      key={component.title}
                      title={component.title}
                      href={component.href}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <nav className="flex items-center gap-3 py-3 z-[4001] ml-auto">
          <Link href="https://github.com/miloknowles/triathlon-tools" target="_blank">
            <Button size="sm" variant="ghost">
              <GitHubLogoIcon/>
            </Button>
          </Link>
          <Link href="mailto:miloknowles97@gmail.com">
            <Button size="sm" variant="secondary">
              Feedback
            </Button>
          </Link>
        </nav>
        
        {/* <nav className="flex sm:hidden z-[4001]">
          <IconButton size="2" variant="ghost" onClick={() => setOpen(!open)}>
            {
              open ?
                <Cross1Icon width="24" height="24"/> :
                <HamburgerMenuIcon width="24" height="24"/>
            }
          </IconButton>
        </nav> */}

        {/* <div data-open={open} className="
          fixed top-0 right-0 z-[4000] bg-background w-screen h-screen
          opacity-0 data-[open=true]:opacity-100 pointer-events-none
          data-[open=true]:pointer-events-auto transition-opacity
        ">
          <nav style={{display: open ? "inherit" : "none"}}>
            <div className="container max-w-screen-2xl py-[80px]">
              <Flex direction="column" gap="6">
                <Link href="/">
                  <Heading>Overview</Heading>
                </Link>
                <Link href="/tools/bike-simulator">
                  <Heading>Bike Split Simulator</Heading>
                </Link>
              </Flex>
            </div>
          </nav>
        </div> */}
      </div>
    </header>
  )
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-xl p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"
