import Footer from "@/components/Footer";
import { Avatar, Container, Flex, Grid, Heading, Section } from "@radix-ui/themes";

import { Metadata } from "next";
import Link from "next/link";
import React from "react";


export const metadata: Metadata = {
  title: 'Triathlon Tools',
  description: "Tools for data-driven training and racing.",
}


const MenuCard = (props: { t: string, d: string, abbrev: string, color?: string, href: string }) => (
  <Link href={props.href}>
  <button
    className="
      flex gap-4 items-center text-left select-none space-y-1 p-3 max-w-[450px]
      rounded-xl leading-none no-underline outline-none
      transition-colors hover:bg-accent hover:text-accent-foreground
    "
  >
    {/* @ts-ignore */}
    <Avatar fallback={props.abbrev} size="6" color={props.color || "indigo"} style={{zIndex: 0}}/>
    <div className="flex flex-col gap-2">
      <div className="text-md font-medium leading-none">{props.t}</div>
      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
        {props.d}
      </p>
    </div>
  </button>
  </Link>
);



export default function Page() {
  return (
    <main className="min-h-screen">
      <Section size={{initial: "1", md: "2", lg: "3"}}>
        <Container className="px-3 sm:px-6 container max-w-screen-2xl">
          <Flex direction="column" gap="4" className="max-w-lg">
            <Heading size={{initial: "8", sm: "9"}}>Triathlon Tools</Heading>
            <p>
              If you have suggestions, feedback, or bugs, please <a href="mailto:miloknowles97@gmail.com" className="text-primary">let me know.</a>
            </p>
            <p>
              If you'd like to contribute to this open-source project, check out the <a className="text-primary" href="https://github.com/miloknowles/triathlon-tools">repository on Github.</a>
            </p>
          </Flex>
          <Grid columns={{initial: "1", md: "1"}} mt="6" gap="6">
            <MenuCard
              href="/tools/bike-simulator"
              abbrev="BSP"
              color="green"
              t="Bike Split Simulator"
              d="Predict your finish time on a bike course using a physics simulator"
            />
            <MenuCard
              href="/results"
              abbrev="IRR"
              color="blue"
              t="Ironman Race Results"
              d="Analyze past race results from Ironman events"
            />
          </Grid>
        </Container>
      </Section>
    </main>
  );
}