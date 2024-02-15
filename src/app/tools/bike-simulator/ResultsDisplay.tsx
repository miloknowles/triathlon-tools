"use client";

import { CalloutRoot, CalloutText, Card, Code, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { AreaChart, LineChart, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Title } from "@tremor/react";

import useSWR from "swr"
import { Results } from "./types";
import MetricCard from "./MetricCard";
import { Button } from "@/components/ui/button";


const metersPerSecToMph = 2.23694;
const metersPerSecToKmPerHr = 3.6;
const metersToFt = 3.28084;
const metersToMi = 0.621371 / 1000;


interface IResultsDisplayProps {
  units: "imperial" | "metric"
}


const average = (array: any[]) => array.length === 0 ? 0 : array.reduce((a, b) => a + b) / array.length;


export default function ResultsDisplay({ units } : IResultsDisplayProps) {
  // This will initially fetch nothing, but see data in the cache once it's fetched.
  const { data, error } = useSWR<Results>('/api/simulate');

  if (!data || !data.states || data.states.length === 0) {
    console.error("No data from simulator, rendering nothing.");
    return <></>;
  }

  // @ts-ignore
  const detail = data.detail;
  if (detail) {
    console.error(detail);
    return (<CalloutRoot color="red">
      {/* @ts-ignore */}
      <CalloutText>Something went wrong! 👀</CalloutText>
    </CalloutRoot>)
  }

  const createDownload = (event: React.MouseEvent) => {
    const downloadTarget = document.getElementById("download-target");
    const content = 'data:text/json;charset=utf-8,' + JSON.stringify(data.states);
    const encoded = encodeURI(content);

    if (!downloadTarget) return;

    downloadTarget.setAttribute('href', encoded);
    downloadTarget.setAttribute('download', `${data.meta.courseName}.json`);
    downloadTarget.setAttribute('target', '_blank');
    downloadTarget.click();
  }

  const errors = data.errors;

  const elapsed = data.states.at(-1)?.t || 0;
  const elapsedH = Math.floor(elapsed / 3600);
  const elapsedM = Math.floor((elapsed - elapsedH*3600) / 60);
  const elapsedS = Math.floor(elapsed % 60);

  const avgSpeedMetersPerSec = average(data.states.map(v => v.v));

  const avgSpeed = avgSpeedMetersPerSec * (units === "metric" ? 3.6 : 2.23694);
  const totalGain = data.meta.totalGainMeters * (units === "metric" ? 1 : 3.28084);

  const predFinish = `${elapsedH.toLocaleString("default", { minimumIntegerDigits: 2 })}:${elapsedM.toLocaleString("default", { minimumIntegerDigits: 2 })}:${elapsedS.toLocaleString("default", { minimumIntegerDigits: 2 })}`;

  // Convert units as needed.
  const chartData = data.states.map(v => ({
    t: new Date(v.t * 1000).toISOString().slice(11, 19),
    x: units === "imperial" ? (v.x * metersToMi) : v.x / 1000,
    v: units === "imperial" ? (v.v * metersPerSecToMph) : v.v * metersPerSecToKmPerHr,
    alt: units === "imperial" ? v.alt * metersToFt : v.alt,
    P_drag: v.v * v.F_drag,
    P_roll: v.v * v.F_roll,
    P_grav: v.v * v.F_grav,
  }));
  
  const avgDragLosses = chartData.map(v => v.P_drag).reduce((a, b) => a + b) / chartData.length;
  const avgRollLosses = chartData.map(v => v.P_roll).reduce((a, b) => a + b) / chartData.length;
  const avgGravLosses = chartData.map(v => v.P_grav).reduce((a, b) => a + b) / chartData.length;

  const warningOverride = errors?.includes("override_power") ?
    <CalloutRoot mt="4" color="gray">
      <CalloutText>
        <strong>Warning:</strong> Had to go above target power at <Code>{errors.filter(v => v === "override_power").length}</Code> timesteps to make it up a steep hill.
      </CalloutText>
    </CalloutRoot> : undefined;

  const tableData = [
    {
      title: "Predicted finish",
      value: predFinish,
      units: "elapsed"
    },
    {
      title: "Average speed",
      value: avgSpeed.toLocaleString("default", { maximumFractionDigits: 1 }),
      units: units === "metric" ? "km/hr" : "mph"
    },
    {
      title: "Total elevation gain",
      value: totalGain.toLocaleString("default", { maximumFractionDigits: 0 }),
      units: units === "metric" ? "m" : "ft"
    },
    {
      title: "Average drag losses",
      value: avgDragLosses.toLocaleString("default", { maximumFractionDigits: 1 }),
      units: "watts",
    },
    {
      title: "Average rolling losses",
      value: avgRollLosses.toLocaleString("default", { maximumFractionDigits: 1 }),
      units: "watts",
    },
  ];

  return (
    <Flex direction="column" align="start" className="w-full" gap="6">
      <Flex direction="column" className="w-full" align="start">
        <Flex className="w-full">
          <Heading size="7">Results</Heading>
          <a className="hidden" id="download-target"/>
          <Button
            className="ml-auto"
            onClick={createDownload}
          >
            Download raw data
          </Button>
        </Flex>
        {/* <Text size="1" className="text-muted-foreground">
          Simulated <Code>{data.meta.computeIters || "N/A"}</Code> timesteps
          in <Code>{data.meta.computeSec.toLocaleString("default", {maximumFractionDigits: 2}) || "N/A"} seconds</Code>
        </Text> */}
        {warningOverride}
      </Flex>

      {/* Mobile only */}
      <Card className="sm:hidden">
        <Table className="p-0">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Metric</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
              <TableHeaderCell>Units</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((item) => (
              <TableRow key={item.title}>
                <TableCell>
                  {item.title}
                </TableCell>
                <TableCell>
                  <Text>{item.value}</Text>
                </TableCell>
                <TableCell>
                  <Text>{item.units}</Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      
      {/* Non-mobile only */}
      <Grid gap={{initial: "4", lg: "6"}} columns={{initial: "1", sm: "3", md: "5"}} className="hidden sm:grid">
        <MetricCard title="Predicted finish" value={predFinish} units="elapsed"/>
        <MetricCard title="Average speed" value={avgSpeed.toLocaleString("default", { maximumFractionDigits: 1 })} units={units === "metric" ? "km/hr" : "mph"}/>
        <MetricCard title="Total elevation gain" value={totalGain.toLocaleString("default", { maximumFractionDigits: 0 })} units={units === "metric" ? "m" : "ft"}/>
        <MetricCard title="Average drag losses" value={avgDragLosses.toLocaleString("default", { maximumFractionDigits: 1 })} units="watts"/>
        <MetricCard title="Average rolling losses" value={avgRollLosses.toLocaleString("default", { maximumFractionDigits: 1 })} units="watts"/>
        {/* <MetricCard title="Average gravity losses" value={avgGravLosses.toLocaleString("default", { maximumFractionDigits: 1 })} units="watts"/> */}
      </Grid>

      <Card className="w-full">
        <Title className="pl-2">Elevation</Title>
        <AreaChart
          className="h-48 mb-2"
          data={chartData}
          index="t"
          categories={["alt"]}
          colors={["gray"]}
          yAxisWidth={60}
          connectNulls={true}
          autoMinValue={true}
          showLegend={true}
          // showAnimation={true}
          valueFormatter={(v) => v.toLocaleString("default", { maximumFractionDigits: 0 }) + (units === "metric" ? " m" : " ft")}
        />

        <Title className="pl-2">Velocity</Title>
        <LineChart
          className="h-48 mb-2"
          data={chartData}
          index="t"
          categories={["v"]}
          colors={["indigo"]}
          yAxisWidth={60}
          connectNulls={true}
          autoMinValue={true}
          showLegend={true}
          // showAnimation={true}
          valueFormatter={(v) => v.toLocaleString("default", { maximumFractionDigits: 1 }) + (units === "metric" ? " km/h" : " mph")}
        />

        <Title className="pl-2">Power Losses</Title>
        <LineChart
          className="h-48 mb-2"
          data={chartData}
          index="t"
          categories={["P_drag", "P_roll", "P_grav"]}
          colors={["blue", "red", "amber"]}
          yAxisWidth={60}
          connectNulls={true}
          autoMinValue={true}
          showLegend={true}
          valueFormatter={(v) => v.toLocaleString("default", { maximumFractionDigits: 1 }) + " W"}
          // showAnimation={true}
        />
      </Card>
    </Flex>
  )
}