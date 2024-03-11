"use client";

import { Heading } from "@radix-ui/themes";

import React from "react";
import RaceTable from "./RaceTable";
import useSWR from "swr";


export default function Client() {
  const fetcher = (url: string) => fetch(url, { mode: "cors" }).then((res) => res.json());

  const baseUrl = "https://raw.githubusercontent.com/miloknowles/triathlon-data/main/public";
  const { data, isLoading, error } = useSWR(`${baseUrl}/races.json`, fetcher);

  const races: { id: string, name: string, series: string, subevents: any[] }[] = Object.values(data || {});
  races.sort((a: any, b: any) => a.name.localeCompare(b.name));

  return (
    <div className="px-4 sm:px-6 container max-w-screen-xl py-4 sm:py-9 min-h-screen">
      <Heading size="8">Race Results</Heading>
      <RaceTable data={races || []}/>
    </div>
  )
}