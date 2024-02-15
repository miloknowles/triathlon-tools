import { Code, Flex, Text } from "@radix-ui/themes";

import InputLabel from "./InputLabel";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { NumberInput } from "@tremor/react";
import { ToolbarFormType } from "./types";

import { presetsCdA } from "./presets";
import InputIndicator from "./InputIndicator";



export default function CdAInput(props: { form: ToolbarFormType, value: number }) {
  return (
    <Flex direction="column" gap="2" className="w-full">
      <InputLabel
        title="CdA"
        units="m2"
        description={
          <Flex gap="2" direction="column">
            <Text>
              Your coefficient of drag, or <Code>CdA</Code>, is a measure of how aerodynamic you are, and is one of the most important parameters for race performance.
            </Text>
            <Text>
              If you have a wind tunnel or track, you can measure this. Otherwise, the "Chung method" can be used for estimation, and there are several "aerometers" on the market now that combine measurement and estimation.
            </Text>
            <Text>
              If you don't know this number, you can do some googling about your bike setup
              and position to make an educated guess.
            </Text>
          </Flex>
        }
      />
      <FormField
        control={props.form.control}
        name="avgCdA"
        render={({ field }) => (
          <FormItem>
            <FormControl>
            <NumberInput
              {...field}
              placeholder="Lower is better"
              step={0.005}
              min={0.1}
              max={0.5}
              required
            />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Flex gap="2" wrap="wrap">
        <InputIndicator
          value={props.value}
          choices={[
            { label: "Hoods", value: presetsCdA.upright, color: "orange" },
            { label: "Drops", value: presetsCdA.drops, color: "yellow" },
            { label: "Aero", value: presetsCdA.aero, color: "blue" },
            { label: "Optimized", value: presetsCdA.optimized, color: "teal" },
            { label: "Pro", value: presetsCdA.pro, color: "green" }
          ]}
          setValue={(v) => props.form.setValue("avgCdA", v)}
        />
      </Flex>
    </Flex>
  );
}