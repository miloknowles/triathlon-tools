"use client";

import { BarChart, Button, Title } from '@tremor/react';

import { bin, quantile } from "d3-array";
import AgeGroupMultiSelect from "./AgeGroupMultiSelect";
import { DownloadIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Skeleton } from "@/app/ui/skeleton";
import { IronmanData } from "./types";


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


// https://stackoverflow.com/questions/20811131/javascript-remove-outliers-from-an-array
const filterOutliers = (data: number[]) => {
  const q1 = quantile(data, 0.25);
  const q3 = quantile(data, 0.75);
  if (q1 === undefined || q3 === undefined) return data;
  const iqr = q3 - q1;
  const min = q1 - 4 * iqr;
  const max = q3 + 4 * iqr;
  return data.filter((d) => d >= min && d <= max);
}


const HistogramChart = (
  { title, chartData, color, index, loading } : { title: string, chartData: {}[], color: string, index: "elapsed", loading?: boolean }
) => {
  return (
    <div className="mt-6">
      <Title className="text-center">{title}</Title>
      {
        loading ? 
          <Skeleton className="h-[180px] rounded-lg mt-2 mx-3"/> :
          <BarChart
            className="mt-2 h-[180px]"
            data={chartData}
            index={index}
            categories={["Number of people"]}
            colors={[color]}
            yAxisWidth={48}
            showLegend={false}
          />
      }
    </div>
  );
}


export default function Charts(
  { data, loading, name, year } : { data: IronmanData[], loading?: boolean, name: string, year: string }
) {
  const [ageGroups, setAgeGroups] = useState<string[]>(["overall"]);

  const finishers = data.filter((r: any) => r.EventStatus === 'Finish');
  const filtered = finishers.filter((r: any) => {
    if (ageGroups.includes("overall")) return true;
    else if (ageGroups.includes("m-overall") && r.AgeGroup.startsWith("M")) return true;
    else if (ageGroups.includes("f-overall") && r.AgeGroup.startsWith("F")) return true;
    else return ageGroups.includes(r.AgeGroup);
  });
  const finishTimesSec = filterOutliers(filtered.map((r: any) => r.FinishTime).filter((t: number) => t > 0));
  const swimTimesSec = filterOutliers(filtered.map((r: any) => r.SwimTime).filter((t: number) => t > 0));
  const bikeTimesSec = filterOutliers(filtered.map((r: any) => r.BikeTime).filter((t: number) => t > 0));
  const runTimesSec = filterOutliers(filtered.map((r: any) => r.RunTime).filter((t: number) => t > 0));
  const t1TimesSec = filterOutliers(filtered.map((r: any) => r.Transition1Time).filter((t: number) => t > 0));
  const t2TimesSec = filterOutliers(filtered.map((r: any) => r.Transition2Time).filter((t: number) => t > 0));

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

  const download = () => {
    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name} ${year}.json`;
    link.click();
  }
  
  return (
    <div>
      <div className="mt-6">
        <div className="flex gap-3 flex-row mt-6">
          <AgeGroupMultiSelect className="sm:ml-auto sm:max-w-[240px]" selected={ageGroups} onChange={setAgeGroups}/>
          <Button icon={DownloadIcon} className="hidden sm:flex" onClick={download}>Download</Button>
        </div>
      </div>
      <div className="grid md:grid-cols-2">
        <HistogramChart title="Finish Times" chartData={finishTimeChartData} color="blue" index={"elapsed"} loading={loading}/>
        <HistogramChart title="Swim Times" chartData={swimTimeChartData} color="blue" index={"elapsed"} loading={loading}/>
        <HistogramChart title="Bike Times" chartData={bikeTimeChartData} color="blue" index={"elapsed"} loading={loading}/>
        <HistogramChart title="Run Times" chartData={runTimeChartData} color="blue" index={"elapsed"} loading={loading}/>
        <HistogramChart title="T1 Times" chartData={t1TimeChartData} color="blue" index={"elapsed"} loading={loading}/>
        <HistogramChart title="T2 Times" chartData={t2TimeChartData} color="blue" index={"elapsed"} loading={loading}/>
      </div>
    </div>
  )
}