"use client";

import { Separator } from "@radix-ui/themes";
import { useState } from "react";
import Toolbar from "./components/toolbar";
import ResultsDisplay from "./components/ResultsDisplay";
import FAQs from "./components/FAQs";

export default function Tool() {
  const [units, setUnits] = useState<"imperial" | "metric">("metric");

  return (
    <div className="container max-w-screen-2xl min-h-screen py-9 gap-8 flex flex-col">
      <Toolbar units={units} setUnits={setUnits}/>
      <Separator size="4"/>
      <ResultsDisplay units={units}/>
      <FAQs/>
    </div>
  );
}