"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  Bike,
  Clock3,
  ExternalLink,
  Gauge,
  Info,
  LoaderCircle,
  Mountain,
  Route,
  TriangleAlert,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { COURSES } from "@/lib/courses"
import { PRESETS } from "@/lib/presets"
import { simulate, type SimulationResult } from "@/lib/simulator"

type Units = "metric" | "imperial"

type FormValues = {
  courseName: string
  avgPowerWatts: number
  avgCdA: number
  avgCrr: number
  lossDrivetrain: number
  massRiderKg: number
  massBikeKg: number
  ambientTempCelsius: number
  relativeHumidity: number
}

const DEFAULTS: FormValues = {
  courseName: "santacruz_703",
  avgPowerWatts: 250,
  avgCdA: 0.28,
  avgCrr: 0.00375,
  lossDrivetrain: 4.7,
  massRiderKg: 75,
  massBikeKg: 10,
  ambientTempCelsius: 20,
  relativeHumidity: 50,
}

const chartConfig = {
  altitude: { label: "Elevation", color: "var(--chart-1)" },
  speed: { label: "Speed", color: "var(--chart-2)" },
} satisfies ChartConfig

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function NumberField({
  id,
  label,
  unit,
  description,
  value,
  step,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  unit: string
  description?: string
  value: number
  step: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <Field>
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? (
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="ghost" size="icon-xs" aria-label={`About ${label}`} />}>
              <Info />
            </TooltipTrigger>
            <TooltipContent className="max-w-72">{description}</TooltipContent>
          </Tooltip>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">{unit}</span>
      </div>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        required
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </Field>
  )
}

function PresetButtons({
  items,
  value,
  onChange,
}: {
  items: readonly { label: string; value: number }[]
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          size="xs"
          variant={Math.abs(value - item.value) < 0.00001 ? "secondary" : "outline"}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}

export function BikeSimulator() {
  const [units, setUnits] = useState<Units>("metric")
  const [values, setValues] = useState(DEFAULTS)
  const [results, setResults] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCourse = COURSES.find((course) => course.value === values.courseName)

  function update<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function runSimulation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourse) return

    setLoading(true)
    setError(null)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    try {
      const nextResults = await simulate({ ...values, url: selectedCourse.url })
      setResults(nextResults)
      requestAnimationFrame(() => document.querySelector("#results")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The simulation could not be completed.")
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    if (!results) return null
    const finalState = results.states.at(-1)
    const elapsed = finalState?.t ?? 0
    const avgSpeedMps = elapsed ? results.totalDistanceMeters / elapsed : 0
    return {
      elapsed,
      averageSpeed: avgSpeedMps * (units === "metric" ? 3.6 : 2.23694),
      distance: results.totalDistanceMeters * (units === "metric" ? 0.001 : 0.000621371),
      gain: results.totalGainMeters * (units === "metric" ? 1 : 3.28084),
      drag: average(results.states.map((state) => state.dragWatts)),
    }
  }, [results, units])

  const chartData = useMemo(() => {
    if (!results) return []
    const takeEvery = Math.max(1, Math.ceil(results.states.length / 700))
    return results.states
      .filter((_, index) => index % takeEvery === 0)
      .map((state) => ({
        distance: state.x * (units === "metric" ? 0.001 : 0.000621371),
        altitude: state.alt * (units === "metric" ? 1 : 3.28084),
        speed: state.v * (units === "metric" ? 3.6 : 2.23694),
      }))
  }, [results, units])

  const riderMass = units === "metric" ? values.massRiderKg : values.massRiderKg * 2.20462
  const bikeMass = units === "metric" ? values.massBikeKg : values.massBikeKg * 2.20462
  const temperature = units === "metric" ? values.ambientTempCelsius : values.ambientTempCelsius * 1.8 + 32

  return (
    <main id="simulator" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="mb-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bike Split Predictor</h1>
            <Dialog>
              <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="How the simulator works" />}>
                <Info />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>How it works</DialogTitle>
                  <DialogDescription>
                    The simulator applies your target power to the course elevation profile and models aerodynamic drag,
                    rolling resistance, gravity, drivetrain loss, and air density at each step.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
          <p className="mt-3 text-pretty text-base leading-7 text-muted-foreground">
            Explore how power, equipment, position, and weather change your predicted bike split.
          </p>
        </div>
      </section>

      <form id="simulation-form" onSubmit={runSimulation}>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Simulation inputs</CardTitle>
            <CardDescription>Start with the defaults, then tune the values to match your race setup.</CardDescription>
            <CardAction>
              <Tabs value={units} onValueChange={(value) => setUnits(value as Units)}>
                <TabsList>
                  <TabsTrigger value="metric">Metric</TabsTrigger>
                  <TabsTrigger value="imperial">Imperial</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-8 pt-1 lg:grid-cols-4">
            <FieldGroup>
              <div>
                <p className="mb-1 font-medium">Course</p>
                <p className="text-sm text-muted-foreground">Choose an elevation profile.</p>
              </div>
              <Field>
                <FieldLabel htmlFor="course">Race course</FieldLabel>
                <Select value={values.courseName} onValueChange={(value) => update("courseName", value ?? "")}>
                  <SelectTrigger id="course" className="w-full">
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((course) => (
                      <SelectItem key={course.value} value={course.value}>{course.emoji} {course.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCourse ? (
                  <FieldDescription>
                    <a href={selectedCourse.origin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                      View source route <ExternalLink className="size-3" />
                    </a>
                  </FieldDescription>
                ) : null}
              </Field>
              <Alert>
                <Route />
                <AlertTitle>Need another course?</AlertTitle>
                <AlertDescription>Course imports can be added in a future pass.</AlertDescription>
              </Alert>
            </FieldGroup>

            <FieldGroup>
              <div>
                <p className="mb-1 font-medium">Rider & bike</p>
                <p className="text-sm text-muted-foreground">Your planned output and system mass.</p>
              </div>
              <NumberField id="power" label="Race power" unit="W" value={values.avgPowerWatts} step={5} min={50} max={1000} onChange={(value) => update("avgPowerWatts", value)} />
              <NumberField id="rider-mass" label="Rider mass" unit={units === "metric" ? "kg" : "lb"} value={riderMass} step={0.5} min={units === "metric" ? 10 : 22} max={units === "metric" ? 200 : 440} onChange={(value) => update("massRiderKg", units === "metric" ? value : value / 2.20462)} />
              <NumberField id="bike-mass" label="Bike mass" unit={units === "metric" ? "kg" : "lb"} value={bikeMass} step={0.5} min={units === "metric" ? 1 : 2.2} max={units === "metric" ? 30 : 66} onChange={(value) => update("massBikeKg", units === "metric" ? value : value / 2.20462)} />
            </FieldGroup>

            <FieldGroup>
              <div>
                <p className="mb-1 font-medium">Equipment</p>
                <p className="text-sm text-muted-foreground">Tune the losses from tires, position, and drivetrain.</p>
              </div>
              <NumberField id="cda" label="Aerodynamic drag" unit="CdA m²" description="Lower values represent a more aerodynamic rider and bike." value={values.avgCdA} step={0.005} min={0.1} max={0.5} onChange={(value) => update("avgCdA", value)} />
              <PresetButtons items={PRESETS.cda} value={values.avgCdA} onChange={(value) => update("avgCdA", value)} />
              <Separator />
              <NumberField id="crr" label="Rolling resistance" unit="Crr" description="This combines tire, pressure, and road-surface losses." value={values.avgCrr} step={0.00005} min={0.001} max={0.01} onChange={(value) => update("avgCrr", value)} />
              <PresetButtons items={PRESETS.crr} value={values.avgCrr} onChange={(value) => update("avgCrr", value)} />
              <NumberField id="drivetrain" label="Drivetrain loss" unit="%" value={values.lossDrivetrain} step={0.1} min={0.1} max={15} onChange={(value) => update("lossDrivetrain", value)} />
              <PresetButtons items={PRESETS.drivetrain} value={values.lossDrivetrain} onChange={(value) => update("lossDrivetrain", value)} />
            </FieldGroup>

            <FieldGroup>
              <div>
                <p className="mb-1 font-medium">Conditions</p>
                <p className="text-sm text-muted-foreground">Weather changes air density and drag.</p>
              </div>
              <NumberField id="temperature" label="Temperature" unit={units === "metric" ? "°C" : "°F"} description="Warmer air is less dense and creates slightly less aerodynamic drag." value={temperature} step={1} min={units === "metric" ? -18 : 0} max={units === "metric" ? 45 : 113} onChange={(value) => update("ambientTempCelsius", units === "metric" ? value : (value - 32) / 1.8)} />
              <NumberField id="humidity" label="Relative humidity" unit="%" description="Humid air is slightly less dense than dry air at the same temperature." value={values.relativeHumidity} step={1} min={0} max={100} onChange={(value) => update("relativeHumidity", value)} />
            </FieldGroup>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive" className="mt-4">
            <TriangleAlert />
            <AlertTitle>Simulation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

      </form>

      <section id="results" className="scroll-mt-20 pt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary ? `Predicted performance for ${selectedCourse?.label ?? "your course"}.` : "Run the simulator to see your predicted split."}
            </p>
          </div>
          <Button form="simulation-form" type="submit" size="lg" disabled={loading || !selectedCourse}>
            {loading ? <LoaderCircle className="animate-spin" /> : <Activity />}
            {loading ? "Simulating…" : "Run simulation"}
          </Button>
        </div>

        {summary && results ? (
          <>
            {results.overrideCount > 0 ? (
              <Alert className="mb-5">
                <Mountain />
                <AlertTitle>Minimum climbing speed applied</AlertTitle>
                <AlertDescription>
                  The model raised power briefly on steep sections to keep the bike moving.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Predicted split", value: formatTime(summary.elapsed), unit: "elapsed", icon: Clock3 },
                { label: "Average speed", value: summary.averageSpeed.toFixed(1), unit: units === "metric" ? "km/h" : "mph", icon: Gauge },
                { label: "Distance", value: summary.distance.toFixed(1), unit: units === "metric" ? "km" : "mi", icon: Route },
                { label: "Elevation gain", value: Math.round(summary.gain).toLocaleString(), unit: units === "metric" ? "m" : "ft", icon: Mountain },
                { label: "Average aero loss", value: summary.drag.toFixed(0), unit: "watts", icon: Bike },
              ].map((metric) => (
                <Card key={metric.label} size="sm">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2"><metric.icon className="size-4" /> {metric.label}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{metric.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">{metric.unit}</CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Course profile</CardTitle>
                  <CardDescription>Elevation across the route</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto">
                    <AreaChart data={chartData} accessibilityLayer>
                      <defs>
                        <linearGradient id="altitude-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-altitude)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--color-altitude)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="distance" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => Number(value).toFixed(0)} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => {
                        const distance = Number(payload?.[0]?.payload?.distance)
                        return Number.isFinite(distance) ? `${distance.toFixed(1)} ${units === "metric" ? "km" : "mi"}` : ""
                      }} />} />
                      <Area dataKey="altitude" type="monotone" fill="url(#altitude-fill)" stroke="var(--color-altitude)" />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Speed profile</CardTitle>
                  <CardDescription>Predicted speed across the route</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72 w-full aspect-auto">
                    <LineChart data={chartData} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="distance" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => Number(value).toFixed(0)} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => {
                        const distance = Number(payload?.[0]?.payload?.distance)
                        return Number.isFinite(distance) ? `${distance.toFixed(1)} ${units === "metric" ? "km" : "mi"}` : ""
                      }} />} />
                      <Line dataKey="speed" type="monotone" stroke="var(--color-speed)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="border-dashed bg-muted/20 py-16">
            <CardContent className="flex flex-col items-center text-center">
              <span className="mb-4 grid size-12 place-items-center rounded-full bg-muted"><Gauge className="size-5 text-muted-foreground" /></span>
              <p className="font-medium">Your prediction will appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Choose a course, adjust your setup, and run the simulation.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}
