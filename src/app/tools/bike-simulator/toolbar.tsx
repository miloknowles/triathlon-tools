"use client";

import { Button } from "@/components/ui/button";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  CalloutIcon, CalloutRoot, CalloutText, Code, DialogClose, DialogContent,
  DialogRoot, DialogTrigger, Flex, Grid, Heading, IconButton, Text
} from "@radix-ui/themes";
import { Link as RadixLink } from "@radix-ui/themes"
import ChooseCourse from "./ChooseCourse";
import { COURSES } from "./courses";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { useSWRConfig } from "swr"
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge, NumberInput, Tab, TabGroup, TabList, TabPanel, TabPanels } from "@tremor/react";
import { presetsCRR, presetsCdA, presetsDtl } from "./presets";
import { simulate } from "./simulator";
import RollingInput from "./RollingInput";
import LossInput from "./LossInput";
import CdAInput from "./CdAInput";


const formSchema = z.object({
  courseName: z.string({
    required_error: "Please select a course.",
  }),
  avgPowerWatts: z.coerce.number().min(50).max(1000),
  avgCdA: z.coerce.number().min(0.1).max(1),
  avgCrr: z.coerce.number().min(0.001).max(0.01),
  lossDrivetrain: z.coerce.number().min(0.1).max(15).step(0.05),
  massRiderKg: z.coerce.number().min(10).max(200),
  massBikeKg: z.coerce.number().min(1).max(30),
  ambientTempCelsius: z.coerce.number().min(-18).max(45),
  relativeHumidity: z.coerce.number().min(0).max(100),
});


const CourseCallout = () => (
  <CalloutRoot>
    <CalloutIcon>
      <InfoCircledIcon/>
    </CalloutIcon>
    <CalloutText>
      Don't see your course? This tool is a work in progress, so please send me
      an email with the <Code>GPX</Code> or <Code>FIT</Code> file (or link) and
      I'm happy to add it.
    </CalloutText>
  </CalloutRoot>
);


const Label = (props: { title: string, units: string, description: any }) => {
  return (
    <HoverCard>
      <HoverCardTrigger>
      <Heading size="3" style={{borderBottom: "0.5px dashed white"}} className="w-fit">
        {props.title} (<Code>{props.units}</Code>)
      </Heading>
      </HoverCardTrigger>
      <HoverCardContent className="rounded-xl min-w-[400px] text-sm">
        {props.description}
      </HoverCardContent>
    </HoverCard>
  );
}


interface IToolbarProps {
  units: "imperial" | "metric"
  setUnits: (units: "imperial" | "metric") => void
}


export default function Toolbar({units, setUnits} : IToolbarProps) {
  const baseUrl = process.env.NODE_ENV === "production" ?
    "https://training-tools-plum.vercel.app" :
    "http://localhost:8000";
  const [loading, setLoading] = useState(false);

  const { mutate } = useSWRConfig();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      avgPowerWatts: 250,
      avgCdA: presetsCdA.aero,
      avgCrr: presetsCRR.average,
      lossDrivetrain: presetsDtl.average,
      massRiderKg: 75,
      massBikeKg: 10,
      ambientTempCelsius: 20,
      relativeHumidity: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const url = COURSES.find(v => (v.value === values.courseName))?.url;

    if (!url) {
      console.error(url);
      return;
    }
    const { results, errors, meta } = await simulate({
      url: url,
      timestep: 0.1,
      velocityMin: 1,
      ...values,
    });

    const maxStepsForPlotting = 5000;

    const takeEveryNth = Math.max(1, Math.ceil(results.length / maxStepsForPlotting));
    console.debug(`Thinning results to take every ${takeEveryNth}th value.`);

    // Mutate the cache to include the latest results. This makes it globally
    // accessible to other components tht fetch the same key.
    mutate('/api/simulate', { states: results.filter((v, i) => ((i % takeEveryNth) === 0)), errors, meta: { ...values, ...meta } }, {
      populateCache: (resultData, currentData) => {
        return resultData;
      },
      revalidate: false
    });

    setLoading(false);
  }

  const _avgCrr = form.watch("avgCrr");
  const _cda = form.watch("avgCdA");
  const _dtl = form.watch("lossDrivetrain");
  const _courseName = form.watch("courseName");

  return (
    <Flex direction="column" gap="6" justify="center" align="start" className="w-full">
      <Flex direction={{initial: "column", sm: "row"}} className="w-full" align="start">
        <DialogRoot>
          <DialogTrigger >
            <Flex gap="4" align="center">
              <Heading size="8">Bike Simulator</Heading>
              <IconButton variant="ghost" radius="full">
                <InfoCircledIcon width="24" height="24"/>
              </IconButton>
            </Flex>
          </DialogTrigger>
          <DialogContent>
            <Flex direction="column" gap="4" align="start">
              <Heading size="7">Instructions</Heading>
              <Text className="pt-2">
                This tool predicts what your race time will be on a bike course, taking into
                account the elevation profile and key parameters like your average power, CdA,
                rolling resistance, air density, etc. It's meant to answer questions like:
              </Text>
              <Text>
                "How much faster could I go if I put out 10 more watts?"
              </Text>
              <Text>
                "How much time could I save by improving my position?"
              </Text>
              <Text>
                "How much nutrition do I need to plan for?"
              </Text>
              <Text weight="medium" color="indigo">
                You can play around with the tool to estimate what a realistic bike split might be
                and also adjust parameters to try to improve your performance. For more information,
                read the FAQs below.
              </Text>
              <DialogClose>
                <Button variant="secondary" className="ml-auto">Close</Button>
              </DialogClose>
            </Flex>
          </DialogContent>
        </DialogRoot>
        
        <TabGroup
          index={["metric", "imperial"].indexOf(units)}
          onIndexChange={(index) => setUnits(["metric", "imperial"][index] as "metric" | "imperial")}
          className="sm:ml-auto w-fit"
        >
          <TabList className="mt-8" variant="solid">
            <Tab>metric</Tab>
            <Tab>imperial</Tab>
          </TabList>
          <TabPanels>
            <TabPanel/>
            <TabPanel/>
          </TabPanels>
        </TabGroup>
      </Flex>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Grid columns={{initial: "1", sm: "2", lg: "4"}} gap="6">
          <Flex gap="4" direction="column">
            <Heading size="7">Inputs</Heading>
            <FormField
              control={form.control}
              name="courseName"
              render={({ field }) => (
                <ChooseCourse value={field.value} setValue={(v) => form.setValue("courseName", v)}/>
              )}
            />
            <CourseCallout/>
            {
              (_courseName && (COURSES.findIndex(v => v.value === _courseName) >= 0)) ?
                <RadixLink href={COURSES.find(v => v.value === _courseName)?.origin} target="_blank">View course file</RadixLink> :
                undefined
            }
          </Flex>

          <Flex direction="column" gap="4" className="w-full">
            <Flex direction="column" gap="2">
              <Label title="Race power" units="W" description="This is the average power you plan (or hope) to race at."/>
              <FormField
                control={form.control}
                name="avgPowerWatts"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <NumberInput
                        {...field}
                        placeholder="Your race power"
                        step={5}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Heading size="3">
                Mass of rider (<Code>{units === "metric" ? "kg" : "lbs"}</Code>)
              </Heading>
              <FormField
                control={form.control}
                name="massRiderKg"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <NumberInput
                        value={units === "metric" ? field.value : field.value * 2.20462}
                        onValueChange={(v) => form.setValue("massRiderKg", units === "metric" ? v : v / 2.20462)}
                        placeholder="Your dressed weight"
                        step={0.5}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Heading size="3">
                Mass of bike (<Code>{units === "metric" ? "kg" : "lbs"}</Code>)
              </Heading>
              <FormField
                control={form.control}
                name="massBikeKg"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <NumberInput
                        value={units === "metric" ? field.value : field.value * 2.20462}
                        onValueChange={(v) => form.setValue("massBikeKg", units === "metric" ? v : v / 2.20462)}
                        placeholder="Loaded bike weight"
                        step={0.5}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Flex>
          </Flex>

          <Flex direction="column" gap="4">
            <RollingInput form={form} value={_avgCrr}/>
            <LossInput form={form} value={_dtl}/>
          </Flex>

          <Flex direction="column" gap="4">
            <CdAInput form={form} value={_cda}/>

            <Flex direction="column" gap="2" className="w-full">
              <Label
                title="Temperature"
                units={units === "metric" ? "C" : "F"}
                description={
                  <Flex gap="2" direction="column">
                    <Text>
                      Believe it or not, temperature actually makes a big difference in aerodynamic drag.
                      Higher temperatures reduce air density, allowing you go faster. Check out the hour
                      record series of the "Marginal Gains" podcast, where they talk about the ideal
                      aerodynamic environment for cycling: a hot, humid day at altitude.
                    </Text>
                  </Flex>
                }
              />
              <FormField
                control={form.control}
                name="ambientTempCelsius"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                    <NumberInput
                      placeholder="Ambient temperature"
                      value={units === "metric" ? field.value : field.value * (9/5) + 32}
                      onValueChange={(v) => form.setValue("ambientTempCelsius", units === "metric" ? v : (v - 32) / 1.8)}
                      step={1}
                      min={units === "metric" ? -8 : 0}
                      max={units === "metric" ? 45 : 115}
                      required
                    />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Flex>

            <Flex direction="column" gap="2" className="w-full">
              <Label
                title="Relative humidity"
                units={"%"}
                description={
                  <Flex gap="2" direction="column">
                    <Text>
                      Counterintuitively, more humid air is less dense, and therefore faster. This
                      is because the molecular weight of water is less than the average air molecule.
                      All else equal, you'll go faster on a more humid day.
                    </Text>
                  </Flex>
                }
              />
              <FormField
                control={form.control}
                name="relativeHumidity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                    <NumberInput
                      placeholder="Relative humidity"
                      value={field.value}
                      onValueChange={(v) => form.setValue("relativeHumidity", v)}
                      step={1}
                      min={0}
                      max={100}
                      required
                    />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Flex>
          </Flex>
        </Grid>
        <Button
          className=""
          type="submit"
          disabled={loading || !_courseName}
        >
          {
            loading ?
              <Flex align="center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <Text>Simulating</Text>
              </Flex> :
              "Run simulation"
          }
        </Button>
        </form>
      </Form>
    </Flex>
  );
}