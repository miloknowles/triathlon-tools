import { Flex, Text } from "@radix-ui/themes";

import InputLabel from "./InputLabel";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { NumberInput } from "@tremor/react";
import { ToolbarFormType } from "./types";

import { presetsCRR } from "./presets";
import InputIndicator from "./InputIndicator";



export default function RollingInput(props: { form: ToolbarFormType, value: number }) {
  return (
    <Flex direction="column" gap="2" className="w-full">
      <InputLabel
        title="Crr"
        units="unitless"
        description={
          <Flex direction="column" gap="2">
          <Text>
            The coefficient of rolling resistance quantifies the friction your wheel encounters as it rolls, and
            depends on the tube/tire you use, your tire pressure, and the surface you're riding on.
            See the FAQs below for how to calculate.
          </Text>
          </Flex>
        }
      />
      <FormField
        control={props.form.control}
        name="avgCrr"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <NumberInput
                {...field}
                placeholder="Lower is better"
                step={0.0005}
                required
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Flex gap="2">
        <InputIndicator
          value={props.value}
          choices={[
            { label: "Bad", value: presetsCRR.bad, color: "orange" },
            { label: "Average", value: presetsCRR.average, color: "yellow" },
            { label: "Good", value: presetsCRR.good, color: "blue" },
            { label: "Great", value: presetsCRR.excellent, color: "green" }
          ]}
          setValue={(v) => props.form.setValue("avgCrr", v)}
        />
      </Flex>
    </Flex>
  );
}