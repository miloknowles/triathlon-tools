"use client"

import { useEffect, useMemo, useState } from "react"
import { Bike, Footprints, Timer, Waves } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  BikeRunDistanceUnit,
  BikeSpeedUnit,
  calculateRacePlan,
  distanceToMeters,
  durationFromPace,
  durationFromSpeed,
  formatDuration,
  InputSource,
  metersPerSecondToSpeed,
  metersToDistance,
  parseDuration,
  RACE_PRESETS,
  RacePresetName,
  RunPaceUnit,
  runPaceToSecondsPerMeter,
  secondsPerMeterToRunPace,
  secondsPerMeterToSwimPace,
  speedToMetersPerSecond,
  SwimDistanceUnit,
  SwimPaceUnit,
  swimPaceToSecondsPerMeter,
} from "@/lib/race-time"

type DistanceState<U extends string> = { raw: string; unit: U; meters: number | null }
type TargetState<U extends string> = { time: string; pace: string; unit: U; source: InputSource | null }

const STORAGE_KEY = "triathlon-tools:race-calculator:v1"

const olympic = RACE_PRESETS.find((preset) => preset.name === "Olympic")!

function numericText(value: number, precision = 3) {
  return Number(value.toFixed(precision)).toString()
}

function validPositive(value: string): number | null {
  if (value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function targetTime(seconds: number | null) {
  return seconds === null ? "" : formatDuration(seconds)
}

function SelectField({ label, value, onChange, children, compact = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span className={compact ? "sr-only" : undefined}>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 rounded-md border border-input bg-background text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${compact ? "w-auto px-2" : "px-2.5"}`}
      >
        {children}
      </select>
    </label>
  )
}

function InputField({ label, value, onChange, onBlur, placeholder, inputMode = "decimal" }: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  inputMode?: "decimal" | "numeric"
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <Input
        aria-label={label}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </label>
  )
}

export function RaceTimeCalculator() {
  const [preset, setPreset] = useState<RacePresetName>("Olympic")
  const [swimDistance, setSwimDistance] = useState<DistanceState<SwimDistanceUnit>>({
    raw: "1500", unit: "m", meters: distanceToMeters(olympic.swim.distance, olympic.swim.unit),
  })
  const [bikeDistance, setBikeDistance] = useState<DistanceState<BikeRunDistanceUnit>>({
    raw: "40", unit: "km", meters: distanceToMeters(olympic.bike.distance, olympic.bike.unit),
  })
  const [runDistance, setRunDistance] = useState<DistanceState<BikeRunDistanceUnit>>({
    raw: "10", unit: "km", meters: distanceToMeters(olympic.run.distance, olympic.run.unit),
  })
  const [swim, setSwim] = useState<TargetState<SwimPaceUnit>>({ time: "", pace: "", unit: "100m", source: null })
  const [bike, setBike] = useState<TargetState<BikeSpeedUnit>>({ time: "", pace: "", unit: "km/h", source: null })
  const [run, setRun] = useState<TargetState<RunPaceUnit>>({ time: "", pace: "", unit: "min/km", source: null })
  const [t1, setT1] = useState("2:00")
  const [t2, setT2] = useState("1:00")
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const saved = JSON.parse(stored) as Record<string, unknown>
        const savedPreset = saved.preset
        const savedSwimDistance = saved.swimDistance as DistanceState<SwimDistanceUnit> | undefined
        const savedBikeDistance = saved.bikeDistance as DistanceState<BikeRunDistanceUnit> | undefined
        const savedRunDistance = saved.runDistance as DistanceState<BikeRunDistanceUnit> | undefined
        const savedSwim = saved.swim as TargetState<SwimPaceUnit> | undefined
        const savedBike = saved.bike as TargetState<BikeSpeedUnit> | undefined
        const savedRun = saved.run as TargetState<RunPaceUnit> | undefined

        if ([...RACE_PRESETS.map((item) => item.name), "Custom"].includes(savedPreset as RacePresetName)) setPreset(savedPreset as RacePresetName)
        if (savedSwimDistance && typeof savedSwimDistance.raw === "string" && ["yd", "m", "mi"].includes(savedSwimDistance.unit)) {
          const value = validPositive(savedSwimDistance.raw)
          setSwimDistance({ raw: savedSwimDistance.raw, unit: savedSwimDistance.unit, meters: value === null ? null : distanceToMeters(value, savedSwimDistance.unit) })
        }
        if (savedBikeDistance && typeof savedBikeDistance.raw === "string" && ["km", "mi"].includes(savedBikeDistance.unit)) {
          const value = validPositive(savedBikeDistance.raw)
          setBikeDistance({ raw: savedBikeDistance.raw, unit: savedBikeDistance.unit, meters: value === null ? null : distanceToMeters(value, savedBikeDistance.unit) })
        }
        if (savedRunDistance && typeof savedRunDistance.raw === "string" && ["km", "mi"].includes(savedRunDistance.unit)) {
          const value = validPositive(savedRunDistance.raw)
          setRunDistance({ raw: savedRunDistance.raw, unit: savedRunDistance.unit, meters: value === null ? null : distanceToMeters(value, savedRunDistance.unit) })
        }
        const validSource = (source: unknown): source is InputSource | null => source === null || source === "time" || source === "pace"
        if (savedSwim && typeof savedSwim.time === "string" && typeof savedSwim.pace === "string" && ["50yd", "50m", "100yd", "100m"].includes(savedSwim.unit) && validSource(savedSwim.source)) setSwim(savedSwim)
        if (savedBike && typeof savedBike.time === "string" && typeof savedBike.pace === "string" && ["km/h", "mph"].includes(savedBike.unit) && validSource(savedBike.source)) setBike(savedBike)
        if (savedRun && typeof savedRun.time === "string" && typeof savedRun.pace === "string" && ["min/km", "min/mi"].includes(savedRun.unit) && validSource(savedRun.source)) setRun(savedRun)
        if (typeof saved.t1 === "string") setT1(saved.t1)
        if (typeof saved.t2 === "string") setT2(saved.t2)
      }
    } catch {
      // Ignore unavailable storage or malformed data and retain the defaults.
    } finally {
      setStorageReady(true)
    }
    }, 0)
    return () => window.clearTimeout(restoreTimer)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        preset, swimDistance, bikeDistance, runDistance, swim, bike, run, t1, t2,
      }))
    } catch {
      // The calculator remains fully usable when storage is unavailable.
    }
  }, [storageReady, preset, swimDistance, bikeDistance, runDistance, swim, bike, run, t1, t2])

  function refreshSwim(target: TargetState<SwimPaceUnit>, meters: number | null) {
    if (target.source === "time") {
      const seconds = parseDuration(target.time)
      return { ...target, pace: seconds !== null && seconds > 0 && meters ? formatDuration(secondsPerMeterToSwimPace(seconds / meters, target.unit), false) : "" }
    }
    if (target.source === "pace") {
      const pace = parseDuration(target.pace)
      const seconds = pace !== null && pace > 0 && meters ? durationFromPace(meters, swimPaceToSecondsPerMeter(pace, target.unit)) : null
      return { ...target, time: targetTime(seconds) }
    }
    return target
  }

  function refreshBike(target: TargetState<BikeSpeedUnit>, meters: number | null) {
    if (target.source === "time") {
      const seconds = parseDuration(target.time)
      return { ...target, pace: seconds !== null && seconds > 0 && meters ? metersPerSecondToSpeed(meters / seconds, target.unit).toFixed(1) : "" }
    }
    if (target.source === "pace") {
      const speed = validPositive(target.pace)
      const seconds = speed !== null && meters ? durationFromSpeed(meters, speedToMetersPerSecond(speed, target.unit)) : null
      return { ...target, time: targetTime(seconds) }
    }
    return target
  }

  function refreshRun(target: TargetState<RunPaceUnit>, meters: number | null) {
    if (target.source === "time") {
      const seconds = parseDuration(target.time)
      return { ...target, pace: seconds !== null && seconds > 0 && meters ? formatDuration(secondsPerMeterToRunPace(seconds / meters, target.unit), false) : "" }
    }
    if (target.source === "pace") {
      const pace = parseDuration(target.pace)
      const seconds = pace !== null && pace > 0 && meters ? durationFromPace(meters, runPaceToSecondsPerMeter(pace, target.unit)) : null
      return { ...target, time: targetTime(seconds) }
    }
    return target
  }

  function updateSwimDistance(raw: string) {
    const value = validPositive(raw)
    const meters = value === null ? null : distanceToMeters(value, swimDistance.unit)
    setPreset("Custom")
    setSwimDistance({ ...swimDistance, raw, meters })
    setSwim((current) => refreshSwim(current, meters))
  }

  function updateBikeDistance(raw: string) {
    const value = validPositive(raw)
    const meters = value === null ? null : distanceToMeters(value, bikeDistance.unit)
    setPreset("Custom")
    setBikeDistance({ ...bikeDistance, raw, meters })
    setBike((current) => refreshBike(current, meters))
  }

  function updateRunDistance(raw: string) {
    const value = validPositive(raw)
    const meters = value === null ? null : distanceToMeters(value, runDistance.unit)
    setPreset("Custom")
    setRunDistance({ ...runDistance, raw, meters })
    setRun((current) => refreshRun(current, meters))
  }

  function selectPreset(name: string) {
    if (name === "Custom") { setPreset("Custom"); return }
    const selected = RACE_PRESETS.find((item) => item.name === name)!
    const swimMeters = distanceToMeters(selected.swim.distance, selected.swim.unit)
    const bikeMeters = distanceToMeters(selected.bike.distance, selected.bike.unit)
    const runMeters = distanceToMeters(selected.run.distance, selected.run.unit)
    setPreset(selected.name)
    setSwimDistance({ raw: String(selected.swim.distance), unit: selected.swim.unit, meters: swimMeters })
    setBikeDistance({ raw: String(selected.bike.distance), unit: selected.bike.unit, meters: bikeMeters })
    setRunDistance({ raw: String(selected.run.distance), unit: selected.run.unit, meters: runMeters })
    setSwim((current) => refreshSwim(current, swimMeters))
    setBike((current) => refreshBike(current, bikeMeters))
    setRun((current) => refreshRun(current, runMeters))
  }

  function changeDistanceUnit<U extends SwimDistanceUnit | BikeRunDistanceUnit>(
    state: DistanceState<U>, unit: U, setState: (state: DistanceState<U>) => void,
    refresh: (meters: number | null) => void,
  ) {
    const next = { raw: state.meters === null ? state.raw : numericText(metersToDistance(state.meters, unit)), unit, meters: state.meters }
    setPreset("Custom")
    setState(next)
    refresh(next.meters)
  }

  function normalizeTime(value: string, setter: (value: string) => void, allowZero = false) {
    const seconds = parseDuration(value)
    if (seconds !== null && (allowZero || seconds > 0)) setter(formatDuration(seconds, false))
  }

  function changeSwimPaceUnit(unit: SwimPaceUnit) {
    setSwim((current) => {
      const seconds = parseDuration(current.pace)
      const converted = seconds !== null && seconds > 0
        ? formatDuration(secondsPerMeterToSwimPace(swimPaceToSecondsPerMeter(seconds, current.unit), unit), false) : current.pace
      return refreshSwim({ ...current, unit, pace: converted }, swimDistance.meters)
    })
  }

  function changeBikeSpeedUnit(unit: BikeSpeedUnit) {
    setBike((current) => {
      const speed = validPositive(current.pace)
      const converted = speed === null ? current.pace : metersPerSecondToSpeed(speedToMetersPerSecond(speed, current.unit), unit).toFixed(1)
      return refreshBike({ ...current, unit, pace: converted }, bikeDistance.meters)
    })
  }

  function changeRunPaceUnit(unit: RunPaceUnit) {
    setRun((current) => {
      const seconds = parseDuration(current.pace)
      const converted = seconds !== null && seconds > 0
        ? formatDuration(secondsPerMeterToRunPace(runPaceToSecondsPerMeter(seconds, current.unit), unit), false) : current.pace
      return refreshRun({ ...current, unit, pace: converted }, runDistance.meters)
    })
  }

  const result = useMemo(() => calculateRacePlan(
    parseDuration(swim.time), parseDuration(t1), parseDuration(bike.time), parseDuration(t2), parseDuration(run.time),
  ), [swim.time, t1, bike.time, t2, run.time])

  const summary = [
    { name: "Swim", seconds: result.swimSeconds, detail: `${swimDistance.raw || "—"} ${swimDistance.unit} · ${swim.pace || "—"} /${swim.unit}` },
    { name: "T1", seconds: result.t1Seconds, detail: "Transition" },
    { name: "Bike", seconds: result.bikeSeconds, detail: `${bikeDistance.raw || "—"} ${bikeDistance.unit} · ${bike.pace || "—"} ${bike.unit}` },
    { name: "T2", seconds: result.t2Seconds, detail: "Transition" },
    { name: "Run", seconds: result.runSeconds, detail: `${runDistance.raw || "—"} ${runDistance.unit} · ${run.pace || "—"} ${run.unit}` },
  ]

  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="mb-8 max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Race Calculator</h1>
        <p className="text-base leading-7 text-muted-foreground">Experiment with split times and paces</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
        <section className="space-y-6" aria-label="Race inputs">
          <Card className="[--card-spacing:--spacing(4)]">
            <CardHeader className="flex flex-row flex-wrap items-center gap-3 border-b">
              <CardTitle>Race distance</CardTitle>
                <div role="group" aria-label="Race preset" className="ml-auto flex flex-wrap justify-end gap-1">
                  {[...RACE_PRESETS.map((item) => item.name), "Custom" as const].map((name) => (
                    <Button
                      key={name}
                      type="button"
                      size="xs"
                      variant={preset === name ? "secondary" : "ghost"}
                      aria-pressed={preset === name}
                      onClick={() => selectPreset(name)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <InputField label="Swim distance" value={swimDistance.raw} onChange={updateSwimDistance} />
                  <SelectField compact label="Swim distance unit" value={swimDistance.unit} onChange={(value) => changeDistanceUnit(swimDistance, value as SwimDistanceUnit, setSwimDistance, (meters) => setSwim((current) => refreshSwim(current, meters)))}>
                    <option value="yd">yd</option><option value="m">m</option><option value="mi">mi</option>
                  </SelectField>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <InputField label="Bike distance" value={bikeDistance.raw} onChange={updateBikeDistance} />
                  <SelectField compact label="Bike distance unit" value={bikeDistance.unit} onChange={(value) => changeDistanceUnit(bikeDistance, value as BikeRunDistanceUnit, setBikeDistance, (meters) => setBike((current) => refreshBike(current, meters)))}>
                    <option value="km">km</option><option value="mi">mi</option>
                  </SelectField>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <InputField label="Run distance" value={runDistance.raw} onChange={updateRunDistance} />
                  <SelectField compact label="Run distance unit" value={runDistance.unit} onChange={(value) => changeDistanceUnit(runDistance, value as BikeRunDistanceUnit, setRunDistance, (meters) => setRun((current) => refreshRun(current, meters)))}>
                    <option value="km">km</option><option value="mi">mi</option>
                  </SelectField>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="[--card-spacing:--spacing(4)]">
            <CardHeader className="border-b"><CardTitle>Race targets</CardTitle></CardHeader>
            <CardContent className="grid gap-0 p-0 sm:grid-cols-2">
              <TargetGroup title="Swim" icon={<Waves />}>
                <InputField label="Swim time" value={swim.time} placeholder="HH:MM:SS" inputMode="numeric" onChange={(time) => setSwim(refreshSwim({ ...swim, time, source: "time" }, swimDistance.meters))} onBlur={() => { const seconds = parseDuration(swim.time); if (seconds !== null && seconds > 0) setSwim((current) => refreshSwim({ ...current, time: formatDuration(seconds), source: "time" }, swimDistance.meters)) }} />
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <InputField label="Swim pace" value={swim.pace} placeholder="MM:SS" inputMode="numeric" onChange={(pace) => setSwim(refreshSwim({ ...swim, pace, source: "pace" }, swimDistance.meters))} onBlur={() => { const seconds = parseDuration(swim.pace); if (seconds !== null && seconds > 0) setSwim((current) => refreshSwim({ ...current, pace: formatDuration(seconds, false), source: "pace" }, swimDistance.meters)) }} />
                <SelectField compact label="Swim pace unit" value={swim.unit} onChange={(value) => changeSwimPaceUnit(value as SwimPaceUnit)}>
                  <option value="50yd">/50 yd</option><option value="50m">/50 m</option><option value="100yd">/100 yd</option><option value="100m">/100 m</option>
                  </SelectField>
                </div>
              </TargetGroup>
              <TargetGroup title="Bike" icon={<Bike />}>
                <InputField label="Bike time" value={bike.time} placeholder="HH:MM:SS" inputMode="numeric" onChange={(time) => setBike(refreshBike({ ...bike, time, source: "time" }, bikeDistance.meters))} onBlur={() => { const seconds = parseDuration(bike.time); if (seconds !== null && seconds > 0) setBike((current) => refreshBike({ ...current, time: formatDuration(seconds), source: "time" }, bikeDistance.meters)) }} />
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <InputField label="Bike speed" value={bike.pace} placeholder="0.0" onChange={(pace) => setBike(refreshBike({ ...bike, pace, source: "pace" }, bikeDistance.meters))} onBlur={() => { const speed = validPositive(bike.pace); if (speed !== null) setBike((current) => refreshBike({ ...current, pace: speed.toFixed(1), source: "pace" }, bikeDistance.meters)) }} />
                <SelectField compact label="Bike speed unit" value={bike.unit} onChange={(value) => changeBikeSpeedUnit(value as BikeSpeedUnit)}><option>km/h</option><option>mph</option></SelectField>
                </div>
              </TargetGroup>
              <TargetGroup title="Run" icon={<Footprints />}>
                <InputField label="Run time" value={run.time} placeholder="HH:MM:SS" inputMode="numeric" onChange={(time) => setRun(refreshRun({ ...run, time, source: "time" }, runDistance.meters))} onBlur={() => { const seconds = parseDuration(run.time); if (seconds !== null && seconds > 0) setRun((current) => refreshRun({ ...current, time: formatDuration(seconds), source: "time" }, runDistance.meters)) }} />
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <InputField label="Run pace" value={run.pace} placeholder="MM:SS" inputMode="numeric" onChange={(pace) => setRun(refreshRun({ ...run, pace, source: "pace" }, runDistance.meters))} onBlur={() => { const seconds = parseDuration(run.pace); if (seconds !== null && seconds > 0) setRun((current) => refreshRun({ ...current, pace: formatDuration(seconds, false), source: "pace" }, runDistance.meters)) }} />
                <SelectField compact label="Run pace unit" value={run.unit} onChange={(value) => changeRunPaceUnit(value as RunPaceUnit)}><option>min/km</option><option>min/mi</option></SelectField>
                </div>
              </TargetGroup>
              <TargetGroup title="Transitions" icon={<Timer />}>
                <InputField label="T1 time" value={t1} inputMode="numeric" onChange={setT1} onBlur={() => normalizeTime(t1, setT1, true)} />
                <InputField label="T2 time" value={t2} inputMode="numeric" onChange={setT2} onBlur={() => normalizeTime(t2, setT2, true)} />
              </TargetGroup>
            </CardContent>
          </Card>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Race prediction">
          <Card className="bg-primary text-primary-foreground [--card-spacing:--spacing(4)]">
            <CardHeader>
              <p className="text-sm text-primary-foreground/70">Finish Time</p>
              <output aria-label="Total race time" className="font-mono text-4xl font-semibold tracking-tight sm:text-5xl">{result.totalSeconds === null ? "—:—:—" : formatDuration(result.totalSeconds)}</output>
              {result.missingDisciplines.length > 0 && <p className="pt-1 text-sm text-primary-foreground/75">Add a valid {result.missingDisciplines.join(", ")} target to complete your prediction.</p>}
            </CardHeader>
            <CardContent className="gap-2">
              {summary.map((split) => (
                <div key={split.name} className="grid grid-cols-[1fr_auto] gap-x-4 rounded-lg bg-primary-foreground/10 px-3 py-2.5">
                  <span className="font-medium">{split.name}</span>
                  <span className="font-mono font-medium">{split.seconds === null ? "—" : formatDuration(split.seconds)}</span>
                  <span className="col-span-2 text-xs text-primary-foreground/65">{split.detail}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

function TargetGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b p-5 last:border-b-0 even:sm:border-l sm:[&:nth-last-child(-n+2)]:border-b-0">
      <h3 className="flex items-center gap-2 font-medium"><span className="text-primary [&_svg]:size-4">{icon}</span>{title}</h3>
      {children}
    </section>
  )
}
