"use client";

import { Heading } from "@radix-ui/themes";

import { BarChart, Button, Card, Title } from '@tremor/react';

import { SearchSelect, SearchSelectItem } from '@tremor/react';

import useSWR from "swr";
import { bin } from "d3-array";
// import { Button } from "@/components/ui/button";
import ResultsTable from "./table";
import Link from "next/link";
import AgeGroupMultiSelect from "./AgeGroupMultiSelect";
import { DownloadIcon } from "@radix-ui/react-icons";
import YearSelect from "./YearSelect";
import { useState } from "react";


const convertSecondsToTime = (seconds: number) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
}


// https://d3js.org/d3-array/bin#bin_thresholds
const generateHistogram = (data: number[], binWidth: number) => {
  const min = data.length > 0 ? Math.min(...data) : 0;
  const max = data.length > 0 ? Math.max(...data) : 1;
  
  const minVal = Math.floor(min / binWidth) * binWidth;
  const maxVal = Math.ceil(max / binWidth) * binWidth;

  const thresholds = [];
  for (let t = minVal; t <= maxVal; t += binWidth) {
    thresholds.push(t);
  }
  const histGenerator = bin().domain([minVal, maxVal]).thresholds(thresholds);
  const bins = histGenerator(data.filter((d) => d !== null && d !== undefined && !isNaN(d)));
  return bins;
}


const HistogramChart = (
  { title, chartData, color, index } : { title: string, chartData: {}[], color: string, index: "elapsed" }
) => {
  return (
    <div className="mt-6">
      <Title>{title}</Title>
      <BarChart
        className="mt-2 h-[180px]"
        data={chartData}
        index={index}
        categories={["Number of people"]}
        colors={[color]}
        yAxisWidth={48}
        showLegend={false}
      />
    </div>
  );
}


export default function Page({ params }: { params: { slug: string } }) {
  const [year, setYear] = useState("2023");
  const years = ["2023", "2022", "2021"];

  const fetcher = (url: string) => fetch(url, { mode: "cors" }).then((res) => res.json());

  const resultsId = "demo";
  // const { data, error, isLoading } = useSWR(`/results/${resultsId}.json`, fetcher);

  // const baseUrl = "https://github.com/miloknowles/triathlon-data/blob/main/public"
  const baseUrl = "https://raw.githubusercontent.com/miloknowles/triathlon-data/main/public";
  const { data, error, isLoading } = useSWR(`${baseUrl}/results/im703-santa-cruz-2023.json`, fetcher);

  const raceName = "70.3 Santa Cruz 🇺🇸";

  const finishers = (data?.data || []).filter((r: any) => r.EventStatus === 'Finish');
  const finishTimesSec = finishers.map((r: any) => r.FinishTime).filter((t: number) => t > 0);
  const swimTimesSec = finishers.map((r: any) => r.SwimTime).filter((t: number) => t > 0);
  const bikeTimesSec = finishers.map((r: any) => r.BikeTime).filter((t: number) => t > 0);
  const runTimesSec = finishers.map((r: any) => r.RunTime).filter((t: number) => t > 0);
  const t1TimesSec = finishers.map((r: any) => r.Transition1Time).filter((t: number) => t > 0);
  const t2TimesSec = finishers.map((r: any) => r.Transition2Time).filter((t: number) => t > 0);

  const finishBinWidthMins = 5;
  const swimBinWidthMins = 1;
  const bikeBinWidthMins = 2.5;
  const runBinWidthMins = 2.5;
  const transitionBinWidthMins = 0.5;

  const finishTimeSecBins = generateHistogram(finishTimesSec, 60*finishBinWidthMins);
  const swimTimesSecBins = generateHistogram(swimTimesSec, 60*swimBinWidthMins);
  const bikeTimesSecBins = generateHistogram(bikeTimesSec, 60*bikeBinWidthMins);
  const runTimesSecBins = generateHistogram(runTimesSec, 60*runBinWidthMins);
  const t1TimesSecBins = generateHistogram(t1TimesSec, 60*transitionBinWidthMins);
  const t2TimesSecBins = generateHistogram(t2TimesSec, 60*transitionBinWidthMins);

  const finishTimeChartData = finishTimeSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    "Number of people": bin.length,
  }));

  const swimTimeChartData = swimTimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    "Number of people": bin.length,
  }));

  const bikeTimeChartData = bikeTimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    "Number of people": bin.length,
  }));

  const runTimeChartData = runTimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    "Number of people": bin.length,
  }));

  const t1TimeChartData = t1TimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    "Number of people": bin.length,
  }));

  const t2TimeChartData = t2TimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    "Number of people": bin.length,
  }));
  
  return (
    <div className="container max-w-screen-xl py-9 min-h-screen">
      <Heading size="9" className="text-center mt-4">{raceName}</Heading>
      <YearSelect options={years} selected={year} setSelected={setYear}/>
      {/* <Link href="https://www.ironman.com/im703-santa-cruz-results" target="_blank" className="text-center">Race Page</Link> */}
      <Heading size="8" className="mt-9">Field Results</Heading>
      <div className="mt-6">
        <div className="flex gap-3 flex-row mt-6">
          <AgeGroupMultiSelect className="ml-auto max-w-[240px]"/>
          <Button icon={DownloadIcon}>Download</Button>
        </div>
      </div>
      <div className="grid md:grid-cols-2">
        <HistogramChart title="Finish Times" chartData={finishTimeChartData} color="blue" index={"elapsed"}/>
        <HistogramChart title="Swim Times" chartData={swimTimeChartData} color="blue" index={"elapsed"} />
        <HistogramChart title="Bike Times" chartData={bikeTimeChartData} color="blue" index={"elapsed"}/>
        <HistogramChart title="Run Times" chartData={runTimeChartData} color="blue" index={"elapsed"}/>
        <HistogramChart title="T1 Times" chartData={t1TimeChartData} color="blue" index={"elapsed"}/>
        <HistogramChart title="T2 Times" chartData={t2TimeChartData} color="blue" index={"elapsed"}/>
      </div>

      <Heading size="8" className="mt-9">Individual Results</Heading>
      <ResultsTable data={data?.data || []} />
    </div>
  )
}