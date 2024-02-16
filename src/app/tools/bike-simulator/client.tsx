"use client";

import { Separator } from "@radix-ui/themes";
import { useState } from "react";
import Toolbar from "./toolbar";
import ResultsDisplay from "./ResultsDisplay";
import FAQs from "./FAQs";

export default function Tool() {
  const [units, setUnits] = useState<"imperial" | "metric">("metric");

  return (
    <main className="container max-w-screen-2xl min-h-screen py-5 gap-8 flex flex-col">
      <Toolbar units={units} setUnits={setUnits}/>
      <Separator size="4"/>
      <ResultsDisplay units={units}/>
      <FAQs/>
    </main>
  );
}