"use client";

import { Heading } from "@radix-ui/themes";

import { BarChart, Card, Title } from '@tremor/react';

import useSWR from "swr";
import { bin } from "d3-array";


const convertSecondsToTime = (seconds: number) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
}


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
        className="mt-2"
        data={chartData}
        index={index}
        categories={['count']}
        colors={[color]}
        yAxisWidth={48}
      />
    </div>
  );
}


export default function Page({ params }: { params: { slug: string } }) {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const resultsId = "demo";
  const { data, error, isLoading } = useSWR(`/results/${resultsId}.json`, fetcher);

  const raceName = "70.3 Santa Cruz 🇺🇸";

  const finishers = (data?.data || []).filter((r: any) => r.EventStatus === 'Finish');
  const finishTimesSec = finishers.map((r: any) => r.FinishTime).filter((t: number) => t > 0);
  const swimTimesSec = finishers.map((r: any) => r.SwimTime).filter((t: number) => t > 0);
  const bikeTimesSec = finishers.map((r: any) => r.BikeTime).filter((t: number) => t > 0);
  const runTimesSec = finishers.map((r: any) => r.RunTime).filter((t: number) => t > 0);

  const finishBinWidthMins = 10;
  const swimBinWidthMins = 1;
  const bikeBinWidthMins = 2.5;
  const runBinWidthMins = 2.5;

  const finishTimeSecBins = generateHistogram(finishTimesSec, 60*finishBinWidthMins);
  const swimTimesSecBins = generateHistogram(swimTimesSec, 60*swimBinWidthMins);
  const bikeTimesSecBins = generateHistogram(bikeTimesSec, 60*bikeBinWidthMins);
  const runTimesSecBins = generateHistogram(runTimesSec, 60*runBinWidthMins);

  const finishTimeChartData = finishTimeSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    count: bin.length,
  }));

  const swimTimeChartData = swimTimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    count: bin.length,
  }));

  const bikeTimeChartData = bikeTimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    count: bin.length,
  }));

  const runTimeChartData = runTimesSecBins.map((bin: any) => ({
    elapsed: convertSecondsToTime(bin.x0),
    count: bin.length,
  }));
  
  return (
    <div className="container max-w-screen-2xl py-5 min-h-screen">
      <Heading size="8">{raceName}</Heading>
      <div className="grid md:grid-cols-2">
        <HistogramChart title="Finish Times" chartData={finishTimeChartData} color="gray" index={"elapsed"}/>
        <HistogramChart title="Swim Times" chartData={swimTimeChartData} color="indigo" index={"elapsed"} />
        <HistogramChart title="Bike Times" chartData={bikeTimeChartData} color="teal" index={"elapsed"}/>
        <HistogramChart title="Run Times" chartData={runTimeChartData} color="rose" index={"elapsed"}/>
      </div>
    </div>
  )
}