import { Flex } from "@radix-ui/themes";

import InputLabel from "./InputLabel";

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { NumberInput } from "@tremor/react";
import { ToolbarFormType } from "./types";

import { presetsDtl } from "./presets";
import InputIndicator from "./InputIndicator";


export default function LossInput(props: { form: ToolbarFormType, value: number }) {
  return (
    <Flex direction="column" gap="2" className="w-full">
      <InputLabel
        title="Drivetrain loss"
        units="%"
        description="This is the percentage of pedaling power that is lost due to friction in your chain and drivetrain. It's typically in the 2-5% range and can be reduced by things like cleaning and waxing your chain."
      />
      <FormField
        control={props.form.control}
        name="lossDrivetrain"
        render={({ field }) => (
          <FormItem>
            <FormControl>
            <NumberInput
              {...field}
              placeholder="Lower is better"
              step={0.1}
              formNoValidate
              min={0.1}
              max={20}
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
            { label: "Bad", value: presetsDtl.bad, color: "orange" },
            { label: "Average", value: presetsDtl.average, color: "yellow" },
            { label: "Good", value: presetsDtl.good, color: "blue" },
            { label: "Great", value: presetsDtl.excellent, color: "green" }
          ]}
          setValue={(v) => props.form.setValue("lossDrivetrain", v)}
        />
      </Flex>
    </Flex>
  )
}