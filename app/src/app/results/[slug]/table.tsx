"use client";

import { Button, Card, SearchSelect, Badge, SearchSelectItem } from "@tremor/react";

import { MultiSelect as FastMultiSelect, MultiSelectItem as FastMultiSelectItem } from "@/components/FastMultiSelect";

import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@tremor/react';
import { IronmanData } from "./types";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import AgeGroupMultiSelect from "./AgeGroupMultiSelect";
import { useState } from "react";
import { EMOJIS, SupportedCountryCode } from "./emojis";


export default function ResultsTable({ data }: { data: IronmanData[] }) {
  const [page, setPage] = useState(0);
  const [rankBy, setRankBy] = useState<string | undefined>("gender");
  const [ageGroups, setAgeGroups] = useState<string[]>(["overall"]);
  const [searched, setSearched] = useState<string[]>([]);

  const perPage = 10;

  // Maybe useMemo?
  let filtered = data.filter((r: any) => {
    if (ageGroups.includes("overall")) return true;
    else if (ageGroups.includes("m-overall") && r.AgeGroup.startsWith("M")) return true;
    else if (ageGroups.includes("f-overall") && r.AgeGroup.startsWith("F")) return true;
    else return ageGroups.includes(r.AgeGroup);
  });

  if (searched.length > 0) {
    filtered = filtered.filter((r: any) => {
      return searched.includes(r.ResultId);
    });
  }

  const maxPage = Math.floor(filtered.length / perPage);

  const rows = filtered.slice(page*perPage, page*perPage + perPage).map((row) => {
    const status = <Badge size="xs">{row.EventStatus}</Badge>;

    const finishBadge = <Badge size="xs">{{
      overall: row.FinishRankOverall,
      group: row.FinishRankGroup,
      gender: row.FinishRankGender,
    }[rankBy || "gender"]}</Badge>
    const swimBadge = <Badge size="xs">{{
      overall: row.SwimRankOverall,
      group: row.SwimRankGroup,
      gender: row.SwimRankGender,
    }[rankBy || "gender"]}</Badge>;
    const bikeBadge = <Badge size="xs">{{
      overall: row.BikeRankOverall,
      group: row.BikeRankGroup,
      gender: row.BikeRankGender,
    }[rankBy || "gender"]}</Badge>
    const runBadge = <Badge size="xs">{{
      overall: row.RunRankOverall,
      group: row.RunRankGroup,
      gender: row.RunRankGender,
    }[rankBy || "gender"]}</Badge>;

    const key = row.ResultId;

    return (
      <TableRow key={key}>
        <TableCell>{row.Contact.FullName || "?"} {EMOJIS[row.CountryISO2 as SupportedCountryCode] || `(${row.CountryISO2})`}</TableCell>
        <TableCell>{row.AgeGroup}</TableCell>
        <TableCell>{row.EventStatus === "Finish" ? <>{row.FinishTimeConverted} {finishBadge}</> : status}</TableCell>
        <TableCell>{row.SwimTimeConverted} {swimBadge}</TableCell>
        <TableCell>{row.BikeTimeConverted} {bikeBadge}</TableCell>
        <TableCell>{row.RunTimeConverted} {runBadge}</TableCell>
        <TableCell>{row.Transition1TimeConverted}</TableCell>
        <TableCell>{row.Transition2TimeConverted}</TableCell>
      </TableRow>
    );
  });

  const names = data.filter((row) => row.Contact?.FullName !== undefined).map((row) => {
    const key = row.ResultId;
    return (
      <FastMultiSelectItem
        key={key}
        value={key}
      >
        {row.Contact.FullName} ({row.AgeGroup}) {EMOJIS[row.CountryISO2 as SupportedCountryCode] || `(${row.CountryISO2})`}
      </FastMultiSelectItem>
    );
  });

  const nextPage = () => {
    setPage(Math.min(page + 1, maxPage));
  }

  const prevPage = () => {
    setPage(Math.max(page - 1, 0));
  }

  return (
    <Card className="mt-6">
      <div className="flex gap-3 flex-col sm:flex-row">
        <FastMultiSelect
          className=""
          placeholder="Search Athlete(s)"
          icon={MagnifyingGlassIcon}
          value={searched}
          onValueChange={setSearched}
          limitRenderedOptions={100}
        >
          {names}
        </FastMultiSelect>
        <AgeGroupMultiSelect className="sm:max-w-[240px]" selected={ageGroups} onChange={setAgeGroups}/>
        <SearchSelect
          className="sm:max-w-[240px]"
          placeholder="Rank Splits By"
          defaultValue="gender"
          icon={ArrowDownIcon}
          value={rankBy}
          onValueChange={setRankBy}
        >
          <SearchSelectItem value="gender">Rank by Gender</SearchSelectItem>
          <SearchSelectItem value="overall">Rank Overall</SearchSelectItem>
          <SearchSelectItem value="group">Rank by Age Group</SearchSelectItem>
        </SearchSelect>
      </div>
      <Table className="mt-3">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="max-w-[200px]">Name</TableHeaderCell>
            <TableHeaderCell>Age Group</TableHeaderCell>
            <TableHeaderCell>Finish</TableHeaderCell>
            <TableHeaderCell>Swim</TableHeaderCell>
            <TableHeaderCell>Bike</TableHeaderCell>
            <TableHeaderCell>Run</TableHeaderCell>
            <TableHeaderCell>T1</TableHeaderCell>
            <TableHeaderCell>T2</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-3 gap-3">
        <Button variant="secondary" icon={ArrowLeftIcon} onClick={prevPage} disabled={page === 0}>Previous</Button>
        <Button icon={ArrowRightIcon} iconPosition="right" onClick={nextPage} disabled={page === maxPage}>Next</Button>
      </div>
    </Card>
  );
}
