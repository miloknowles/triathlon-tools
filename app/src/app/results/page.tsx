import { Heading } from "@radix-ui/themes";

import { Metadata } from "next";
import Link from "next/link";
import React from "react";


export const metadata: Metadata = {
  title: 'Race Results',
  description: "Analyze past race results from Ironman events.",
}

export default function Page() {
  return (
    <div className="container max-w-screen-xl py-9 min-h-screen">
      <Heading size="9" className="mt-4">Race Results</Heading>
    </div>
  )
}