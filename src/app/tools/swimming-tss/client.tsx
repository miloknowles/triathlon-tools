"use client";

import { Input } from "@/components/ui/input";
import { CalloutIcon, CalloutRoot, CalloutText, Code, Container, Flex, Grid, Heading, Section, Slider, Text } from "@radix-ui/themes";

import { Link as RadixLink } from "@radix-ui/themes";
import React, { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InfoCircledIcon } from "@radix-ui/react-icons";


/* Estimate the TSS of a swim session. One hour at FTP is equal to 100 TSS. */
const calculateTss = (movingPace: number, ftpPace: number, movingDurationMin: number) => {
  const NSS = 60 * 1 / (movingPace / 100); // meters per minute
  const FTP = 60 * 1 / (ftpPace / 100); // meters per minute
  const IF = NSS / FTP; // unitless
  return Math.min(IF*IF*IF, IF) * (movingDurationMin / 60) * 100;
}


const PaceInput = (props: {
  units: "meters" | "yards",
  seconds: number,
  setSeconds: (sec: number) => void,
  setUnits: (units: "meters" | "yards") => void
}) => {
  return (
    <Flex direction="column" gap="3" width="100%">
      <Slider
        defaultValue={[props.seconds]}
        min={50}
        max={2*60}
        step={1}
        className="w-full sm:w-[400px]"
        value={[props.seconds]}
        onValueChange={(v) => props.setSeconds(v[0])}
      />
      <Flex align="center" justify="start" gap="1">
        <Input disabled type="numb  er" className="rounded-xl w-[60px] text-center" placeholder="MM" value={Math.floor(props.seconds / 60)} onChange={e => props.setSeconds}/>
        <Text>:</Text>
        <Input disabled type="number" className="rounded-xl w-[60px] text-center" placeholder="SS" value={props.seconds % 60}/>
        <Select value={props.units} onValueChange={props.setUnits}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue placeholder="Select your pace units"/>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectGroup>
              <SelectItem value="meters">/ 100 meters</SelectItem>
              <SelectItem value="yards">/ 100 yards</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Flex>
    </Flex>
  )
}


// const DurationInput = () => {
//   const [hh, setHH] = useState(0);
//   const [mm, setMM] = useState(0);
//   const [ss, setSS] = useState(0);

//   const clamp = (v: number) => Math.max(0, Math.min(v, 59));

//   return (
//     <Flex align="center" justify="start" gap="2">
//       <Input type="number" className="rounded-xl w-[80px] text-center" placeholder="HH" value={hh} onChange={(e) => setHH(clamp(parseFloat(e.target.value)))}/>
//       <Text>:</Text>
//       <Input type="number" className="rounded-xl w-[80px] text-center" placeholder="MM" value={mm} onChange={(e) => setMM(clamp(parseFloat(e.target.value)))}/>
//       <Text>:</Text>
//       <Input type="number" className="rounded-xl w-[80px] text-center" placeholder="SS" value={ss} onChange={(e) => setSS(clamp(parseFloat(e.target.value)))}/>
//     </Flex>
//   )
// }


export default function Tool() {
  const [movingMins, setMovingMins] = useState(45);
  const [ftpSec, setFtpSec] = useState(90);
  const [paceSec, setPaceSec] = useState(100);
  const [units, setUnits] = useState<"yards" | "meters">("yards");

  const tss = calculateTss(paceSec, ftpSec, movingMins);

  return (
    <main className="min-h-screen">
      <Section size={{initial: "1", lg: "2"}} pl="3" pr="3">
        <Container size="4">
          <Grid columns={{initial: "1", md: "2"}} gap="6">
            <Flex direction="column" gap="4" className="max-w-lg" justify="center">
              <Heading size="8">Swimming TSS</Heading>
              <Text className="pt-2">
                How do you compare the training stress of swimming to biking and running?
              </Text>
              <Text>
                One option is to use <Code>hrTSS</Code>. However, if you don't trust your heart rate
                data underwater you can use an intensity-based <RadixLink href="https://www.trainingpeaks.com/learn/articles/calculating-swimming-tss-score/" target="_blank">formula</RadixLink> from
                Training Peaks. That simple math is what's implemented in this calculator.
              </Text>
              <CalloutRoot>
                <CalloutIcon>
                  <InfoCircledIcon/>
                </CalloutIcon>
                <CalloutText>The high-level formula is:<br/>
                  <Code>TSS = Avg. Intensity Factor^3 * Hours Swimming * 100</Code>
                </CalloutText>
              </CalloutRoot>
            </Flex>
          
            <Flex direction="column" mt="6" gap="6" align="start">

              <Flex direction="column" gap="2">
                <Heading size="4">
                  Total Moving Time
                </Heading>
                <Text className="text-muted-foreground" size="4">This total <strong>active</strong> swimming duration of the workout.</Text>
                <Input
                  type="number"
                  className="rounded-xl text-center h-[48px] text-lg"
                  placeholder="Total minutes"
                  value={movingMins}
                  onChange={(e) => setMovingMins(parseFloat(e.target.value))}
                />
              </Flex>

              <Flex direction="column" gap="2">
                <Heading size="4">
                  Functional Threshold Pace
                </Heading>
                <Text className="text-muted-foreground" size="4">This is the best pace you could hold for one hour.</Text>
                <PaceInput units={units} setUnits={setUnits} seconds={ftpSec} setSeconds={setFtpSec}/>
              </Flex>

              <Flex direction="column" gap="2">
                <Heading size="4">
                  Average Workout Pace
                </Heading>
                <Text className="text-muted-foreground" size="4">This is your average pace for the workout (<strong>not</strong> including rests).</Text>
                <PaceInput units={units} setUnits={setUnits} seconds={paceSec} setSeconds={setPaceSec}/>
              </Flex>

              <CalloutRoot>
                <CalloutText weight="bold" size="4">
                  <span style={{textDecoration: ""}}>{tss.toLocaleString("default", { maximumFractionDigits: 0 })} TSS</span>
                </CalloutText>
              </CalloutRoot>
            </Flex>
          </Grid>
        </Container>
      </Section>
    </main>
  );
}