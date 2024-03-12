"use client";

import { Heading } from "@radix-ui/themes";

import useSWR from "swr";
import ResultsTable from "./table";
import YearSelect from "./YearSelect";
import { useEffect, useState } from "react";
import { Skeleton } from "@/app/ui/skeleton";
import Charts from "./charts";


export default function Page({ params }: { params: { slug: string } }) {
  const [year, setYear] = useState<string | null>(null);

  const fetcher = (url: string) => fetch(url, { mode: "cors" }).then((res) => res.json());

  const baseUrl = "https://raw.githubusercontent.com/miloknowles/triathlon-data/main/public";
  const races = useSWR(`${baseUrl}/races.json`, fetcher);

  const meta = races.data ? races.data[params.slug] : {};
  const raceName = meta?.name;

  const subevents = (meta.subevents || []);
  const years = subevents.map((e: any) => e.label);
  const selectedSubevent = subevents.find((e: any) => e.label === year);
  const subeventId = selectedSubevent?.id;

  useEffect(() => {
    if (!year && years.length > 0) {
      setYear(years[0]);
    }
  }, [years]);

  const { data, error, isLoading, isValidating } = useSWR(subeventId ? `${baseUrl}/results/${subeventId}.json` : null, fetcher);
  
  return (
    <div className="px-3 container max-w-screen-xl py-3 sm:py-9 min-h-screen">
      <div className="flex justify-center">
      {
        raceName ?
          <Heading size={{initial: "8", sm: "9"}} className="text-center mt-4">{raceName}</Heading> :
          <Skeleton className="w-[400px] h-[60px] rounded-full mt-4" />
      }
      </div>
      <div className="max-w-screen overflow-scroll">
        <YearSelect options={years} selected={year} setSelected={setYear} loading={years.length === 0}/>
      </div>

      <Heading size={{initial: "7", sm: "8"}} className="mt-9">Field Results</Heading>
      <Charts data={data?.data || []} loading={isLoading} name={raceName || "Results"} year={year || "YYYY"}/>

      <Heading size={{initial: "7", sm: "8"}} className="mt-9">Individual Results</Heading>
      <ResultsTable data={data?.data || []} />
    </div>
  )
}