import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Code, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { Link as RadixLink } from "@radix-ui/themes";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@tremor/react";
import Image from "next/image";


export default function FAQs() {

  return (
    <Flex direction="column" gap="6">
    <Heading size="7">FAQs</Heading>
    <Grid columns={{initial: "1", md: "2"}} gap="6">
      <Accordion type="single" collapsible>
        <AccordionItem value="model-presets">
          <AccordionTrigger>How do I estimate my coefficient of rolling resistance?</AccordionTrigger>
          <AccordionContent>
            <Flex direction="column" gap="2">
              <Text>
                For the <Code>Crr</Code> presets, I'm using data from Silca's <RadixLink href="https://silca.cc/pages/power-calc">Power Calculator</RadixLink>.
              </Text>
              <Text>
                To get a more accurate estimate for your race, start with a base value for the surface you'll be riding on,
                and then add a modifier based on your tire/tube setup. For a triathlon, you could probably assume the
                "new pavement" value as a starting point.
              </Text>
            </Flex>
            <Table className="p-0 mt-3">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Surface</TableHeaderCell>
                  <TableHeaderCell>Base Coefficient</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    Track (Indoor Wood)
                  </TableCell>
                  <TableCell>
                    0.0025
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Track (Outdoor Concrete)
                  </TableCell>
                  <TableCell>
                    0.0035
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    New Pavement
                  </TableCell>
                  <TableCell>
                    0.00375
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Worn Pavement
                  </TableCell>
                  <TableCell>
                    0.004
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Poor Pavement
                  </TableCell>
                  <TableCell>
                    0.0045
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Category 1 Gravel
                  </TableCell>
                  <TableCell>
                    0.0055
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Category 2 Gravel
                  </TableCell>
                  <TableCell>
                    0.006
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Table className="p-0 mt-3">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Tube/Tire</TableHeaderCell>
                  <TableHeaderCell>Modifier (+/-)</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    Latex Inner Tube w/ Supple Low CRR Tire
                  </TableCell>
                  <TableCell>
                    -0.00045
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Supple Low CRR Tire
                  </TableCell>
                  <TableCell>
                    -0.00025
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Puncture Resistance Tire
                  </TableCell>
                  <TableCell>
                    +0.00045
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Text>
              Alternatively, you can find an exact value for your tire using <RadixLink href="bicyclerollingresistance.com/road-bike-reviews">BicycleRollingResistance.com</RadixLink>.
              Note that the website above reports wattage values at a given velocity and weight. To convert to
              unitless <Code>Crr</Code>, use the formula: <Code>Crr = P / (W * v * g)</Code> where
              <Code>P</Code> is the reported rolling loss in watts, <Code>v</Code> is the velocity of the
              test and <Code>g = 8.91</Code>. Keep in mind that these rolling resistance value don't account
              for the surface that you're riding on.
            </Text>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="model-presets-drivetrain">
          <AccordionTrigger>How do I estimate my drivetrain loss?</AccordionTrigger>
          <AccordionContent>
            <Flex direction="column" gap="2">
            <Text>
              For the drivetrain loss presets, I'm using data from Silca's <RadixLink href="https://silca.cc/pages/power-calc">Power Calculator</RadixLink>.
              The "Great" value is the based on a 56/16 track setup with hot melt wax. Most triathletes
              will fall in the "Average" (53/13 with dry lube) to "Good" (53/13 with hot melt wax) range.
            </Text>
            <Text>
              To get a more accurate estimate for your setup, start with a value for your gearing setup and then add a modifier
              based on the lubricant you use. The "Track" gearing setups aren't relevant unless you're riding a fixed gear bike.
            </Text>
            </Flex>
            <Table className="p-0 mt-3">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Drivetrain</TableHeaderCell>
                  <TableHeaderCell>Base Rolling Resistance</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    Track - 56/16
                  </TableCell>
                  <TableCell>
                    0.029
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Track - 49/14
                  </TableCell>
                  <TableCell>
                    0.0325
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    New/Clean - 53/13
                  </TableCell>
                  <TableCell>
                    0.047
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    New/Clean - 48/12
                  </TableCell>
                  <TableCell>
                    0.055
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Table className="p-0 mt-3">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Lubricant</TableHeaderCell>
                  <TableHeaderCell>Modifier (+/-)</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    Dirty Drivetrain
                  </TableCell>
                  <TableCell>
                    +0.01
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Dry Lube
                  </TableCell>
                  <TableCell>
                    +0.005
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Silca Super Secret Chain Lube
                  </TableCell>
                  <TableCell>
                    -0.0025
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    Hot Melt Wax Lube
                  </TableCell>
                  <TableCell>
                    -0.01
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="model-presets-cda">
          <AccordionTrigger>How do I estimate my CdA?</AccordionTrigger>
          <AccordionContent>
            <Flex direction="column" gap="2">
              <Text>
                Once again, I'm using data from Silca's <RadixLink href="https://silca.cc/pages/power-calc">Power Calculator</RadixLink>.
                They've come up with an equation that relates your <Code>CdA</Code> to your height, weight, and position. I assume
                this is based on empirical data they've collected.
              </Text>
              <Text>If you're curious, the exact formula is:</Text>
              <Code>
                Body Surface Area (m^2) = 0.007184 * (Weight(Kg) - 7.5)**0.425 * Height(m)**0.725
              </Code>
              <Code>
                Frontal Area (m^2) = Body Surface Area * Position Multiplier
              </Code>
              <Code>
                CdA (m^2) = Frontal Area / 5.95
              </Code>
              <Text>
                where the Position Multiplier is <Code>0.9</Code> for
                aero, <Code>0.95</Code> for drops, <Code>1.0</Code> for hoods,
                and <Code>1.05</Code> for tops.
              </Text>
              <Text>This is what the formula for looks like as a table, in the "Hoods" position:</Text>
              <Image src="/cda_table.svg"
                width={500}
                height={500}
                alt="A lookup table for CdA"
                className="w-full"
              />
              <Text>
                Look up your height and weight in the table, and then multiply by your position
                multiplier to get CdA. I think that most triathletes can do much
                better (lower) than than Silca's aero position multiplier of <Code>0.9</Code>. Lots of
                people on Slowtwitch claim to be in the low <Code>~0.2 m2</Code> range, for example. Take this with
                a grain of salt, but you can probably get into the low 0.20s with an optimal position
                and the best gear.
              </Text>
            </Flex>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible>
        <AccordionItem value="model-features">
          <AccordionTrigger>What factors does the model consider?</AccordionTrigger>
          <AccordionContent>
            <Text className="mb-2">
              Internally, the simulator models the following:
            </Text>
            <ul>
              <li>
                ✅ The exact elevation profile of the bike course
              </li>
              <li>
                ✅ Constant pedaling power and a constant % drivetrain loss
              </li>
              <li>
                ✅ Air density as a function of altitude, temperature, and relative humidity
              </li>
              <li>
                ✅ Drag forces as a function of your <Code>CdA</Code>
              </li>
              <li>
                ✅ Rolling resistance as a function of weight and <Code>Crr</Code>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="model-limitations">
          <AccordionTrigger>What are the limitations of the model?</AccordionTrigger>
          <AccordionContent>
            The model makes a few simplifying assumptions. First off, it simulates a <strong>constant,
            average race power</strong> with <strong>no braking</strong>, so it doesn't capture
            natural changes in power that would occur if you were going up a hill, passing
            someone, coasting downhill, or braking through a tight turn. In addition, it assumes that your <strong><Code>CdA</Code> remains
            constant</strong>, and that you aren't switching between different aerodynamic positions. If you
            get out of aero many times to drink, for example, then your time would be slower than what the
            simulator predicts.
            The model assumes <strong>no wind</strong> on the course, which could obviously have a significant impact on
            your time. Temperature, humidity, and your weight are assumed to stay constant for the duration of your race, although in
            practice this is not the case, especially for a 4+ hour Ironman bike split.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="warning-steep-hill">
          <AccordionTrigger>What is the warning about "had to go above target power..."?</AccordionTrigger>
          <AccordionContent>
            Some hills are so steep that you need to pedal harder than your race power just to
            overcome gravity. When this occurs, the simulator assumes you output the minimum power
            needed to maintain a low speed (1 m/s).
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Grid>
    </Flex>
  );
}